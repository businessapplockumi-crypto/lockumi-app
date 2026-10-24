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
- El trigger `lk_proteger_entrada` (en `lk_actas`, `lk_fotos` y `lk_firmas`) rechaza cualquier borrado o cambio de la entrada firmada, también por SQL directo o en cascada, con el error `lk_error_fija()`: el texto de Legal más «Si algo cambió, anótalo en las fotos de salida.».
- Consecuencia: **un contrato con la entrada firmada no se puede borrar** (la cascada también se rechaza). Falta decidir qué pasa al borrar una cuenta y cuánto tiempo se guardan las fotos (Aviso de privacidad).

## Estado y límites honestos

- **La migración SQL no se aplicó en ningún proyecto real.** Se probó solo en un Postgres 17 local con stubs de `auth` y `storage`: `bash scripts/espacios/probar-sql.sh` (aplica `scripts/espacios/stubs.sql`, la migración e2e, datos de prueba y la migración nueva dos veces; termina en «SQL TODO OK»).
- **El borrado de archivos no se probó contra Supabase Storage real**: solo con el stub local (política RLS) y con un mock en las pruebas unitarias.
- Si el borrado de archivos falla después de la RPC, pueden quedar archivos huérfanos. Falta un trabajo de limpieza (ver PLAN.md).
- En modo servidor, las acciones de espacios están detrás de `VITE_ESPACIOS_SERVIDOR=1` (`espaciosServidor` en `src/servidor/config.ts`), apagado hasta aplicar la migración; sin la bandera la app esconde esas acciones en modo servidor. El `select` de fotos de `repositorio.ts` no cambió.
- **Datos guardados en el navegador:** `migrarEspacios` da un id fijo a los espacios viejos (por nombre) y quita el campo viejo `quitados`.
- Avisos: `alertaEspacioAgregado`, `alertaNombreCambiado`, `alertaEspacioQuitado` (aviso v2, `src/alertas.ts`).

## Textos marcados `// LEGAL: revisar (24/10)`

- `textoQuitar(1)` y `textoQuitar(n)` (`src/espacios.ts`), textos finales de Legal.
- `TXT.bloqueado` (`src/espacios.ts`), texto final de Legal.
- `ERR.fija` = `TXT.bloqueado` + «Si algo cambió, anótalo en las fotos de salida.».
- Evento del historial «Se quitó el espacio X y se borraron sus fotos (n)» / «Se quitó el espacio X» (`src/acciones.ts` y `lk_quitar_cuarto`).
- Mensaje de `lk_error_fija()` en la migración.

## Pruebas

- Unitarias: `src/__tests__/espacios.test.tsx` (22; migración, reglas, plantillas, acciones antes y después de firmar, escape, textos exactos de Legal, avisos, mapeo, SQL y borrado de archivos con reintento y error).
- SQL: `bash scripts/espacios/probar-sql.sh`.
- Navegador: con `VITE_TRUSTLESS=1 VITE_CAVOS_APP_ID=captura-local npx vite --port 5173 --strictPort`, correr `CHROME=/usr/bin/google-chrome OUT=/tmp/esp/ node scripts/agregar-espacio/capturar.mjs` (390 y 1280 px; `GIF=1` guarda los cuadros de la celebración).
