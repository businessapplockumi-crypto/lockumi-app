-- Lockumi · invitaciones en los dos sentidos (Parte 4, solo testnet).
-- Quien crea el alquiler elige su papel (dueño o inquilino) e invita a la otra persona por link o correo.
--   * Link de un solo uso, con su huella sha256 en invitacion_hash; vence a los 7 días (invitacion_expira).
--   * Reglas: el DUEÑO las pone o las confirma. Si creó el inquilino, son un borrador que el dueño confirma (y puede cambiar)
--     al aceptar. Si creó el dueño, el inquilino las acepta antes de firmar y depositar. Nadie firma el contrato sin las dos
--     aprobaciones (reglas_ok_dueno y reglas_ok_inquilino).
-- Se aplica DESPUÉS de 20261017000000_lockumi_e2e.sql. Idempotente: se puede volver a aplicar.

alter table public.lk_contratos add column if not exists rol_creador text not null default 'dueno';
alter table public.lk_contratos add column if not exists email_dueno text;
alter table public.lk_contratos add column if not exists reglas_ok_dueno timestamptz;
alter table public.lk_contratos add column if not exists reglas_ok_inquilino timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'lk_contratos_rol_creador_check') then
    alter table public.lk_contratos add constraint lk_contratos_rol_creador_check check (rol_creador in ('dueno','inquilino')); end if;
  if not exists (select 1 from pg_constraint where conname = 'lk_contratos_email_dueno_check') then
    alter table public.lk_contratos add constraint lk_contratos_email_dueno_check check (email_dueno is null or email_dueno ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'); end if;
end $$;
-- Alquileres creados antes de esta migración: los creó el dueño y las reglas ya contaban como puestas por él.
update public.lk_contratos c set email_dueno = p.email_cavos, reglas_ok_dueno = coalesce(c.reglas_ok_dueno, c.creado_en)
  from public.lk_participantes p where p.contrato_id = c.id and p.rol = 'dueno' and c.email_dueno is null;
-- Si el inquilino ya había aceptado la invitación (antes no se pedían las reglas por separado), sus reglas cuentan como aceptadas.
update public.lk_contratos c set reglas_ok_inquilino = coalesce(c.reglas_ok_inquilino, p.unido_en)
  from public.lk_participantes p where p.contrato_id = c.id and p.rol = 'inquilino' and c.reglas_ok_inquilino is null;

-- Correo de la persona invitada (la que NO creó el alquiler).
create or replace function public.lk_email_invitado(c public.lk_contratos) returns text language sql immutable as $$
  select case c.rol_creador when 'dueno' then c.email_inquilino else c.email_dueno end
$$;
create or replace function public.lk_nombre_rol(r text) returns text language sql immutable as $$
  select case r when 'dueno' then 'dueño' else 'inquilino' end
$$;
create or replace function public.lk_token() returns text language sql volatile as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
$$;
create or replace function public.lk_hash(t text) returns text language sql immutable as $$
  select encode(sha256(convert_to(coalesce(t, ''), 'utf8')), 'hex')
$$;

-- ───────── Crear: quien crea elige su papel ─────────
drop function if exists public.lk_crear_contrato(text, numeric, date, date, text[], text, text, text, int);
create or replace function public.lk_crear_contrato(
  p_direccion text, p_monto numeric, p_inicio date, p_fin date, p_reglas text[], p_email_otro text,
  p_email_cavos text, p_direccion_stellar text default null, p_ventana_segundos int default 604800, p_rol_creador text default 'dueno'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_token text := public.lk_token(); v_yo text := lower(trim(p_email_cavos)); v_otro text := lower(trim(p_email_otro));
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  if p_rol_creador is null or p_rol_creador not in ('dueno','inquilino') then raise exception 'Elige si eres el dueño o el inquilino.' using errcode = '22023'; end if;
  if p_inicio < (now() at time zone 'utc')::date - 1 then raise exception 'La fecha de entrada no puede ser anterior a hoy. Elige hoy o una fecha futura.' using errcode = '22023'; end if;
  if p_inicio > (now() at time zone 'utc')::date + 366 then raise exception 'La entrada debe ser dentro del próximo año.' using errcode = '22023'; end if;
  if v_otro !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'Revisa el correo de la otra persona (ej.: nombre@correo.com).' using errcode = '22023'; end if;
  if v_otro = v_yo then raise exception 'Ese es tu correo. Escribe el de la otra persona.' using errcode = '22023'; end if;
  insert into public.lk_contratos(creado_por, direccion, monto, inicio, fin, reglas, email_inquilino, email_dueno, rol_creador,
                                  reglas_ok_dueno, reglas_ok_inquilino, invitacion_hash, invitacion_expira, ventana_segundos)
  values (auth.uid(), trim(p_direccion), p_monto, p_inicio, p_fin, coalesce(p_reglas, '{}'),
          case p_rol_creador when 'dueno' then v_otro else v_yo end, case p_rol_creador when 'dueno' then v_yo else v_otro end, p_rol_creador,
          case p_rol_creador when 'dueno' then now() end,        -- el dueño que crea ya puso las reglas
          case p_rol_creador when 'inquilino' then now() end,    -- el inquilino que crea propone las reglas (el dueño las confirma)
          public.lk_hash(v_token), now() + interval '7 days', p_ventana_segundos)
  returning id into v_id;
  insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos, direccion_stellar) values (v_id, p_rol_creador, auth.uid(), v_yo, p_direccion_stellar);
  insert into public.lk_actas(contrato_id, etapa, cuartos) values (v_id, 'entrada', public.lk_acta_vacia());
  perform public.lk_evento(v_id, format('Alquiler creado por el %s. Invitación lista para el %s', public.lk_nombre_rol(p_rol_creador),
                                         public.lk_nombre_rol(case p_rol_creador when 'dueno' then 'inquilino' else 'dueno' end)));
  return jsonb_build_object('id', v_id, 'token', v_token, 'expira', now() + interval '7 days');
end $$;

-- ───────── Ver la invitación (con el link) ─────────
create or replace function public.lk_ver_invitacion(p_contrato uuid, p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.lk_contratos; v_creador text;
begin
  select * into c from public.lk_contratos where id = p_contrato;
  if c.id is null or c.invitacion_hash is null or c.invitacion_hash <> public.lk_hash(p_token) then
    raise exception 'Este link de invitación no es válido o ya se usó. Pide a la otra persona que toque «Reenviar invitación» y abre el link nuevo.' using errcode = '42501';
  end if;
  if c.invitacion_expira < now() then
    raise exception 'Este link venció: dura 7 días. Pide a la otra persona que toque «Reenviar invitación» y abre el link nuevo.' using errcode = '42501';
  end if;
  select email_cavos into v_creador from public.lk_participantes where contrato_id = c.id and rol = c.rol_creador;
  return jsonb_build_object('direccion', c.direccion, 'monto', c.monto, 'inicio', c.inicio, 'fin', c.fin, 'reglas', c.reglas,
    'rol_invitado', case c.rol_creador when 'dueno' then 'inquilino' else 'dueno' end, 'rol_creador', c.rol_creador,
    'email_invitado', public.lk_email_invitado(c), 'email_creador', v_creador, 'expira', c.invitacion_expira,
    'reglas_por_confirmar', c.reglas_ok_dueno is null,
    -- compatibilidad con la pantalla anterior
    'email_inquilino', c.email_inquilino, 'email_dueno', c.email_dueno);
end $$;

-- ───────── Aceptar: la sesión de Cavos queda vinculada al papel invitado ─────────
drop function if exists public.lk_aceptar_invitacion(uuid, text, text, text);
create or replace function public.lk_aceptar_invitacion(p_contrato uuid, p_token text, p_email_cavos text, p_direccion_stellar text default null, p_acepta_reglas boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare c public.lk_contratos; v_rol text; v_mio text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  perform public.lk_ver_invitacion(p_contrato, p_token);
  select * into c from public.lk_contratos where id = p_contrato for update;
  v_rol := case c.rol_creador when 'dueno' then 'inquilino' else 'dueno' end;
  v_mio := public.lk_rol(p_contrato);
  if v_mio is not null then
    raise exception 'Tú creaste este alquiler como %. Este link es para el %: compártelo con esa persona.', public.lk_nombre_rol(v_mio), public.lk_nombre_rol(v_rol) using errcode = '42501';
  end if;
  if lower(trim(p_email_cavos)) <> public.lk_email_invitado(c) then
    raise exception 'Esta invitación es para %. Sal de tu cuenta y entra con ese correo, o pide que te inviten con el tuyo.', public.lk_email_invitado(c) using errcode = '42501';
  end if;
  if v_rol = 'inquilino' and not coalesce(p_acepta_reglas, false) then
    raise exception 'Para entrar como inquilino, marca que aceptas las reglas del alquiler.' using errcode = '22023';
  end if;
  insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos, direccion_stellar)
  values (p_contrato, v_rol, auth.uid(), lower(trim(p_email_cavos)), p_direccion_stellar);
  update public.lk_contratos set invitacion_hash = null,   -- un solo uso
    reglas_ok_inquilino = case when v_rol = 'inquilino' then now() else reglas_ok_inquilino end where id = p_contrato;
  perform public.lk_evento(p_contrato, format('El %s aceptó la invitación', public.lk_nombre_rol(v_rol)));
  if v_rol = 'inquilino' then perform public.lk_evento(p_contrato, 'El inquilino aceptó las reglas'); end if;
  return v_rol;
end $$;

-- ───────── Reenviar: link nuevo (7 días); solo quien creó y mientras la otra persona no entró ─────────
create or replace function public.lk_nueva_invitacion(p_contrato uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato); c public.lk_contratos; v_token text := public.lk_token();
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if r <> c.rol_creador then raise exception 'Solo quien creó el alquiler puede reenviar la invitación.' using errcode = '42501'; end if;
  if (select count(*) from public.lk_participantes where contrato_id = p_contrato) >= 2 then
    raise exception 'La otra persona ya aceptó la invitación.' using errcode = '55000'; end if;
  update public.lk_contratos set invitacion_hash = public.lk_hash(v_token), invitacion_expira = now() + interval '7 days' where id = p_contrato;
  perform public.lk_evento(p_contrato, 'Se generó un link de invitación nuevo (el anterior ya no sirve)');
  return v_token;
end $$;

-- ───────── Reglas: el dueño confirma (o cambia); el inquilino acepta ─────────
create or replace function public.lk_confirmar_reglas(p_contrato uuid, p_reglas text[]) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'dueno'); c public.lk_contratos; v_reglas text[];
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.estado <> 'firmas' or exists (select 1 from public.lk_firmas where contrato_id = p_contrato and etapa = 'contrato') then
    raise exception 'Las reglas ya no se pueden cambiar: el contrato ya se está firmando.' using errcode = '55000'; end if;
  select coalesce(array_agg(trim(x)) filter (where trim(x) <> ''), '{}') into v_reglas from unnest(coalesce(p_reglas, '{}')) x;
  if exists (select 1 from unnest(v_reglas) x where char_length(x) > 200) then raise exception 'Cada regla puede tener hasta 200 letras.' using errcode = '22023'; end if;
  update public.lk_contratos set reglas = v_reglas, reglas_ok_dueno = now(),
    -- si el dueño cambió las reglas, el inquilino tiene que volver a aceptarlas
    reglas_ok_inquilino = case when v_reglas is distinct from c.reglas then null else reglas_ok_inquilino end
  where id = p_contrato;
  perform public.lk_evento(p_contrato, case when v_reglas is distinct from c.reglas then 'El dueño cambió y confirmó las reglas' else 'El dueño confirmó las reglas' end);
end $$;

create or replace function public.lk_aceptar_reglas(p_contrato uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato, 'inquilino'); c public.lk_contratos;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if c.reglas_ok_dueno is null then raise exception 'Primero el dueño tiene que confirmar las reglas.' using errcode = '55000'; end if;
  if c.estado <> 'firmas' then raise exception 'Este paso ya no está abierto.' using errcode = '55000'; end if;
  update public.lk_contratos set reglas_ok_inquilino = now() where id = p_contrato;
  perform public.lk_evento(p_contrato, 'El inquilino aceptó las reglas');
end $$;

-- ───────── Firmar: el contrato pide las dos personas y las reglas aprobadas por las dos ─────────
create or replace function public.lk_firmar(p_contrato uuid, p_etapa text) returns text
language plpgsql security definer set search_path = public as $$
declare r text := public.lk_exigir_rol(p_contrato); c public.lk_contratos; n int; v_estado text;
begin
  select * into c from public.lk_contratos where id = p_contrato for update;
  if not ((p_etapa = 'contrato' and c.estado = 'firmas') or (p_etapa = 'entrada' and c.estado = 'fotos_entrada') or (p_etapa = 'salida' and c.estado = 'salida')) then
    raise exception 'Este paso ya no está abierto.' using errcode = '55000'; end if;
  if p_etapa = 'contrato' and (select count(*) from public.lk_participantes where contrato_id = p_contrato) < 2 then
    raise exception 'El % todavía no aceptó la invitación.', public.lk_nombre_rol(case c.rol_creador when 'dueno' then 'inquilino' else 'dueno' end) using errcode = '55000'; end if;
  if p_etapa = 'contrato' and c.reglas_ok_dueno is null then raise exception 'Primero el dueño tiene que confirmar las reglas.' using errcode = '55000'; end if;
  if p_etapa = 'contrato' and c.reglas_ok_inquilino is null then raise exception 'Primero el inquilino tiene que aceptar las reglas.' using errcode = '55000'; end if;
  if p_etapa <> 'contrato' and not public.lk_acta_completa(p_contrato, p_etapa) then
    raise exception 'Antes de confirmar, cada espacio necesita una foto y todo marcado.' using errcode = '55000'; end if;
  if exists (select 1 from public.lk_firmas where contrato_id = p_contrato and etapa = p_etapa and rol = r) then
    raise exception 'Ya firmaste.' using errcode = '55000'; end if;
  insert into public.lk_firmas(contrato_id, etapa, rol, usuario) values (p_contrato, p_etapa, r, auth.uid());
  perform public.lk_evento(p_contrato, format('%s: firmó el %s', case p_etapa when 'contrato' then 'Contrato' when 'entrada' then 'Fotos de entrada' else 'Fotos de salida' end, public.lk_nombre_rol(r)));
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

-- ───────── Permisos: columnas nuevas visibles (menos invitacion_hash); funciones solo para sesiones ─────────
revoke select on public.lk_contratos from authenticated;
grant select (id, creado_por, direccion, monto, moneda, inicio, fin, reglas, email_inquilino, email_dueno, rol_creador, reglas_ok_dueno, reglas_ok_inquilino,
              estado, invitacion_expira, ventana_segundos, ventana_inicio, escrow_contract_id, escrow_tipo, resultado, liquidacion_tx, creado_en, actualizado_en)
  on public.lk_contratos to authenticated;
do $$ declare f text; begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'lk\_%' loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
