-- «+ Agregar espacio» (24 oct 2026, rama agregar-espacio). SOLO ESCRITA Y PROBADA EN UN POSTGRES LOCAL (scripts/espacios/probar-sql.sh).
-- No se aplicó en ningún proyecto real de Supabase: necesita la revisión del dueño del servidor antes de aplicarla.
-- Qué hace:
--   1. Cada espacio de lk_actas.cuartos (JSON) tiene un "id" fijo. Los datos viejos sin id lo reciben por posición (sala, cocina, dormitorio, bano).
--   2. lk_fotos gana cuarto_id (el id del espacio) y quitada_en (espacio quitado: la foto NO se borra, conserva su sha256 como respaldo).
--   3. La salida copia los espacios de la entrada (mismos id, nombres y puntos; sin estado ni notas).
--   4. RPC nuevas, con las reglas validadas en el servidor: lk_agregar_cuarto, lk_renombrar_cuarto y lk_quitar_cuarto.
-- Compatible: lk_editar_item y lk_registrar_foto mantienen su firma (índice del espacio); la foto guarda además el cuarto_id.

-- ───────── 1. Espacios con id ─────────
create or replace function public.lk_acta_vacia() returns jsonb language sql immutable as $$
  select '[{"id":"sala","nombre":"Sala","nota":"","items":[{"texto":"Paredes y pintura","estado":null},{"texto":"Piso","estado":null},{"texto":"Ventanas y cortinas","estado":null}]},
           {"id":"cocina","nombre":"Cocina","nota":"","items":[{"texto":"Cocina y horno","estado":null},{"texto":"Fregadero y grifería","estado":null},{"texto":"Muebles","estado":null}]},
           {"id":"dormitorio","nombre":"Dormitorio","nota":"","items":[{"texto":"Paredes y pintura","estado":null},{"texto":"Clóset","estado":null},{"texto":"Puerta y llavín","estado":null}]},
           {"id":"bano","nombre":"Baño","nota":"","items":[{"texto":"Ducha","estado":null},{"texto":"Inodoro y lavamanos","estado":null},{"texto":"Azulejos","estado":null}]}]'::jsonb
$$;

update public.lk_actas a set cuartos = (
  select jsonb_agg(case when c.cuarto ? 'id' then c.cuarto
                        else c.cuarto || jsonb_build_object('id', coalesce((array['sala','cocina','dormitorio','bano'])[c.ord], 'espacio-' || c.ord)) end order by c.ord)
    from jsonb_array_elements(a.cuartos) with ordinality as c(cuarto, ord))
 where exists (select 1 from jsonb_array_elements(a.cuartos) x where not x ? 'id');

-- ───────── 2. Fotos por id de espacio ─────────
alter table public.lk_fotos add column if not exists cuarto_id text check (cuarto_id is null or char_length(cuarto_id) between 1 and 64);
alter table public.lk_fotos add column if not exists quitada_en timestamptz;
update public.lk_fotos f set cuarto_id = a.cuartos -> f.cuarto ->> 'id'
  from public.lk_actas a
 where f.cuarto_id is null and f.cuarto is not null and f.etapa in ('entrada','salida') and a.contrato_id = f.contrato_id and a.etapa = f.etapa;
create index if not exists lk_fotos_cuarto_id on public.lk_fotos(contrato_id, etapa, cuarto_id);

-- ───────── Utilidades ─────────
/** Para comparar nombres: sin mayúsculas, sin tildes y sin espacios sobrantes («Baño» = «bano»). */
create or replace function public.lk_clave(t text) returns text language sql immutable as $$
  select translate(lower(regexp_replace(trim(coalesce(t, '')), '\s+', ' ', 'g')), 'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc')
$$;
/** Nombre limpio y validado (2 a 30 caracteres, sin saltos de línea, caracteres de control ni emojis). */
create or replace function public.lk_nombre_espacio(t text) returns text language plpgsql immutable as $$
declare n text := regexp_replace(trim(coalesce(t, '')), '\s+', ' ', 'g');
begin
  if n = '' then raise exception 'Escribe un nombre.' using errcode = '22023'; end if;
  if coalesce(t, '') ~ '[[:cntrl:]]' or n ~ '[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u200D]' then raise exception 'Usa solo letras, números y signos comunes.' using errcode = '22023'; end if;
  if char_length(n) > 30 then raise exception 'Máximo 30 letras.' using errcode = '22023'; end if;
  if char_length(n) < 2 then raise exception 'Escribe al menos 2 letras.' using errcode = '22023'; end if;
  return n;
end $$;
/** Bloquea el contrato y exige que la lista de espacios de la entrada todavía se pueda cambiar. Devuelve el rol. */
create or replace function public.lk_exigir_lista_abierta(p_contrato uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato); e text;
begin
  select estado into e from public.lk_contratos where id = p_contrato for update;
  if e not in ('firmas','pendiente_pago','fotos_entrada')
     or (select count(*) from public.lk_firmas where contrato_id = p_contrato and etapa = 'entrada') >= 2 then
    raise exception 'La lista de espacios quedó fija cuando los dos confirmaron las fotos de entrada.' using errcode = '55000'; end if;
  return r;
end $$;

-- ───────── 3. Acta completa, fotos y salida, por id ─────────
create or replace function public.lk_acta_completa(p_contrato uuid, p_etapa text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select bool_and(
             exists (select 1 from public.lk_fotos f where f.contrato_id = p_contrato and f.etapa = p_etapa and f.quitada_en is null
                        and (f.cuarto_id = c.cuarto->>'id' or (f.cuarto_id is null and f.cuarto = (c.ord - 1)::int)))
             and not exists (select 1 from jsonb_array_elements(c.cuarto->'items') i where i->>'estado' is null))
      from public.lk_actas a, jsonb_array_elements(a.cuartos) with ordinality as c(cuarto, ord)
     where a.contrato_id = p_contrato and a.etapa = p_etapa), false)
$$;

create or replace function public.lk_registrar_foto(p_contrato uuid, p_etapa text, p_cuarto int, p_ruta text, p_sha256 text,
  p_tomada_en timestamptz, p_fecha_archivo timestamptz, p_origen text, p_posible_galeria boolean, p_sha256_original text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato); e text; v_id uuid; v_cuarto_id text;
begin
  select estado into e from public.lk_contratos where id = p_contrato;
  if not ((p_etapa = 'entrada' and e = 'fotos_entrada') or (p_etapa = 'salida' and e = 'salida') or (p_etapa = 'reclamo' and e = 'ventana_reclamo' and r = 'dueno')) then
    raise exception 'Ahora no se pueden agregar fotos en este paso.' using errcode = '55000'; end if;
  if split_part(p_ruta, '/', 1) <> p_contrato::text or split_part(p_ruta, '/', 2) <> p_etapa then
    raise exception 'Ruta de foto no válida.' using errcode = '22023'; end if;
  if p_etapa <> 'reclamo' then
    select cuartos -> p_cuarto ->> 'id' into v_cuarto_id from public.lk_actas where contrato_id = p_contrato and etapa = p_etapa;
    if v_cuarto_id is null then raise exception 'Ese espacio ya no está en la lista.' using errcode = '22023'; end if;
  end if;
  insert into public.lk_fotos(contrato_id, etapa, cuarto, cuarto_id, por_rol, ruta, sha256, sha256_original, tomada_en, fecha_archivo, origen, posible_galeria)
  values (p_contrato, p_etapa, p_cuarto, v_cuarto_id, r, p_ruta, lower(p_sha256), lower(p_sha256_original), p_tomada_en, p_fecha_archivo, p_origen, coalesce(p_posible_galeria, false))
  returning id into v_id;
  if p_etapa <> 'reclamo' then delete from public.lk_firmas where contrato_id = p_contrato and etapa = p_etapa; end if;
  return v_id;
end $$;

create or replace function public.lk_iniciar_salida(p_contrato uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato);
begin
  update public.lk_contratos set estado = 'salida' where id = p_contrato and estado = 'en_curso';
  if not found then raise exception 'Este paso ya no está abierto.' using errcode = '55000'; end if;
  -- La salida copia los espacios de la entrada: mismos id, nombres y puntos; sin estado ni notas.
  insert into public.lk_actas(contrato_id, etapa, cuartos)
  select p_contrato, 'salida', coalesce(jsonb_agg(
           (c.cuarto - 'items' - 'nota') || jsonb_build_object('nota', '', 'items',
             coalesce((select jsonb_agg(jsonb_build_object('texto', i->>'texto', 'estado', null) order by k) from jsonb_array_elements(c.cuarto->'items') with ordinality as t(i, k)), '[]'::jsonb))
           order by c.ord), public.lk_acta_vacia())
    from public.lk_actas a, jsonb_array_elements(a.cuartos) with ordinality as c(cuarto, ord)
   where a.contrato_id = p_contrato and a.etapa = 'entrada'
  on conflict do nothing;
  perform public.lk_evento(p_contrato, 'Empezaron las fotos de salida');
end $$;

-- ───────── 4. RPC de espacios ─────────
create or replace function public.lk_agregar_cuarto(p_contrato uuid, p_nombre text, p_items text[] default '{}') returns text
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_lista_abierta(p_contrato); n text := public.lk_nombre_espacio(p_nombre); v_cuartos jsonb; v_id text := gen_random_uuid()::text; v_items jsonb;
begin
  select cuartos into v_cuartos from public.lk_actas where contrato_id = p_contrato and etapa = 'entrada' for update;
  if jsonb_array_length(v_cuartos) >= 12 then raise exception 'Llegaste al máximo de 12 espacios.' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(v_cuartos) c where public.lk_clave(c->>'nombre') = public.lk_clave(n)) then
    raise exception 'Ya hay un espacio con ese nombre.' using errcode = '23505'; end if;
  if coalesce(array_length(p_items, 1), 0) > 8 then raise exception 'Máximo 8 puntos por espacio.' using errcode = '22023'; end if;
  if exists (select 1 from unnest(coalesce(p_items, '{}')) x where char_length(trim(x)) > 60 or x ~ '[[:cntrl:]]') then
    raise exception 'Cada punto de la lista tiene máximo 60 letras.' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('texto', t, 'estado', null) order by k), '[]'::jsonb) into v_items
    from (select distinct on (public.lk_clave(x)) regexp_replace(trim(x), '\s+', ' ', 'g') t, k from unnest(coalesce(p_items, '{}')) with ordinality as u(x, k) where trim(x) <> '' order by public.lk_clave(x), k) s;
  update public.lk_actas set cuartos = cuartos || jsonb_build_array(jsonb_build_object('id', v_id, 'nombre', n, 'propio', true, 'agregado_por', r, 'nota', '', 'items', v_items)),
         actualizado_en = now()
   where contrato_id = p_contrato and etapa = 'entrada';
  delete from public.lk_firmas where contrato_id = p_contrato and etapa = 'entrada';   -- si cambia la lista, los dos vuelven a confirmar
  perform public.lk_evento(p_contrato, format('Se agregó el espacio %s', n));
  return v_id;
end $$;

create or replace function public.lk_renombrar_cuarto(p_contrato uuid, p_id text, p_nombre text) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_lista_abierta(p_contrato); n text := public.lk_nombre_espacio(p_nombre); v_cuartos jsonb; v_pos int; v_antes text;
begin
  select cuartos into v_cuartos from public.lk_actas where contrato_id = p_contrato and etapa = 'entrada' for update;
  select (c.ord - 1)::int, c.cuarto->>'nombre' into v_pos, v_antes from jsonb_array_elements(v_cuartos) with ordinality as c(cuarto, ord) where c.cuarto->>'id' = p_id;
  if v_pos is null then raise exception 'Ese espacio ya no está en la lista.' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(v_cuartos) c where c->>'id' <> p_id and public.lk_clave(c->>'nombre') = public.lk_clave(n)) then
    raise exception 'Ya hay un espacio con ese nombre.' using errcode = '23505'; end if;
  if v_antes = n then return; end if;
  update public.lk_actas set cuartos = jsonb_set(cuartos, array[v_pos::text, 'nombre'], to_jsonb(n)), actualizado_en = now()
   where contrato_id = p_contrato and etapa = 'entrada';
  delete from public.lk_firmas where contrato_id = p_contrato and etapa = 'entrada';
  perform public.lk_evento(p_contrato, format('Se cambió el nombre del espacio %s a %s', v_antes, n));
end $$;

/** Quita un espacio de la entrada. Sus fotos NO se borran: se marcan con quitada_en y conservan su sha256 (respaldo en el historial). */
create or replace function public.lk_quitar_cuarto(p_contrato uuid, p_id text) returns int
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_lista_abierta(p_contrato); v_cuartos jsonb; v_pos int; v_nombre text; v_n int;
begin
  select cuartos into v_cuartos from public.lk_actas where contrato_id = p_contrato and etapa = 'entrada' for update;
  select (c.ord - 1)::int, c.cuarto->>'nombre' into v_pos, v_nombre from jsonb_array_elements(v_cuartos) with ordinality as c(cuarto, ord) where c.cuarto->>'id' = p_id;
  if v_pos is null then raise exception 'Ese espacio ya no está en la lista.' using errcode = '22023'; end if;
  if jsonb_array_length(v_cuartos) <= 1 then raise exception 'Tiene que quedar al menos 1 espacio.' using errcode = '22023'; end if;
  update public.lk_actas set cuartos = cuartos - v_pos, actualizado_en = now() where contrato_id = p_contrato and etapa = 'entrada';
  -- Los índices viejos (columna cuarto) de las fotos que siguen se corren: cuarto_id es el que manda.
  update public.lk_fotos set quitada_en = now() where contrato_id = p_contrato and etapa = 'entrada' and cuarto_id = p_id and quitada_en is null;
  get diagnostics v_n = row_count;
  update public.lk_fotos set cuarto = cuarto - 1 where contrato_id = p_contrato and etapa = 'entrada' and quitada_en is null and cuarto > v_pos;
  delete from public.lk_firmas where contrato_id = p_contrato and etapa = 'entrada';
  perform public.lk_evento(p_contrato, case when v_n > 0 then format('Se quitó el espacio %s; sus %s fotos quedan como respaldo en el historial', v_nombre, v_n)
                                            else format('Se quitó el espacio %s', v_nombre) end);
  return v_n;
end $$;

-- ───────── Permisos de las funciones nuevas (igual que las demás lk_*) ─────────
do $$ declare f text; begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'lk\_%' loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
