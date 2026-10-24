-- Pruebas de 20261024000000_lk_espacios.sql en un Postgres local. Cada bloque falla con un mensaje claro si algo no cumple.
\set ON_ERROR_STOP 1
create or replace function pg_temp.falla(q text, patron text) returns void language plpgsql as $$
begin execute q; raise exception 'SE ESPERABA ERROR (%): %', patron, q;
exception when others then if sqlerrm like 'SE ESPERABA ERROR%' or sqlerrm !~* patron then raise exception 'error distinto para %: %', q, sqlerrm; end if; end $$;
create or replace function pg_temp.ok(c boolean, que text) returns void language plpgsql as $$ begin if not coalesce(c, false) then raise exception 'FALLA: %', que; end if; raise notice '✓ %', que; end $$;
-- auth.uid(): el stub local lee lk.uid; Supabase real lee request.jwt.claim.sub / request.jwt.claims. Se ponen los dos.
create or replace function pg_temp.yo(u text) returns void language sql as $$
  select set_config('lk.uid', u, false), set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false) $$;
-- Supabase real bloquea DELETE por SQL en storage.objects (trigger storage.protect_delete). Esta prueba solo revisa la
-- política RLS lk_fotos_borrar sobre las filas, dentro de una transacción que se deshace (probar-sql-remoto.sh hace ROLLBACK).
-- No borra archivos reales: eso solo lo hace la API de Storage.
select set_config('storage.allow_delete_query', 'true', false);
\set A '''11111111-1111-4111-8111-111111111111'''
\set B '''22222222-2222-4222-8222-222222222222'''
\set C '''33333333-3333-4333-8333-333333333333'''
select pg_temp.yo(:A);
select (public.lk_crear_contrato('Apartamento en Barreal de Heredia', 20, current_date, current_date + 200, '{}', 'demo@lockumi.com', 'dueno@ejemplo.cr')->>'id') as cid \gset
insert into public.lk_participantes(contrato_id, rol, usuario, email_cavos) values (:'cid', 'inquilino', :B, 'demo@lockumi.com');
update public.lk_contratos set estado = 'fotos_entrada' where id = :'cid';
-- Antes de la migración: acta vieja sin id y una foto de Cocina por índice
select pg_temp.ok(not (cuartos->0 ? 'id'), 'antes: el acta vieja no tiene id') from public.lk_actas where contrato_id = :'cid';
select public.lk_registrar_foto(:'cid', 'entrada', 1, :'cid' || '/entrada/a.jpg', repeat('a', 64), now(), null, 'camara', false);
\echo '── aplicando la migración nueva ──'
\i :migracion
\i :migracion
select pg_temp.ok((select string_agg(c->>'id', ',' order by o) from public.lk_actas, jsonb_array_elements(cuartos) with ordinality x(c, o) where contrato_id = :'cid' and etapa = 'entrada') = 'sala,cocina,dormitorio,bano', 'migración: ids por posición (y se puede correr dos veces)');
select pg_temp.ok(cuarto_id = 'cocina', 'migración: la foto vieja de índice 1 queda en cuarto_id cocina') from public.lk_fotos where ruta like '%/a.jpg';
select pg_temp.ok(public.lk_acta_vacia()->3->>'id' = 'bano', 'lk_acta_vacia trae ids');
-- Agregar
select public.lk_agregar_cuarto(:'cid', '  Patio  ', array['Piso o zacate', 'Desagües', 'piso o zacate', '']) as pid \gset
select pg_temp.ok(jsonb_array_length(cuartos) = 5 and cuartos->4->>'nombre' = 'Patio' and (cuartos->4->>'propio')::boolean and cuartos->4->>'agregado_por' = 'dueno'
  and jsonb_array_length(cuartos->4->'items') = 2 and cuartos->4->>'id' = :'pid', 'agregar: Patio al final, propio, agregado por el dueño, puntos sin repetidos ni vacíos') from public.lk_actas where contrato_id = :'cid' and etapa = 'entrada';
select pg_temp.ok(exists (select 1 from public.lk_eventos where contrato_id = :'cid' and texto = 'Se agregó el espacio Patio'), 'agregar: evento en el historial');
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L)', :'cid', 'patio'), 'Ya hay un espacio con ese nombre');
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L)', :'cid', 'BANO'), 'Ya hay un espacio con ese nombre');
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L)', :'cid', '   '), 'Escribe un nombre');
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L)', :'cid', 'x'), 'al menos 2');
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L)', :'cid', repeat('a', 31)), 'Máximo 30');
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L)', :'cid', 'Patio 🌴'), 'solo letras');
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L)', :'cid', E'Pa\ntio'), 'solo letras');
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L, %L)', :'cid', 'Bodega', array[repeat('p', 61)]), '60 letras');
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L, %L)', :'cid', 'Bodega', array['1','2','3','4','5','6','7','8','9']), 'Máximo 8');
select pg_temp.ok(true, 'agregar: rechaza duplicados (sin mayúsculas ni tildes), vacío, 1 letra, 31 letras, emojis, saltos de línea y puntos de más');
select public.lk_agregar_cuarto(:'cid', 'Espacio ' || k) from generate_series(1, 7) k;
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L)', :'cid', 'Uno más'), 'máximo de 12');
select pg_temp.ok(true, 'agregar: máximo 12 espacios');
-- Firmas: un cambio borra la confirmación
insert into public.lk_firmas(contrato_id, etapa, rol, usuario) values (:'cid', 'entrada', 'dueno', :A);
select public.lk_quitar_cuarto(:'cid', (select c->>'id' from public.lk_actas, jsonb_array_elements(cuartos) c where contrato_id = :'cid' and etapa = 'entrada' and c->>'nombre' = 'Espacio 7'));
select pg_temp.ok(not exists (select 1 from public.lk_firmas where contrato_id = :'cid' and etapa = 'entrada'), 'cambiar la lista borra la confirmación de la entrada');
-- Renombrar
select public.lk_renombrar_cuarto(:'cid', :'pid', 'Terraza');
select pg_temp.ok(cuartos->4->>'nombre' = 'Terraza' and cuartos->4->>'id' = :'pid', 'renombrar: mismo id, nombre nuevo') from public.lk_actas where contrato_id = :'cid' and etapa = 'entrada';
select pg_temp.falla(format('select public.lk_renombrar_cuarto(%L, %L, %L)', :'cid', :'pid', 'sála'), 'Ya hay un espacio');
select pg_temp.falla(format('select public.lk_renombrar_cuarto(%L, %L, %L)', :'cid', 'no-existe', 'Algo'), 'ya no está');
-- Fotos por id y quitar con fotos (no se borran)
select public.lk_registrar_foto(:'cid', 'entrada', 4, :'cid' || '/entrada/t.jpg', repeat('b', 64), now(), null, 'camara', false);
select pg_temp.ok(cuarto_id = :'pid', 'foto nueva: guarda el cuarto_id del espacio') from public.lk_fotos where ruta like '%/t.jpg';
-- Los archivos están en el bucket (como los deja la subida)
reset role; insert into storage.objects(bucket_id, name) values ('lk-fotos', :'cid' || '/entrada/a.jpg'), ('lk-fotos', :'cid' || '/entrada/t.jpg');
select public.lk_quitar_cuarto(:'cid', 'cocina') as rutas \gset
select pg_temp.ok(:'rutas' = '{' || :'cid' || '/entrada/a.jpg}', 'ANTES de firmar: quitar Cocina devuelve la ruta de su foto para borrar el archivo');
select pg_temp.ok(not exists (select 1 from public.lk_fotos where ruta like '%/a.jpg'), 'ANTES de firmar: la foto de Cocina se borra de lk_fotos (sin copia)');
select pg_temp.ok(not exists (select 1 from public.lk_actas, jsonb_array_elements(cuartos) c where contrato_id = :'cid' and etapa = 'entrada' and c->>'id' = 'cocina'), 'ANTES de firmar: su lista se borra con el espacio');
-- Borrar el archivo del bucket como la app (rol authenticated, con RLS): solo el que ya salió de lk_fotos
set role authenticated;
with b as (delete from storage.objects where name = :'cid' || '/entrada/a.jpg' returning 1) select pg_temp.ok(count(*) = 1, 'ANTES de firmar: el ARCHIVO de la foto quitada se borra del bucket (política lk_fotos_borrar)') from b;
with b as (delete from storage.objects where name = :'cid' || '/entrada/t.jpg' returning 1) select pg_temp.ok(count(*) = 0, 'el archivo de una foto que sigue en la lista NO se puede borrar') from b;
reset role;
select pg_temp.ok(cuarto = 3 and cuarto_id = :'pid', 'la foto de Terraza sigue emparejada (índice corrido y mismo id)') from public.lk_fotos where ruta like '%/t.jpg';
select pg_temp.ok(exists (select 1 from public.lk_eventos where contrato_id = :'cid' and texto = 'Se quitó el espacio Cocina y se borró su foto.'), 'quitar: evento en el historial');
select public.lk_agregar_cuarto(:'cid', 'Cocina') as cid2 \gset
select pg_temp.ok(:'cid2' <> 'cocina' and not exists (select 1 from public.lk_fotos where cuarto_id = :'cid2'), 'volver a agregar Cocina: espacio nuevo, sin fotos (hay que tomarlas de nuevo)');
select pg_temp.ok(not public.lk_acta_completa(:'cid', 'entrada'), 'acta incompleta mientras falten fotos o puntos');
-- Seguridad
select pg_temp.yo(:C);
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L)', :'cid', 'Intruso'), 'No participas');
select pg_temp.yo(:B);
select public.lk_agregar_cuarto(:'cid', 'Balcón');
select pg_temp.ok(cuartos->-1->>'agregado_por' = 'inquilino', 'el inquilino también puede agregar (agregado_por inquilino)') from public.lk_actas where contrato_id = :'cid' and etapa = 'entrada';
-- Lista fija con las dos confirmaciones
update public.lk_actas set cuartos = jsonb_set(cuartos, '{0,items,0,estado}', '"bien"') where contrato_id = :'cid' and etapa = 'entrada';
insert into public.lk_firmas(contrato_id, etapa, rol, usuario) values (:'cid', 'entrada', 'dueno', :A), (:'cid', 'entrada', 'inquilino', :B);
\set FIJA '''La entrada ya está firmada por los dos'''
select set_config('lk.cid', :'cid', false);
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L)', :'cid', 'Jardín'), :FIJA);
select pg_temp.falla(format('select public.lk_quitar_cuarto(%L, %L)', :'cid', 'sala'), :FIJA);
select pg_temp.falla(format('select public.lk_renombrar_cuarto(%L, %L, %L)', :'cid', :'pid', 'Otro'), :FIJA);
do $$ begin perform public.lk_quitar_cuarto(current_setting('lk.cid')::uuid, 'sala'); raise exception 'SE ESPERABA ERROR';
exception when others then if sqlerrm <> 'La entrada ya está firmada por los dos. Los espacios, las fotos y la lista quedan guardados como respaldo y ya no se pueden cambiar ni borrar. Si algo cambia durante el alquiler, regístralo en las fotos de salida.' then raise exception 'mensaje distinto: %', sqlerrm; end if; end $$;
select pg_temp.ok(true, 'DESPUÉS de firmar: las RPC rechazan agregar, quitar y renombrar, con el mensaje EXACTO de Legal (24/10)');
reset role;   -- aun como dueño de la base (sin RLS) los triggers lo impiden
select pg_temp.falla(format('delete from public.lk_fotos where contrato_id = %L', :'cid'), :FIJA);
select pg_temp.falla(format('update public.lk_fotos set sha256 = %L where contrato_id = %L', repeat('c', 64), :'cid'), :FIJA);
select pg_temp.falla(format('update public.lk_actas set cuartos = cuartos - 0 where contrato_id = %L and etapa = %L', :'cid', 'entrada'), :FIJA);
select pg_temp.falla(format('update public.lk_actas set cuartos = jsonb_set(cuartos, %L, %L) where contrato_id = %L and etapa = %L', '{0,items,0,estado}', '"detalle"', :'cid', 'entrada'), :FIJA);
select pg_temp.falla(format('delete from public.lk_actas where contrato_id = %L', :'cid'), :FIJA);
select pg_temp.falla(format('delete from public.lk_firmas where contrato_id = %L and etapa = %L', :'cid', 'entrada'), :FIJA);
select pg_temp.falla(format('delete from public.lk_contratos where id = %L', :'cid'), :FIJA);
select pg_temp.ok(true, 'DESPUÉS de firmar: ni con SQL directo se borran o cambian fotos, espacios, lista ni confirmaciones (ni en cascada)');
insert into public.lk_fotos(contrato_id, etapa, cuarto, cuarto_id, por_rol, ruta, sha256, tomada_en, origen, posible_galeria) values (:'cid', 'entrada', 0, 'sala', 'inquilino', :'cid' || '/entrada/s.jpg', repeat('d', 64), now(), 'camara', false);
insert into storage.objects(bucket_id, name) values ('lk-fotos', :'cid' || '/entrada/s.jpg'), ('lk-fotos', :'cid' || '/entrada/huerfano.jpg');
select pg_temp.yo(:B); set role authenticated;
with b as (delete from storage.objects where bucket_id = 'lk-fotos' returning 1) select pg_temp.ok(count(*) = 0, 'DESPUÉS de firmar: el bucket no deja borrar ningún archivo (ni uno suelto)') from b;
select pg_temp.falla(format('select public.lk_editar_item(%L, %L, 0, 0, %L)', :'cid', 'entrada', 'detalle'), 'ya no está abierto|firmada por los dos');
reset role; select pg_temp.yo(:B);
-- La salida copia la entrada
update public.lk_contratos set estado = 'en_curso' where id = :'cid';
select public.lk_iniciar_salida(:'cid');
select pg_temp.ok((select jsonb_agg(c->'id') from public.lk_actas, jsonb_array_elements(cuartos) c where contrato_id = :'cid' and etapa = 'salida') = (select jsonb_agg(c->'id') from public.lk_actas, jsonb_array_elements(cuartos) c where contrato_id = :'cid' and etapa = 'entrada')
  and (select cuartos->0->'items'->0->'estado' from public.lk_actas where contrato_id = :'cid' and etapa = 'salida') = 'null'::jsonb
  and (select cuartos->3->>'nombre' from public.lk_actas where contrato_id = :'cid' and etapa = 'salida') = 'Terraza', 'salida: mismos id, nombres y puntos, sin estado');
select pg_temp.falla(format('select public.lk_agregar_cuarto(%L, %L)', :'cid', 'Jardín'), :FIJA);
select pg_temp.ok(true, 'en la salida no se agregan espacios');
select public.lk_editar_item(:'cid', 'salida', 0, 0, 'bien');
select pg_temp.ok((select cuartos->0->'items'->0->>'estado' from public.lk_actas where contrato_id = :'cid' and etapa = 'salida') = 'bien', 'la salida se sigue llenando normalmente (la protección es solo para la entrada)');
\echo 'SQL TODO OK'
