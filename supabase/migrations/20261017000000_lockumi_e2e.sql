-- Lockumi · servidor compartido para la prueba de punta a punta en testnet.
-- Prefijo lk_ para no tocar las tablas de la lista de espera de lockumi.com (waitlist*).
-- Modelo de seguridad:
--   * Cada aparato inicia sesión anónima de Supabase (auth.uid()). La sesión se vincula al contrato al crearlo
--     (dueño) o al aceptar la invitación (inquilino). El email de Cavos y la dirección G… se guardan como datos
--     declarados (en la demo no se verifican del lado del servidor; ver "Pendiente" en docs/testnet-e2e.md).
--   * Las tablas solo se LEEN directo (RLS: participantes del contrato y mediadores). Todas las ESCRITURAS pasan por
--     funciones security definer que derivan el rol desde auth.uid(): nadie puede firmar ni actuar por la otra persona.
-- Idempotente: se puede volver a aplicar.

create table if not exists public.lk_contratos (
  id uuid primary key default gen_random_uuid(),
  creado_por uuid not null,
  direccion text not null check (char_length(direccion) between 4 and 120),
  monto numeric(12,2) not null check (monto > 0 and monto <= 50000),
  moneda text not null default 'USDC' check (moneda = 'USDC'),
  inicio date not null,
  fin date not null,
  reglas text[] not null default '{}',
  email_inquilino text not null check (email_inquilino ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  estado text not null default 'firmas' check (estado in ('firmas','pendiente_pago','fotos_entrada','en_curso','salida','ventana_reclamo','reclamo','mediacion','cerrado')),
  invitacion_hash text,                       -- sha256 hex del token del link; null cuando ya se usó
  invitacion_expira timestamptz,
  ventana_segundos int not null default 604800 check (ventana_segundos between 60 and 604800),
  ventana_inicio timestamptz,
  escrow_contract_id text check (escrow_contract_id is null or escrow_contract_id ~ '^C[A-Z2-7]{55}$'),
  escrow_tipo text not null default 'single-release' check (escrow_tipo in ('single-release','multi-release')),
  resultado jsonb,                            -- {via, dueno, inquilino}
  liquidacion_tx text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (fin > inicio and fin >= inicio + interval '1 month' and fin <= inicio + interval '5 years')
);

create table if not exists public.lk_participantes (
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  rol text not null check (rol in ('dueno','inquilino')),
  usuario uuid not null,
  email_cavos text not null check (email_cavos ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  direccion_stellar text check (direccion_stellar is null or direccion_stellar ~ '^G[A-Z2-7]{55}$'),
  unido_en timestamptz not null default now(),
  primary key (contrato_id, rol),
  unique (contrato_id, usuario)
);

create table if not exists public.lk_mediadores (usuario uuid primary key, nombre text not null);

create table if not exists public.lk_actas (
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  etapa text not null check (etapa in ('entrada','salida')),
  cuartos jsonb not null,                     -- [{nombre, nota, items:[{texto, estado}]}]
  actualizado_en timestamptz not null default now(),
  primary key (contrato_id, etapa)
);

create table if not exists public.lk_firmas (
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  etapa text not null check (etapa in ('contrato','entrada','salida')),
  rol text not null check (rol in ('dueno','inquilino')),
  usuario uuid not null,
  firmado_en timestamptz not null default now(),
  primary key (contrato_id, etapa, rol)
);

create table if not exists public.lk_fotos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  etapa text not null check (etapa in ('entrada','salida','reclamo')),
  cuarto int check (cuarto is null or cuarto between 0 and 20),
  por_rol text not null check (por_rol in ('dueno','inquilino')),
  ruta text not null unique,                  -- objeto en el bucket lk-fotos: <contrato_id>/<etapa>/<uuid>.jpg
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),                 -- huella del archivo guardado en Storage (verificable)
  sha256_original text check (sha256_original is null or sha256_original ~ '^[0-9a-f]{64}$'),  -- huella del archivo original del aparato
  tomada_en timestamptz not null,             -- Date.now() del aparato al tomar o elegir la foto
  fecha_archivo timestamptz,                  -- fecha EXIF, si la trae
  origen text not null check (origen in ('camara','archivo')),
  posible_galeria boolean not null default false,
  subido_en timestamptz not null default now()
);
alter table public.lk_fotos add column if not exists sha256_original text;
create index if not exists lk_fotos_contrato on public.lk_fotos(contrato_id, etapa, cuarto);

create table if not exists public.lk_reclamos (
  contrato_id uuid primary key references public.lk_contratos(id) on delete cascade,
  monto numeric(12,2) not null check (monto > 0),
  motivo text not null check (char_length(motivo) between 10 and 1000),
  creado_en timestamptz not null default now(),
  respuesta text check (respuesta in ('aceptado','rechazado')),
  respondido_en timestamptz
);

create table if not exists public.lk_eventos (
  id bigint generated always as identity primary key,
  contrato_id uuid not null references public.lk_contratos(id) on delete cascade,
  texto text not null,
  tx_hash text,                               -- hash de la transacción de Stellar, si hubo
  creado_en timestamptz not null default now()
);
create index if not exists lk_eventos_contrato on public.lk_eventos(contrato_id, id);

-- ───────── Utilidades ─────────
create or replace function public.lk_acta_vacia() returns jsonb language sql immutable as $$
  select '[{"nombre":"Sala","nota":"","items":[{"texto":"Paredes y pintura","estado":null},{"texto":"Piso","estado":null},{"texto":"Ventanas y cortinas","estado":null}]},
           {"nombre":"Cocina","nota":"","items":[{"texto":"Cocina y horno","estado":null},{"texto":"Fregadero y grifería","estado":null},{"texto":"Muebles","estado":null}]},
           {"nombre":"Dormitorio","nota":"","items":[{"texto":"Paredes y pintura","estado":null},{"texto":"Clóset","estado":null},{"texto":"Puerta y llavín","estado":null}]},
           {"nombre":"Baño","nota":"","items":[{"texto":"Ducha","estado":null},{"texto":"Inodoro y lavamanos","estado":null},{"texto":"Azulejos","estado":null}]}]'::jsonb
$$;

create or replace function public.lk_uuid(t text) returns uuid language plpgsql immutable as $$
begin return t::uuid; exception when others then return null; end $$;

create or replace function public.lk_rol(p_contrato uuid) returns text
language sql stable security definer set search_path = public as $$
  select rol from public.lk_participantes where contrato_id = p_contrato and usuario = auth.uid()
$$;
create or replace function public.lk_es_mediador() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lk_mediadores where usuario = auth.uid())
$$;
create or replace function public.lk_puede_ver(p_contrato uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.lk_rol(p_contrato) is not null
      or (public.lk_es_mediador() and exists (select 1 from public.lk_reclamos where contrato_id = p_contrato and respuesta = 'rechazado'))
$$;

create or replace function public.lk_evento(p_contrato uuid, p_texto text, p_tx text default null) returns void
language sql security definer set search_path = public as $$
  insert into public.lk_eventos(contrato_id, texto, tx_hash) values (p_contrato, p_texto, p_tx);
  update public.lk_contratos set actualizado_en = now() where id = p_contrato;
$$;

create or replace function public.lk_exigir_rol(p_contrato uuid, p_rol text default null) returns text
language plpgsql stable security definer set search_path = public as $$
declare r text := public.lk_rol(p_contrato);
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  if r is null then raise exception 'No participas en este alquiler.' using errcode = '42501'; end if;
  if p_rol is not null and r <> p_rol then
    raise exception 'Este paso le corresponde al %.', case p_rol when 'dueno' then 'dueño' else p_rol end using errcode = '42501';
  end if;
  return r;
end $$;

create or replace function public.lk_acta_completa(p_contrato uuid, p_etapa text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select bool_and(
             exists (select 1 from public.lk_fotos f where f.contrato_id = p_contrato and f.etapa = p_etapa and f.cuarto = (c.ord - 1)::int)
             and not exists (select 1 from jsonb_array_elements(c.cuarto->'items') i where i->>'estado' is null))
      from public.lk_actas a, jsonb_array_elements(a.cuartos) with ordinality as c(cuarto, ord)
     where a.contrato_id = p_contrato and a.etapa = p_etapa), false)
$$;

-- ───────── Acciones (RPC) ─────────
create or replace function public.lk_crear_contrato(
  p_direccion text, p_monto numeric, p_inicio date, p_fin date, p_reglas text[], p_email_inquilino text,
  p_email_cavos text, p_direccion_stellar text default null, p_ventana_segundos int default 604800
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  -- "Hoy" es local del usuario: se acepta desde ayer en UTC para cubrir zonas hasta UTC-12; la app valida la fecha local exacta.
  if p_inicio < (now() at time zone 'utc')::date - 1 then raise exception 'La fecha de entrada no puede ser anterior a hoy. Elige hoy o una fecha futura.' using errcode = '22023'; end if;
  if p_inicio > (now() at time zone 'utc')::date + 366 then raise exception 'La entrada debe ser dentro del próximo año.' using errcode = '22023'; end if;
  if lower(trim(p_email_inquilino)) = lower(trim(p_email_cavos)) then raise exception 'Ese es tu correo. Escribe el de la otra persona.' using errcode = '22023'; end if;
  insert into public.lk_contratos(creado_por, direccion, monto, inicio, fin, reglas, email_inquilino, invitacion_hash, invitacion_expira, ventana_segundos)
  values (auth.uid(), trim(p_direccion), p_monto, p_inicio, p_fin, coalesce(p_reglas, '{}'), lower(trim(p_email_inquilino)),
          encode(sha256(convert_to(v_token, 'utf8')), 'hex'), now() + interval '14 days', p_ventana_segundos)
  returning id into v_id;
  insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos, direccion_stellar)
  values (v_id, 'dueno', auth.uid(), lower(trim(p_email_cavos)), p_direccion_stellar);
  insert into public.lk_actas(contrato_id, etapa, cuartos) values (v_id, 'entrada', public.lk_acta_vacia());
  perform public.lk_evento(v_id, 'Alquiler creado. Invitación lista para el inquilino');
  return jsonb_build_object('id', v_id, 'token', v_token);
end $$;

create or replace function public.lk_ver_invitacion(p_contrato uuid, p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato;
  if c.id is null or c.invitacion_hash is null or c.invitacion_hash <> encode(sha256(convert_to(p_token, 'utf8')), 'hex') or c.invitacion_expira < now() then
    raise exception 'Este link de invitación no es válido o ya se usó. Pide uno nuevo al dueño.' using errcode = '42501';
  end if;
  return jsonb_build_object('direccion', c.direccion, 'monto', c.monto, 'inicio', c.inicio, 'fin', c.fin, 'reglas', c.reglas,
    'email_inquilino', c.email_inquilino, 'email_dueno', (select email_cavos from public.lk_participantes where contrato_id = c.id and rol = 'dueno'));
end $$;

create or replace function public.lk_aceptar_invitacion(p_contrato uuid, p_token text, p_email_cavos text, p_direccion_stellar text default null) returns void
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  perform public.lk_ver_invitacion(p_contrato, p_token);
  select * into c from public.lk_contratos where id = p_contrato for update;
  if public.lk_rol(p_contrato) = 'dueno' then raise exception 'Eres el dueño de este alquiler. Comparte el link con el inquilino.' using errcode = '42501'; end if;
  if lower(trim(p_email_cavos)) <> c.email_inquilino then
    raise exception 'Esta invitación es para %. Entra con ese correo.', c.email_inquilino using errcode = '42501';
  end if;
  insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos, direccion_stellar)
  values (p_contrato, 'inquilino', auth.uid(), lower(trim(p_email_cavos)), p_direccion_stellar);
  update public.lk_contratos set invitacion_hash = null where id = p_contrato;   -- un solo uso
  perform public.lk_evento(p_contrato, 'El inquilino aceptó la invitación');
end $$;

create or replace function public.lk_nueva_invitacion(p_contrato uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'dueno'); v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if exists (select 1 from public.lk_participantes where contrato_id = p_contrato and rol = 'inquilino') then
    raise exception 'El inquilino ya aceptó la invitación.' using errcode = '55000'; end if;
  update public.lk_contratos set invitacion_hash = encode(sha256(convert_to(v_token, 'utf8')), 'hex'), invitacion_expira = now() + interval '14 days' where id = p_contrato;
  perform public.lk_evento(p_contrato, 'Se generó un link de invitación nuevo (el anterior ya no sirve)');
  return v_token;
end $$;

create or replace function public.lk_actualizar_direccion(p_contrato uuid, p_direccion_stellar text) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato);
begin
  if exists (select 1 from public.lk_contratos where id = p_contrato and escrow_contract_id is not null) then
    raise exception 'El depósito ya está creado: la cuenta no se puede cambiar.' using errcode = '55000'; end if;
  update public.lk_participantes set direccion_stellar = p_direccion_stellar where contrato_id = p_contrato and rol = r;
end $$;

create or replace function public.lk_firmar(p_contrato uuid, p_etapa text) returns text
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato); c public.lk_contratos; n int; v_estado text;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if not ((p_etapa = 'contrato' and c.estado = 'firmas') or (p_etapa = 'entrada' and c.estado = 'fotos_entrada') or (p_etapa = 'salida' and c.estado = 'salida')) then
    raise exception 'Este paso ya no está abierto.' using errcode = '55000'; end if;
  if p_etapa = 'contrato' and (select count(*) from public.lk_participantes where contrato_id = p_contrato) < 2 then
    raise exception 'El inquilino todavía no aceptó la invitación.' using errcode = '55000'; end if;
  if p_etapa <> 'contrato' and not public.lk_acta_completa(p_contrato, p_etapa) then
    raise exception 'Antes de confirmar, cada espacio necesita una foto y todo marcado.' using errcode = '55000'; end if;
  if exists (select 1 from public.lk_firmas where contrato_id = p_contrato and etapa = p_etapa and rol = r) then
    raise exception 'Ya firmaste.' using errcode = '55000'; end if;
  insert into public.lk_firmas(contrato_id, etapa, rol, usuario) values (p_contrato, p_etapa, r, auth.uid());
  perform public.lk_evento(p_contrato, format('%s: firmó el %s', case p_etapa when 'contrato' then 'Contrato' when 'entrada' then 'Fotos de entrada' else 'Fotos de salida' end, case r when 'dueno' then 'dueño' else 'inquilino' end));
  select count(*) into n from public.lk_firmas where contrato_id = p_contrato and etapa = p_etapa;
  v_estado := c.estado;
  if n = 2 then
    v_estado := case p_etapa when 'contrato' then 'pendiente_pago' when 'entrada' then 'en_curso' else 'ventana_reclamo' end;
    update public.lk_contratos set estado = v_estado, ventana_inicio = case when p_etapa = 'salida' then now() else ventana_inicio end where id = p_contrato;
    perform public.lk_evento(p_contrato, case p_etapa when 'contrato' then 'Contrato firmado por los dos' when 'entrada' then 'Fotos de entrada confirmadas por los dos'
                                          else 'Fotos de salida confirmadas. Empieza el plazo para reclamos' end);
  end if;
  return v_estado;
end $$;

create or replace function public.lk_editar_item(p_contrato uuid, p_etapa text, p_cuarto int, p_item int, p_estado text, p_nota text default null) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato); e text;
begin
  select estado into e from public.lk_contratos where id = p_contrato;
  if not ((p_etapa = 'entrada' and e = 'fotos_entrada') or (p_etapa = 'salida' and e = 'salida')) then raise exception 'Este paso ya no está abierto.' using errcode = '55000'; end if;
  if p_estado is not null and p_estado not in ('bien','detalle') then raise exception 'Estado no válido.' using errcode = '22023'; end if;
  update public.lk_actas set
    cuartos = case when p_item is null then jsonb_set(cuartos, array[p_cuarto::text, 'nota'], to_jsonb(coalesce(p_nota, '')))
                   else jsonb_set(cuartos, array[p_cuarto::text, 'items', p_item::text, 'estado'], to_jsonb(p_estado)) end,
    actualizado_en = now()
  where contrato_id = p_contrato and etapa = p_etapa;
  delete from public.lk_firmas where contrato_id = p_contrato and etapa = p_etapa;   -- si cambia el acta, los dos vuelven a confirmar
end $$;

drop function if exists public.lk_registrar_foto(uuid, text, int, text, text, timestamptz, timestamptz, text, boolean);
create or replace function public.lk_registrar_foto(p_contrato uuid, p_etapa text, p_cuarto int, p_ruta text, p_sha256 text,
  p_tomada_en timestamptz, p_fecha_archivo timestamptz, p_origen text, p_posible_galeria boolean, p_sha256_original text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato); e text; v_id uuid;
begin
  select estado into e from public.lk_contratos where id = p_contrato;
  if not ((p_etapa = 'entrada' and e = 'fotos_entrada') or (p_etapa = 'salida' and e = 'salida') or (p_etapa = 'reclamo' and e = 'ventana_reclamo' and r = 'dueno')) then
    raise exception 'Ahora no se pueden agregar fotos en este paso.' using errcode = '55000'; end if;
  if split_part(p_ruta, '/', 1) <> p_contrato::text or split_part(p_ruta, '/', 2) <> p_etapa then
    raise exception 'Ruta de foto no válida.' using errcode = '22023'; end if;
  insert into public.lk_fotos(contrato_id, etapa, cuarto, por_rol, ruta, sha256, sha256_original, tomada_en, fecha_archivo, origen, posible_galeria)
  values (p_contrato, p_etapa, p_cuarto, r, p_ruta, lower(p_sha256), lower(p_sha256_original), p_tomada_en, p_fecha_archivo, p_origen, coalesce(p_posible_galeria, false))
  returning id into v_id;
  if p_etapa <> 'reclamo' then delete from public.lk_firmas where contrato_id = p_contrato and etapa = p_etapa; end if;
  return v_id;
end $$;

create or replace function public.lk_registrar_escrow(p_contrato uuid, p_contract_id text, p_tx text) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'dueno');
begin
  update public.lk_contratos set escrow_contract_id = p_contract_id where id = p_contrato and estado = 'pendiente_pago' and escrow_contract_id is null;
  if not found then raise exception 'El depósito ya estaba creado o el paso no está abierto.' using errcode = '55000'; end if;
  perform public.lk_evento(p_contrato, 'Se creó la cuenta segura del depósito', p_tx);
end $$;

create or replace function public.lk_registrar_pago(p_contrato uuid, p_tx text) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'inquilino'); c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'pendiente_pago' then raise exception 'Este paso ya no está abierto.' using errcode = '55000'; end if;
  if c.escrow_contract_id is null and p_tx is not null then raise exception 'Falta crear la cuenta segura del depósito.' using errcode = '55000'; end if;
  update public.lk_contratos set estado = 'fotos_entrada' where id = p_contrato;
  perform public.lk_evento(p_contrato, format('Depósito de %s USDC pagado y guardado', c.monto), p_tx);
end $$;

create or replace function public.lk_iniciar_salida(p_contrato uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato);
begin
  update public.lk_contratos set estado = 'salida' where id = p_contrato and estado = 'en_curso';
  if not found then raise exception 'Este paso ya no está abierto.' using errcode = '55000'; end if;
  insert into public.lk_actas(contrato_id, etapa, cuartos) values (p_contrato, 'salida', public.lk_acta_vacia()) on conflict do nothing;
  perform public.lk_evento(p_contrato, 'Empezaron las fotos de salida');
end $$;

create or replace function public.lk_reclamar(p_contrato uuid, p_monto numeric, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'dueno'); c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'ventana_reclamo' or now() > c.ventana_inicio + make_interval(secs => c.ventana_segundos) then
    raise exception 'El plazo para reclamar ya terminó.' using errcode = '55000'; end if;
  if p_monto <= 0 or p_monto > c.monto then raise exception 'El monto tiene que ser mayor que cero y no más que el depósito.' using errcode = '22023'; end if;
  if not exists (select 1 from public.lk_fotos where contrato_id = p_contrato and etapa = 'reclamo') then
    raise exception 'Agrega al menos una foto del daño.' using errcode = '22023'; end if;
  insert into public.lk_reclamos(contrato_id, monto, motivo) values (p_contrato, p_monto, trim(p_motivo));
  update public.lk_contratos set estado = 'reclamo' where id = p_contrato;
  perform public.lk_evento(p_contrato, format('El dueño reclamó %s USDC', p_monto));
end $$;

create or replace function public.lk_responder_reclamo(p_contrato uuid, p_acepta boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'inquilino'); c public.lk_contratos; m numeric;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'reclamo' then raise exception 'Este paso ya no está abierto.' using errcode = '55000'; end if;
  select monto into m from public.lk_reclamos where contrato_id = p_contrato;
  update public.lk_reclamos set respuesta = case when p_acepta then 'aceptado' else 'rechazado' end, respondido_en = now() where contrato_id = p_contrato;
  if p_acepta then
    update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','acuerdo','dueno',m,'inquilino',c.monto - m) where id = p_contrato;
    perform public.lk_evento(p_contrato, format('El inquilino aceptó el reclamo: %s USDC al dueño y %s al inquilino', m, c.monto - m));
  else
    update public.lk_contratos set estado = 'mediacion' where id = p_contrato;
    perform public.lk_evento(p_contrato, 'El inquilino no aceptó el reclamo. Pasa a una persona mediadora');
  end if;
end $$;

create or replace function public.lk_cerrar_sin_reclamo(p_contrato uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato); c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'ventana_reclamo' or now() <= c.ventana_inicio + make_interval(secs => c.ventana_segundos) then return false; end if;
  update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','automatico','dueno',0,'inquilino',c.monto) where id = p_contrato;
  perform public.lk_evento(p_contrato, format('Sin reclamos en el plazo: %s USDC vuelven al inquilino', c.monto));
  return true;
end $$;

create or replace function public.lk_decidir_mediacion(p_contrato uuid, p_monto_dueno numeric, p_motivo text default null) returns void
language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos; m numeric;
begin
  if not public.lk_es_mediador() then raise exception 'Solo una persona mediadora puede decidir.' using errcode = '42501'; end if;
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'mediacion' then raise exception 'Este alquiler no está con mediador.' using errcode = '55000'; end if;
  select monto into m from public.lk_reclamos where contrato_id = p_contrato;
  if p_monto_dueno < 0 or p_monto_dueno > m then raise exception 'El monto para el dueño debe estar entre 0 y lo reclamado.' using errcode = '22023'; end if;
  update public.lk_contratos set estado = 'cerrado', resultado = jsonb_build_object('via','mediacion','dueno',p_monto_dueno,'inquilino',c.monto - p_monto_dueno) where id = p_contrato;
  perform public.lk_evento(p_contrato, format('La persona mediadora decidió: %s USDC al dueño y %s al inquilino%s', p_monto_dueno, c.monto - p_monto_dueno, coalesce(' · ' || nullif(trim(p_motivo), ''), '')));
end $$;

-- La liquidación en Trustless Work (release o resolve-dispute) la firma la cuenta de la plataforma desde el servidor.
create or replace function public.lk_registrar_liquidacion(p_contrato uuid, p_tx text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.lk_es_mediador() or public.lk_rol(p_contrato) is not null) then raise exception 'No participas en este alquiler.' using errcode = '42501'; end if;
  update public.lk_contratos set liquidacion_tx = p_tx where id = p_contrato and estado = 'cerrado' and liquidacion_tx is null;
  if not found then raise exception 'La liquidación ya estaba registrada o el alquiler no está terminado.' using errcode = '55000'; end if;
  perform public.lk_evento(p_contrato, 'Depósito liquidado en la red', p_tx);
end $$;

-- ───────── RLS: lectura solo para participantes (y mediadores en mediación); sin escritura directa ─────────
do $$ declare t text; begin
  foreach t in array array['lk_contratos','lk_participantes','lk_mediadores','lk_actas','lk_firmas','lk_fotos','lk_reclamos','lk_eventos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
grant select on public.lk_contratos, public.lk_participantes, public.lk_actas, public.lk_firmas, public.lk_fotos, public.lk_reclamos, public.lk_eventos to authenticated;
-- La columna invitacion_hash no se expone.
revoke select on public.lk_contratos from authenticated;
grant select (id, creado_por, direccion, monto, moneda, inicio, fin, reglas, email_inquilino, estado, invitacion_expira, ventana_segundos, ventana_inicio,
              escrow_contract_id, escrow_tipo, resultado, liquidacion_tx, creado_en, actualizado_en) on public.lk_contratos to authenticated;

drop policy if exists lk_ver on public.lk_contratos;      create policy lk_ver on public.lk_contratos      for select to authenticated using (public.lk_puede_ver(id));
drop policy if exists lk_ver on public.lk_participantes;  create policy lk_ver on public.lk_participantes  for select to authenticated using (public.lk_puede_ver(contrato_id));
drop policy if exists lk_ver on public.lk_actas;          create policy lk_ver on public.lk_actas          for select to authenticated using (public.lk_puede_ver(contrato_id));
drop policy if exists lk_ver on public.lk_firmas;         create policy lk_ver on public.lk_firmas         for select to authenticated using (public.lk_puede_ver(contrato_id));
drop policy if exists lk_ver on public.lk_fotos;          create policy lk_ver on public.lk_fotos          for select to authenticated using (public.lk_puede_ver(contrato_id));
drop policy if exists lk_ver on public.lk_reclamos;       create policy lk_ver on public.lk_reclamos       for select to authenticated using (public.lk_puede_ver(contrato_id));
drop policy if exists lk_ver on public.lk_eventos;        create policy lk_ver on public.lk_eventos        for select to authenticated using (public.lk_puede_ver(contrato_id));

do $$ declare f text; begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'lk\_%' loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ───────── Storage: bucket privado lk-fotos, carpeta = id del contrato ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lk-fotos', 'lk-fotos', false, 8388608, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;
drop policy if exists lk_fotos_subir on storage.objects;
create policy lk_fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'lk-fotos' and public.lk_rol(public.lk_uuid((storage.foldername(name))[1])) is not null);
drop policy if exists lk_fotos_ver on storage.objects;
create policy lk_fotos_ver on storage.objects for select to authenticated
  using (bucket_id = 'lk-fotos' and public.lk_puede_ver(public.lk_uuid((storage.foldername(name))[1])));
-- Sin update ni delete: una foto subida no se reemplaza (la huella sha256 queda en lk_fotos).

-- ───────── Tiempo real ─────────
do $$ declare t text; begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['lk_contratos','lk_participantes','lk_actas','lk_firmas','lk_fotos','lk_reclamos','lk_eventos'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
