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

## Runbook: prueba SQL contra Supabase (proyecto de prueba `sddgjnuvxzkrhhuczuly`)

**Todavía no se corrió:** no hay una credencial válida; Katherine tiene que darla. **No aplica la migración:** todo corre dentro de una transacción que termina en `ROLLBACK`.

**Antes de correrlo**, confirma que es un proyecto o branch de prueba. `sddgjnuvxzkrhhuczuly` es el proyecto de testnet de la app, pero también tiene las tablas `waitlist*` de lockumi.com, con correos reales. La prueba solo toca tablas `lk_*` y `storage.objects` del bucket `lk-fotos`, y todo se deshace. Si hay dudas, crea un **branch de Supabase** y usa su cadena de conexión.

**Variable que hace falta:** `SUPABASE_DB_URL`, la cadena de conexión de Postgres del proyecto (Settings → Database). Rol `postgres`, conexión directa o pooler en **modo sesión (puerto 5432)**; el pooler de transacciones (6543) no sirve porque la prueba usa `\gset` y funciones `pg_temp`. Ponla solo en la terminal (`read -s SUPABASE_DB_URL; export SUPABASE_DB_URL`) y nunca la imprimas ni la subas.

`SUPABASE_ACCESS_TOKEN` (Management API) **no sirve para esta prueba**: `/database/query` no corre `\i` ni `\gset`. Solo hace falta más adelante para **aplicar** la migración con `scripts/aplicar-supabase-e2e.mjs`, y eso va aparte y con el visto bueno de Katherine.

**Pasos:**

1. Instala `psql` 15 o más nuevo.
2. Corre:

   ```bash
   read -s SUPABASE_DB_URL; export SUPABASE_DB_URL
   CONFIRMO_PROYECTO=sddgjnuvxzkrhhuczuly bash scripts/espacios/probar-sql-remoto.sh
   ```

   El script no corre si `SUPABASE_DB_URL` no apunta a `sddgjnuvxzkrhhuczuly`, si falta `CONFIRMO_PROYECTO` o si usa el puerto 6543. Hace `begin;` → `scripts/espacios/prueba.sql` (aplica la migración dos veces y revisa todo) → `rollback;`.
3. Resultado esperado: todas las líneas con ✓, «SQL TODO OK» y «ROLLBACK hecho». Si algo falla, psql se detiene; al cerrarse la conexión, Postgres deshace la transacción.

**Volver atrás:** no hace falta, porque la transacción siempre termina en `ROLLBACK`. Para comprobar que no quedó nada, corre `select count(*) from pg_proc where proname in ('lk_agregar_cuarto','lk_proteger_entrada');`: si la migración no estaba aplicada, da 0. Ese envoltorio (`begin` + `prueba.sql` + `rollback`) se probó en el Postgres local: no quedaron funciones nuevas ni contratos.

**Límites de esta prueba en Supabase real:**

- Supabase bloquea el `DELETE` por SQL en `storage.objects` (trigger `storage.protect_delete`). `prueba.sql` activa `storage.allow_delete_query` en su sesión solo para revisar la **política RLS** `lk_fotos_borrar` sobre las filas, y luego se deshace. **No borra archivos reales.**
- El borrado de archivos de verdad pasa por la API de Storage (`storage.from('lk-fotos').remove(...)`, como en `quitarCuartoServidor`). Probarlo requiere un usuario de prueba con sesión y un archivo subido: está pendiente (PLAN.md).
- `auth.uid()` en Supabase lee `request.jwt.claim.sub` / `request.jwt.claims`. `pg_temp.yo()` de `prueba.sql` pone esas variables y también `lk.uid`, que usa el stub local.
