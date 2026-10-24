# «+ Agregar espacio» (rama `agregar-espacio`, 24 oct 2026)

**No publicado.** Rama `agregar-espacio`, basada en `master` `051c071` (sin los commits del formulario). Spec: `diseno/envio/agregar-espacio/textos.md` y `resumen.jpg` (las correcciones de Legal del 23/10 mandan). Imagen: `diseno/envio/agregar-espacio/app.jpg` y `celebracion.gif` (con demo@lockumi.com).

## Qué hace

- En las fotos de entrada, debajo de los espacios, está **«+ Agregar espacio»**. Abre una hoja desde abajo en el teléfono y un panel lateral en la computadora, con foco atrapado y Esc para cerrar.
- **Nombre:** de 2 a 30 caracteres, con contador. No se aceptan duplicados (sin distinguir mayúsculas ni tildes: «baño» = «Baño»); en ese caso se sugiere «Baño 2». Se quitan los emojis y los caracteres de control. Máximo **12 espacios**.
- **Chips** de sugerencia (Patio, Cochera, Cuarto de pilas, Balcón, Bodega, Jardín, Oficina) y **plantillas** de lista por nombre; «+ Otro punto» agrega puntos propios (máximo 8 de 60 caracteres).
- **Nota de Legal** sobre quién ve la lista: «La otra persona ve la misma lista…».
- Al agregar: la fila se marca «Agregado», hay una celebración corta (puntos; nada con «reducir movimiento») y sale el aviso v2 «Espacio agregado» con «Tomar foto →».
- Menú «⋯» de cada espacio: **«Cambiar nombre»** y **«Quitar espacio»**.
- **Salida:** copia los espacios de la entrada (mismo id, mismo nombre, misma lista) y muestra «Al entrar: N fotos». La comparación entre entrada y salida es **por id**, no por posición ni por nombre.
- El texto libre (nombres y puntos) se muestra siempre como texto de React, escapado; nunca como HTML.

## Regla de quitar y de la entrada firmada (Katherine, 24 oct 2026)

**Antes de que los dos firmen la entrada:** quitar un espacio **borra de verdad** sus fotos y su lista, sin respaldo. Si se vuelve a agregar, es un espacio nuevo (id nuevo) y hay que tomar fotos nuevas.

- Con fotos, el aviso de confirmación es el texto final de Legal (`textoQuitar(n)`, para 1 y para varias fotos), con «Mantener el espacio» (con el foco) y «Quitar espacio». No hay «Deshacer».
- Sin fotos se puede deshacer desde el aviso (se guarda solo en memoria).
- Quitar o cambiar un espacio borra las firmas de la entrada que hubiera, porque la lista cambió.

**Después de que los dos firman la entrada:** nada se puede borrar ni cambiar: ni espacios, ni fotos, ni la lista. La app esconde «Cambiar nombre», «Quitar espacio» y «+ Agregar espacio» y muestra el texto final de Legal: «La entrada ya está firmada por los dos. Los espacios, las fotos y la lista quedan guardados como respaldo y ya no se pueden cambiar ni borrar.» Las fotos de salida se siguen llenando con normalidad.

Se aplica también en el **servidor** (migración `supabase/migrations/20261024000000_lk_espacios.sql`):

- `lk_quitar_cuarto` borra las filas de `lk_fotos` del espacio y su lista, y devuelve las rutas de los archivos. El cliente (`quitarCuartoServidor` en `src/servidor/repositorio.ts`) borra esos **archivos de Supabase Storage** (`lk-fotos`) y reintenta una vez; si falla, muestra «Se quitó el espacio, pero no se pudieron borrar sus archivos. Toca «Reintentar» o avísanos.».
- La política `lk_fotos_borrar` de `storage.objects` solo deja borrar un archivo de `lk-fotos` si quien lo pide es parte del contrato, el archivo ya no está registrado en `lk_fotos` y la entrada no está firmada por los dos.
- El trigger `lk_proteger_entrada` (en `lk_actas`, `lk_fotos` y `lk_firmas`) rechaza cualquier borrado o cambio de la entrada firmada, también por SQL directo o en cascada, con el error `lk_error_fija()`: el texto de Legal más «Si algo cambia durante el alquiler, regístralo en las fotos de salida.».
- Consecuencia: **un contrato con la entrada firmada no se puede borrar** (la cascada también se rechaza). Propuesta de Legal: al borrar una cuenta, las fotos y la lista de una entrada firmada se guardan hasta que termine el plazo de guarda (18 meses, Ley 7527, art. 120). Falta confirmarlo con un abogado y en el Aviso de privacidad (PLAN.md).

## Estado y límites honestos

- **La migración SQL no se aplicó en ningún proyecto real.** Se probó solo en un Postgres 17 local con stubs de `auth` y `storage`: `bash scripts/espacios/probar-sql.sh` (aplica `scripts/espacios/stubs.sql`, la migración e2e, datos de prueba y la migración nueva dos veces; termina en «SQL TODO OK»).
- **El borrado de archivos no se probó contra Supabase Storage real**: solo con el stub local (política RLS) y con un mock en las pruebas unitarias.
- Si el borrado de archivos falla después de la RPC, pueden quedar archivos huérfanos. Falta un trabajo de limpieza (ver PLAN.md). Mientras tanto, el error le pide a la persona «Reintentar» o avisarnos; falta un canal de contacto real.
- En modo servidor, las acciones de espacios están detrás de `VITE_ESPACIOS_SERVIDOR=1` (`espaciosServidor` en `src/servidor/config.ts`), apagado hasta aplicar la migración; sin la bandera la app esconde esas acciones en modo servidor. El `select` de fotos de `repositorio.ts` no cambió.
- **Datos guardados en el navegador:** `migrarEspacios` da un id fijo a los espacios viejos (por nombre) y quita el campo viejo `quitados`.
- Avisos: `alertaEspacioAgregado`, `alertaNombreCambiado`, `alertaEspacioQuitado` (aviso v2, `src/alertas.ts`).

## Textos de Legal (`// LEGAL: revisado (24/10)`)

Legal revisó `84cb442` el 24 oct 2026:

- `textoQuitar(1)` y `textoQuitar(n)` (`src/espacios.ts`).
- `TXT.bloqueado`: «La entrada ya está firmada por los dos. Los espacios, las fotos y la lista quedan guardados como respaldo y ya no se pueden cambiar ni borrar.»
- `ERR.fija` y `lk_error_fija()` (iguales, palabra por palabra): `TXT.bloqueado` + «Si algo cambia durante el alquiler, regístralo en las fotos de salida.»
- Historial (`src/acciones.ts` y `lk_quitar_cuarto`): 1 foto → «Se quitó el espacio {X} y se borró su foto.»; n fotos → «Se quitó el espacio {X} y se borraron sus {n} fotos.»; sin fotos → «Se quitó el espacio {X}.»
- Error al borrar archivos (aprobado): «Se quitó el espacio, pero no se pudieron borrar sus archivos. Toca «Reintentar» o avísanos.» Falta un canal de contacto real para «avísanos» (PLAN.md).

## Pruebas

- Unitarias: `src/__tests__/espacios.test.tsx` (22; migración, reglas, plantillas, acciones antes y después de firmar, escape, textos exactos de Legal, avisos, mapeo, SQL y borrado de archivos con reintento y error).
- SQL: `bash scripts/espacios/probar-sql.sh`.
- Navegador: con `VITE_TRUSTLESS=1 VITE_CAVOS_APP_ID=captura-local npx vite --port 5173 --strictPort`, correr `CHROME=/usr/bin/google-chrome OUT=/tmp/esp/ node scripts/agregar-espacio/capturar.mjs` (390 y 1280 px; `GIF=1` guarda los cuadros de la celebración).

## Runbook: Supabase de prueba (`sddgjnuvxzkrhhuczuly`) por la Management API

**Todavía no se corrió nada remoto:** el token actual no sirve. Cuando Katherine dé uno nuevo, todo usa solo `SUPABASE_ACCESS_TOKEN`, un token personal de Supabase en `process.env`. No hace falta `SUPABASE_DB_URL`.

Todos los scripts llaman a `POST https://api.supabase.com/v1/projects/sddgjnuvxzkrhhuczuly/database/query` (`scripts/espacios/api.mjs`). Ninguno imprime el token. Todos exigen `CONFIRMO_PROYECTO=sddgjnuvxzkrhhuczuly`, y el proyecto está fijo en el código.

El proyecto es el de testnet de la app, pero también tiene las tablas `waitlist*` de lockumi.com, con correos reales. Los scripts **solo** nombran tablas `lk_*` de `public` (la lista sale de `information_schema`), filas de `storage.objects` con `bucket_id = 'lk-fotos'` y catálogos (`pg_proc`, `pg_trigger`, `pg_policies`, `information_schema`). El ensayo local revisa que ninguna consulta nombre `waitlist`.

Ponte el token sin que quede en el historial ni en la pantalla:

```bash
cd /workspace/lockumi/wt-espacio
read -rs SUPABASE_ACCESS_TOKEN && export SUPABASE_ACCESS_TOKEN CONFIRMO_PROYECTO=sddgjnuvxzkrhhuczuly
```

### 1. Respaldo (solo lectura)

```bash
node scripts/espacios/exportar-lk.mjs
```

Guarda en `/workspace/lockumi/respaldos/<fecha>/`, fuera del repo y nunca en un commit; no deja guardarlo dentro del repo:

- `tablas.json`;
- `esquema/<tabla>.json`: columnas, restricciones, índices, políticas, triggers y RLS;
- `filas/<tabla>.json`;
- `storage-objects-lk-fotos.json`: solo metadatos, no los archivos;
- `politicas-storage-lk.json`;
- `funciones-lk.json`: definición, tipo de retorno y permisos;
- `manifiesto.json`: cantidades y md5.

Las consultas van con `read_only: true`. Carpetas con permiso 700 y archivos con 600.

### 2. Prueba SQL que no deja nada

```bash
node scripts/espacios/probar-sql-remoto.mjs
```

1. **Sonda:** `BEGIN; create table public.lk__sonda_<azar>(x int); ROLLBACK;` y, en otra consulta, revisa que la tabla no exista. Después hace lo mismo con un error en medio (`select 1/0`): la API tiene que devolver el error y la tabla tampoco puede existir. Si la API no respeta `BEGIN … ROLLBACK`, borra la sonda y **no corre la prueba**.
2. **Huella antes:** cantidad y md5 de las filas de cada tabla `lk_*` y de `storage.objects` (`lk-fotos`), más md5 de las funciones `lk_*` (con permisos), de los triggers, de las políticas `lk_*` de storage y de las columnas.
3. **Prueba:** manda `BEGIN;` + `prueba.sql` convertido a SQL plano (`sqlPlano()` en `api.mjs`: mete la migración, cambia `\set`, `\gset` y `\echo`) + `ROLLBACK;`, en **una** consulta. Cada revisión lanza un error si no se cumple, así que una respuesta sin error quiere decir que pasaron todas. La prueba aplica la migración dos veces **dentro** de la transacción, así que sirve con la migración aplicada o sin aplicar.
4. **Huella después:** tiene que ser igual. Si alguien usó la app de prueba en medio, cambia y el script lo dice. Córrelo cuando nadie la use.

Lo que no se deshace: las secuencias (si alguna avanzó, no cambia ninguna fila). Mientras dura, `alter table lk_fotos add column` toma un bloqueo corto de `lk_fotos`.

En Supabase real, el `DELETE` por SQL en `storage.objects` está bloqueado (`storage.protect_delete`). `prueba.sql` activa `storage.allow_delete_query` solo dentro de su transacción, para revisar la política `lk_fotos_borrar` sobre las filas. **No borra archivos.** El borrado de archivos de verdad (API de Storage, con un usuario con sesión) sigue pendiente (PLAN.md).

**Sin plan de limpieza a mano:** si la sonda falla, no se corre la prueba. Una limpieza que borre solo lo que la prueba creó no sirve, porque la prueba firma una entrada y, con la migración, esa entrada ya no se puede borrar (es justo lo que se prueba). Habría que apagar triggers en la base real.

### 3. Aplicar la migración (cambio duradero; solo con el OK de Katherine)

```bash
node scripts/espacios/aplicar-migracion.mjs                        # simulación: no llama a la API
node scripts/espacios/aplicar-migracion.mjs --aplicar-de-verdad    # solo con el OK de Katherine
```

Con el flag:

1. Hace un respaldo (paso 1).
2. Manda `BEGIN; <migración>; COMMIT;`, todo o nada.
3. Revisa las funciones, los 3 triggers `lk_proteger_entrada`, la política `lk_fotos_borrar` y la columna `cuarto_id`.
4. Imprime la carpeta del respaldo.

Después, corre otra vez el paso 2 y prende `VITE_ESPACIOS_SERVIDOR=1` en la vista previa.

### 4. Volver atrás

```bash
node scripts/espacios/revertir-migracion.mjs --respaldo /workspace/lockumi/respaldos/<fecha-de-antes>    # solo escribe revertir.sql
node scripts/espacios/revertir-migracion.mjs --respaldo /workspace/lockumi/respaldos/<fecha-de-antes> --revertir-de-verdad
```

Usa el respaldo que `aplicar-migracion.mjs` tomó **antes** de aplicar; si el respaldo ya tiene la migración, no corre. En una transacción:

- quita los triggers, la política y las funciones nuevas;
- vuelve a crear las funciones `lk_*` del respaldo con sus permisos; solo borra antes la que cambió de tipo de retorno, `lk_quitar_cuarto`;
- quita la columna `cuarto_id` y los ids de espacio dentro de las listas.

Lo que no devuelve: las fotos y los archivos que se hayan quitado mientras la migración estuvo aplicada. Esos se borran de verdad; sus filas están en `filas/*.json` del respaldo.

### Ensayo local (sin Supabase)

```bash
bash scripts/espacios/ensayo-local.sh
```

Arranca un Postgres 17 temporal y la API falsa `scripts/espacios/api-falsa.mjs` en 127.0.0.1. La API falsa manda todo el texto en una consulta simple de varias sentencias, devuelve las filas de la última que tiene filas y un 400 con `message` si hay error. El ensayo usa datos que ya existían (un alquiler, un archivo de `lk-fotos`, un archivo de otro bucket y una tabla `waitlist`) y corre, en orden:

1. aplicar sin flag: no hace ninguna llamada a la API;
2. exportar;
3. prueba remota con la migración sin aplicar;
4. aplicar con flag;
5. prueba remota con la migración aplicada;
6. revertir con el primer respaldo: filas y definiciones `lk_*` quedan iguales, permisos incluidos.

Al final revisa que ninguna consulta nombre `waitlist`, que el respaldo de storage solo traiga `lk-fotos` y que el token no salga en pantalla. Resultado del 24 oct 2026: «ENSAYO TODO OK» (148 consultas).

Lo que el ensayo **no** puede probar, porque depende de la API real:

- que la API real respete `BEGIN … ROLLBACK` (lo revisa la sonda antes de todo);
- los permisos del rol con que corre la API (`set role authenticated` y el `insert` en `storage.objects`);
- el formato exacto de la respuesta.

Si algo de eso falla, la API devuelve el error, la transacción no se confirma y el script lo dice.
