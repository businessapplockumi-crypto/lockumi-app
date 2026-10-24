# Avisos después de cada paso

**Publicado el 23 oct 2026** en app.lockumi.com (el aviso al inicio del orden de Tab y el aviso v2 · toast se publicaron el 24 oct 2026; ver abajo): rama `contrato-plegable` unida a `master` por avance rápido desde `ad1578f` en `abdfd9b` (código `afe15ae` y `abdfd9b`, docs `2312401`); deploy de producción `dpl_ARoWYrXEBftUcz1L4NoRiQNA9N6v`. Pruebas antes de publicar: 163/163 unitarias y 855/855 del recorrido en navegador.

## Aviso v2 · toast (publicado el 24 oct 2026; rama `ux-guiada` unida a `master` con merge `--no-ff` en `1ab36ae` (master anterior `76373f8`); deploy de producción `dpl_EkFHfSn82SwL2JGvD7GmwXUGo38K`)

Aprobado por Katherine (maquetas `diseno/aviso-compacto/` y `diseno/recorrido-formulario/`). Reemplaza la tarjeta de los avisos v2 en **todos** los logros, pasos y errores:

- **Pastilla compacta de vidrio:** fondo crema al 92 % con desenfoque de 18 px (fondo sólido si el navegador no lo admite), casita completa de 32 px, título y **una línea** («Ahora: …», «Sigue: …», «Al entregar: …»). Teléfono: abajo al centro, 358 px, sobre la zona segura; si taparía la cabecera, el título, el paso o un botón principal, sube por encima del botón. Computadora: abajo a la derecha, 360 px, a 24 px del borde.
- **Botón de acción** (44 px o más) que lleva al paso: «Pagar →», «Tomar fotos →», «Ver alquiler →», «Ver detalle →». Tocar el resto del aviso lo cierra. Sin X ni «Entendido».
- **Tiempo:** 8 s con acción, 5 s sin acción, línea de 2 px; se pausa con el ratón, el dedo o el foco. **Errores:** `role="alert"`, no se esconden solos, sin línea de tiempo; el error de la red de prueba usa el texto A12 sin cambios («No se pudo completar» + «La red de prueba está lenta o no respondió. Espera un minuto y vuelve a tocar el botón.») y se quita al volver a intentar. El texto sigue escrito en la pantalla, sin `role="alert"` para no anunciarlo dos veces.
- **Logros:** zona `role="status"`, `aria-live="polite"`.
- **Pila de hasta 3** (como Sonner): el más nuevo adelante; los de atrás asoman sin texto; con el ratón, el foco o el dedo encima, la pila se abre.
- **Deslizar** de lado (un tercio del ancho o rápido) o hacia abajo (40 px) para cerrar; si no llega, vuelve a su lugar.
- **Movimiento:** entra en 320 ms (desde abajo), sale en 200 ms; con «reducir movimiento», solo un fundido de 160 ms.
- **Teclado:** el aviso sigue siendo la 2.ª parada de Tab; Enter, Espacio o Esc lo cierran; Tab pasa al botón de acción.
- Montos siempre con `usd(r.inquilino)` y `usd(r.dueno)`. Sin dependencias nuevas. No cambia el ingreso ni la lógica del escrow.

Código: `src/alertas.ts` (`linea`, `accion`, pila, `alertaErrorRed`, `quitarAvisos`), `src/Aviso.tsx` (`Tostada`, `irA`), `src/Alertas.tsx` (zonas, lugar libre, pausa), `src/index.css`, `src/screens/Detalle.tsx`. Pruebas: `src/__tests__/alertas.test.tsx`; en el navegador `scripts/aviso-v2/capturar.mjs` (nuevo), `scripts/espera-pagar/capturar.mjs` y `scripts/alertas/capturar.mjs` (adaptados a la pila).

**Líneas cortas de los demás pasos (Legal, 24 oct, 12:22 a. m.; marcadas `// LEGAL: revisado (24/10)` en `src/alertas.ts`):**

| Paso | Título | Línea |
|---|---|---|
| `crear` | Alquiler creado | **Ahora:** leer y firmar el contrato |
| `contrato-firma-inquilino` | Firmaste el contrato | **Sigue:** la firma del dueño de prueba *(sin dueño de prueba: «la firma de la otra persona»)* |
| `contrato-firma-dueno` (falta tu firma) | El dueño firmó el contrato | **Ahora:** tu firma |
| `entrada-firma-*` / `salida-firma-*` (confirmaste tú) | Confirmaste las fotos de entrada / de salida | **Sigue:** la otra persona confirma las fotos |
| `salida-inicio` | Empezaron las fotos de salida | **Ahora:** una foto de cada espacio |
| `salida-confirmada` | Fotos de salida confirmadas | **Sigue:** {textoPlazo} para hacer un reclamo (sale del alquiler, p. ej. «7 días») |
| `reclamo` | Reclamo enviado | **Sigue:** el inquilino acepta o no el reclamo |
| `mediacion` | Pasa a una persona mediadora | Demo: **En esta prueba:** decides tú el reparto (simulación). Dos personas: **Sigue:** una persona mediadora les ayuda a buscar un acuerdo |
| `reparto` | **Reparto del depósito** (antes «Reparto decidido») | {usd(r.dueno)} al dueño y {usd(r.inquilino)} al inquilino · botón «Ver detalle →» |
| `adelantar` | Plazo adelantado | **Solo en la prueba:** terminó el plazo para reclamos |

Textos largos nuevos: mediación «Una persona mediadora revisa las fotos y les ayuda a buscar un acuerdo sobre el reparto del depósito.» (en la demo, más «En esta prueba, decides tú el reparto con «Resolver el reclamo (simulación)».»); reparto «Se repartió el depósito en la red de prueba: {usd(r.dueno)} al dueño y {usd(r.inquilino)} al inquilino.»

Si la otra persona confirma las fotos antes que tú, el aviso sigue con su texto «sigue» de siempre (Legal no dio línea corta para ese caso).

## Avisos v2 (23 oct 2026)

Aprobado por Katherine (23 oct, 8:06 a. m.). Misma rama. Reemplaza el estilo del aviso. **Textos cortos aprobados por Legal el 23 oct 2026** (revisión de Legal del 23 oct 2026): «¡Depósito guardado!» y «El ingreso no terminó» (ver la tabla de abajo) y el botón «Decidir como persona mediadora» renombrado a «Resolver el reclamo (simulación)»; los demás textos no cambian.

**Decisiones confirmadas por Katherine (23 oct, 11:24 a. m.):** 1) sin botón «Continuar» / «Entendido» (desde las 11:25 a. m., tampoco X: ver «Cierre» abajo); 2) los 6 logros con llave y color verde son `ingreso`, `contrato-firmado`, `pago`, `entrada-confirmada`, `devolucion` y `acuerdo`; 3) en el teléfono, si el título queda abajo en la pantalla, la tarjeta pasa abajo para no taparlo. Publicar en producción (avisos v2 y contrato plegable) queda aprobado **solo después del OK de Legal** a los 2 textos acortados; hasta entonces no hay merge a `master`.

- **Tarjeta crema pequeña** (`src/Aviso.tsx`, CSS `.aviso-capa` / `.aviso-pop` en `src/index.css`):
  - esquinas de 26 px;
  - sin fondo borroso, no bloquea la pantalla;
  - en computadora (720 px o más): abajo a la derecha, 320 px de ancho;
  - en el teléfono: arriba, hasta 366 px. `lugarEnCelular()` la ubica **debajo del encabezado, del logo y del título** de la pantalla (primer `h1`, su `.cab` o `.entrada-app__titulo` en la entrada), así no los tapa. Si quedaría por debajo de la mitad de la pantalla, va al pie. Se recalcula al cambiar de pantalla, de tamaño y al desplazar la página (acompaña al título sin taparlo). Revisado en 375 y 390 px.
- **Ícono: la casita oficial completa** (`src/LogoAviso.tsx`). Se toma del markup literal del logo de lockumi.com (`src/logoLandingMarkup.ts`):
  - mismo `viewBox` (`419.5 65.25 420.25 408.25`), con planta, techo verde, puerta, cerradura y llave;
  - `overflow: visible` en el SVG y en la esquina, sin recortes;
  - ids propios (`aviso-casa-*`) para no chocar con el logo de la pantalla.
- **Esquina de color según el tono** (`tonoDe(alerta)` en `src/alertas.ts`):
  - **paso**: miel (colores de «pendiente»);
  - **logro**: verde (`LOGROS`: `ingreso`, `contrato-firmado`, `pago`, `entrada-confirmada`, `devolucion`, `acuerdo`);
  - **error**: terracota oscuro.
- **Animación de la llave en los logros:** la misma del logo (entra, se inserta y gira 90°, la cerradura se cierra, pulso verde), **una sola vez**, en 2 s; al final queda el logo completo y quieto. En los pasos y errores el logo está quieto y completo. Con «reducir movimiento» solo hay un fundido de 160 ms y la llave no se mueve.
- **Qué sigue** en una línea aparte: «**Lo que sigue:** …» (o «**Cómo seguir:** …» en errores), con el color del tono.
- **Cierre (aprobado por Katherine, 23 oct, 11:25 a. m.): sin X.** El aviso **se esconde solo a los 5 s** (`DURACION_AVISO`), también los errores. Se cierra antes al tocarlo o hacer clic, con Enter, Espacio o Esc. Si el dedo o el mouse está encima, o tiene el foco, el conteo se pausa y sigue donde quedó al salir. Una línea fina abajo (`.aviso-pop__tiempo`) marca el tiempo y se detiene en la pausa. Los avisos en cola salen uno tras otro. Sin botón «Continuar» / «Entendido».
- **Accesibilidad:**
  - **ya no es un diálogo**: `<Alertas />` deja siempre en la página dos zonas, `role="status"` con `aria-live="polite"` (pasos y logros) y `role="alert"` (errores), y el aviso aparece dentro de la que corresponde, así el lector de pantalla lo anuncia sin mover el foco;
  - **no roba el foco**. La tarjeta se puede enfocar con Tab (`tabindex="0"`, nombre «Aviso. Toca para cerrar», título y texto con `aria-describedby`): enfocada se pausa y Enter, Espacio o Esc la cierran; al cerrarla el foco vuelve a donde estaba (o a `#contenido`);
  - con «reducir movimiento»: solo un fundido al aparecer, sin animación de salida ni de la llave, y la línea del tiempo queda quieta;
  - **se llega con Tab antes de 5 s** *(publicado el 24 oct 2026)*: `<Alertas />` va justo después de «Saltar al contenido», así que desde el inicio de la página el aviso es la **2.ª parada de Tab** (1.º «Saltar al contenido», 2.º el aviso, antes del encabezado). Sigue sin robar el foco. Con el foco se pausa; Enter, Espacio o Esc lo cierran y el foco vuelve a donde estaba. Si el foco ya está más abajo (por ejemplo en el botón del paso), Tab sigue hacia adelante y no llega al aviso; se llega con Mayús+Tab hasta el inicio o desde «Saltar al contenido». Antes iba al final de la página; casi todo lo que dice también queda en la pantalla (líneas del paso e historial), y el error del ingreso queda escrito en Entrar (ver «Error del ingreso en Entrar»). Moverlo al inicio del DOM **no cambia cómo se ve**: `.aviso-capa` es `position:fixed`, así que el aviso sigue flotando con el mismo tamaño y lugar que en `master` (390 px: 366 px de ancho, debajo del título o abajo si el título está bajo; escritorio: 320 px abajo a la derecha) y no empuja nada. Lo verifica `scripts/espera-pagar/capturar.mjs` (capa fija, sin X ni «Entendido», casita completa, tamaño y lugar como en `master`, nada se mueve al cerrarse) y una prueba unitaria en `src/__tests__/espera-pago.test.tsx`. Con el foco de Tab el aviso muestra el anillo de foco (borde rojo); eso no es la tarjeta vieja;
  - contraste AA en todos los textos (el más justo, verde `#2E7347` sobre `#E3F2E8`, 4,95:1).
- **«Tomar foto»** (`src/Camara.tsx`): el emoji 📷 se cambió por el ícono de cámara de la app (`i-camara`).

Capturas reales (localhost, sesión simulada): `capturas/alertas-v2-*.png`. Imágenes livianas y GIF de la llave: `diseno/envio/alertas-v2-implementado/`. GIF del cierre solo (celular y computadora): `diseno/envio/alertas-v2-autocierre/aviso-se-esconde-solo.gif`.

**Decisiones pendientes (Katherine):** 1) ~~el error del ingreso solo se ve en el aviso~~ **resuelto el 23 oct** (queda escrito en Entrar, ver abajo); 2) el enlace «Entrar con mi correo» de la maqueta no se agregó (tocar el aviso lo cierra; un enlace dentro chocaría con eso); 3) se quitó «en esta misma pestaña» del texto (decisión de Producto según Legal); 4) ~~llegar con Tab antes de 5 s~~ **propuesto en la rama `aviso-tab`** (pendiente del OK de Katherine para publicar). Siguen sin agregarse «Entrar con mi correo» ni «en esta misma pestaña».

### Error del ingreso en Entrar (aprobado por Katherine, 23 oct, 11:49 a. m.)

Si el regreso de Google o Apple no termina, además del aviso de 5 s (igual que antes), la pantalla **Entrar** muestra el mismo texto escrito, arriba del botón «Entrar»: **«El ingreso no terminó» · «Toca Entrar y elige tu cuenta.»** (textos de Legal). **No se va solo:** se borra cuando la persona vuelve a tocar «Entrar» o cuando entra bien. Accesible: el recuadro (`#error-ingreso`) está enlazado al botón con `aria-describedby`, así el lector lo lee al llegar al botón; no lleva `role="alert"` propio porque el aviso ya se anuncia desde la zona `role="alert"` (se evita leerlo dos veces). Código: `src/screens/Login.tsx` (`error`, `onReintento`), `src/App.tsx` (estado `regreso`), `.entrada-app__error` en `src/index.css`. Pruebas: `alertas.test.tsx` («error del ingreso escrito en Entrar») y el recorrido `capturar.mjs` (el texto sigue después de que el aviso se va, y desaparece al tocar Entrar).

### Ingreso más rápido: pantalla «Entrando a tu cuenta…» (23 oct)

Katherine notó que la pantalla Entrar tardaba en irse y «¡Ingresaste correctamente!» salía tarde. **Causa (medida):** al volver de Google o Apple, la app mostraba **Entrar** (con sus botones) mientras cargaba el módulo de ingreso de Cavos (unos 620 KB) y luego confirmaba la sesión con Cavos (`/api/oauth/callback/exchange`, 0,34–0,54 s reales). Recién entonces cambiaba de pantalla y salía el aviso (los dos a la vez). El saldo y la recarga de la cuenta **no frenan** el cambio: se cargan después, ya en Inicio. **Arreglo (sin tocar la lógica de cuentas ni del servidor):** si la dirección trae la vuelta de Google o Apple (`hayRegreso()` en `src/services/auth.ts`), desde el primer cuadro se ve **«Entrando a tu cuenta…»** con la casita y la llave (`Entrando` en `Login.tsx`, `aria-busy="true"`, texto en `role="status"`; con «reducir movimiento» la llave queda quieta). El aviso sigue saliendo apenas se confirma la sesión, junto con Inicio. Si falla, vuelve a Entrar con el error escrito.

Medido con Playwright y `performance` (build de producción, intercambio simulado de 5 ms; «lento» = CPU ×4 y red 3G rápida; promedio de 3), en ms desde que empieza la carga:

| Paso | Antes, rápido | Después, rápido | Antes, lento | Después, lento |
|---|---|---|---|---|
| Primera pantalla | Entrar ~200 | «Entrando…» ~75 | Entrar ~700 | «Entrando…» ~635 |
| Módulo de Cavos cargado | ~300 | ~130 | ~1295 | ~1190 |
| Empieza la confirmación de la sesión | ~350 | ~210 | ~1560 | ~1440 |
| Sesión confirmada → Inicio y aviso | ~380 | ~240 | ~1585 | ~1520 |
| Tiempo con **Entrar** a la vista | ~180 (+0,34–0,54 s reales) | **0** | ~885 (+0,4–0,5 s reales) | **0** |

Con la confirmación real se suman 0,34–0,54 s a las dos últimas filas. Lo que queda (cargar el módulo de Cavos y confirmar con Cavos) no se acorta sin tocar la lógica del ingreso; está fuera de este cambio. Scripts: `diseno/ingreso-tiempos/` (fuera del repo).

## Por qué no se veían

1. **Había un solo aviso emergente**, «¡Ingresaste correctamente!» (`src/Aviso.tsx`, desde `000cb43`, 16 oct). `App.tsx` lo muestra solo dentro de `entro()`, es decir, **justo después de entrar** (login con correo, o el regreso de Google o Apple que procesa `auth.completarRegreso()`). La sesión queda guardada en el navegador (`lockumi.usuario`), así que al volver a la app no se entra de nuevo y el aviso no aparece. Está publicado: el texto está en el paquete de producción (`index-BVqVWzj6.js`).
2. **El aviso de error «Tu cuenta no está lista»** de `Billetera.tsx` se quitó el 17 oct en `19290e1` («Inicio: la tarjeta de la cuenta nunca muestra un error»).
3. **Nunca hubo avisos después de cada paso.** Los pasos solo mostraban líneas dentro de la pantalla (`.ahora`, «✓ El dueño de prueba firmó…», el historial).
4. **Si el regreso de Google o Apple fallaba, no se veía nada:** `completarRegreso().catch(() => {})` tragaba el error.

## Qué cambia

- `src/alertas.ts`: cola de avisos (`avisar`, `cerrarAlerta`) y textos. `alertaPorCambio(antes, ahora, rol)` compara el alquiler antes y después de cada cambio y devuelve el aviso del paso. Así también avisa cuando el dueño de prueba firma o confirma solo.
- `src/Alertas.tsx`: muestra el primer aviso de la cola (en `App.tsx`, con y sin sesión).
- `src/Aviso.tsx` (22 oct; **reemplazado por los avisos v2**, ver arriba):
  - `role="dialog"`, o `alertdialog` para los errores, con `aria-modal`, `aria-labelledby` y `aria-describedby` (ids únicos con `useId`; antes eran fijos);
  - el foco va al botón principal, Tab y Shift+Tab quedan dentro (X y botón; antes Tab solo volvía al botón), Esc o la X cierran y el foco vuelve a donde estaba o, si ese botón ya no existe, al contenido;
  - el efecto ya no se repite en cada render;
  - ícono del sprite de la app dentro del aro animado;
  - con «reducir movimiento» no hay animaciones;
  - entra desde abajo en celular y centrado en escritorio.
- Disparadores:
  - `Crear.tsx`: después de crear;
  - `Detalle.tsx`: efecto con `instantanea()`;
  - `App.tsx`: al entrar y si falla el regreso de Google o Apple.
- Los errores de cada paso **siguen en la pantalla** con cómo arreglarlos (no cambian).
- **Arreglo:** `.turno[hidden]{display:none}`. La caja «Te toca / Al dueño / Qué sigue» tiene `hidden={modoVideo}`, pero `.turno{display:grid}` le ganaba y se veía en el modo de una persona.
- Sin dependencias nuevas. Solo variables de color existentes. También se quitó un `i-chevron` repetido en el sprite de `index.html`.

## Textos (modo de una persona en la red de prueba, como app.lockumi.com)

Los marcados `// LEGAL: revisar` en `src/alertas.ts` son los del depósito guardado, el plazo para reclamos, el plazo adelantado, el reclamo, la mediación, la devolución, el reparto y el reclamo aceptado.

| Paso | Clave | Título | Qué pasó | Qué sigue |
|---|---|---|---|---|
| Crear alquiler | `crear` | Alquiler creado | Guardamos el alquiler de Apartamento en Barreal de Heredia con un depósito de 20 USDC. | Lo que sigue: Leer el contrato y firmarlo. Después lo firma el dueño de prueba. |
| Firma del inquilino | `firma-inquilino` | Firmaste el contrato | La firma quedó guardada con la fecha y la hora. | Lo que sigue: El dueño de prueba lo firma solo, en unos segundos. |
| Firma del dueño de prueba (contrato firmado por los dos) | `firma-dueno` | Contrato firmado por los dos | El dueño de prueba también firmó. El contrato ya tiene las dos firmas. | Lo que sigue: Pagar el depósito de 20 USDC. |
| Pagar el depósito | `pago` | ¡Depósito guardado! | 20 USDC guardados en una cuenta segura de la red de prueba. Ni el dueño ni el inquilino pueden sacarlos solos. *(Legal, 23 oct; cambiado por Legal el 24 oct, ronda 3)* | Lo que sigue: Tomar las fotos de entrada de cada espacio y marcar la lista. |
| Fotos y lista de entrada: confirma el inquilino | `entrada-inquilino` | Confirmaste las fotos de entrada | Las fotos y la lista quedaron guardadas con la fecha y la hora. | Lo que sigue: El dueño de prueba las revisa y las confirma solo, en unos segundos. |
| Fotos de entrada: confirma el dueño de prueba | `entrada-dueno` | Empezó el alquiler | Los dos confirmaron las fotos de entrada. El depósito sigue guardado. | Lo que sigue: Cuando entregues el lugar, toca «Empezar fotos de salida». |
| Empezar fotos de salida | `salida-inicio` | Empezaron las fotos de salida | Ya pueden registrar cómo quedó el lugar. | Lo que sigue: Tomar una foto de cada espacio, marcar la lista y confirmar. |
| Fotos de salida: confirma el inquilino | `salida-inquilino` | Confirmaste las fotos de salida | Las fotos y la lista quedaron guardadas con la fecha y la hora. | Lo que sigue: El dueño de prueba las revisa y las confirma solo, en unos segundos. |
| Fotos de salida: confirma el dueño de prueba | `salida-dueno` | Fotos de salida confirmadas | Los dos confirmaron las fotos de salida. Empiezan los 7 días para reclamos. | Lo que sigue: Si el dueño de prueba no reclama en 7 días, el depósito vuelve al inquilino. En esta prueba puedes adelantar el plazo o hacer un reclamo en nombre del dueño de prueba. |
| Solo red de prueba: adelantar el plazo | `adelantar` | Plazo adelantado | Solo en la red de prueba: terminamos ahora los 7 días para reclamos. | Lo que sigue: El dueño de prueba aprueba y Lockumi devuelve el depósito al inquilino en la red de prueba. Tarda entre 20 y 60 segundos. |
| Devolución automática (sin reclamos) | `devolucion` | Depósito devuelto | No hubo reclamos en 7 días. El dueño de prueba aprobó y Lockumi devolvió 19,94 USDC al inquilino en la red de prueba. | Lo que sigue: El alquiler terminó. No tienes nada pendiente. |
| Reclamo del dueño de prueba | `reclamo` | Reclamo enviado | El dueño de prueba reclamó 5 USDC del depósito. | Lo que sigue: El inquilino acepta o no el reclamo. Si no lo acepta, pasa a una persona mediadora (simulación). |
| No estoy de acuerdo → mediación | `mediacion` | Pasa a una persona mediadora | No hubo acuerdo con el reclamo. En esta prueba la persona mediadora es una simulación. | Lo que sigue: Una persona mediadora revisa las fotos y les ayuda a buscar un acuerdo sobre el reparto del depósito. En esta prueba, decides tú el reparto con «Resolver el reclamo (simulación)». *(Legal, 24 oct)* |
| Reparto de la persona mediadora (simulación) | `reparto` | Reparto del depósito | Se repartió el depósito en la red de prueba: 2,4925 USDC al dueño y 17,4475 USDC al inquilino. *(Legal, 24 oct)* | Lo que sigue: El alquiler terminó. No tienes nada pendiente. |
| Aceptar reclamo | `acuerdo` | Reclamo aceptado | Se repartió el depósito en la red de prueba: 4,985 USDC al dueño y 14,955 USDC al inquilino. | Lo que sigue: El alquiler terminó. No tienes nada pendiente. |
| Entrar (el regreso de Google o Apple no terminó) | `ingreso-fallo` | El ingreso no terminó | Toca Entrar y elige tu cuenta. *(Legal, 23 oct)* | — |
| Entrar (correcto) | `ingreso` | ¡Ingresaste correctamente! | Te damos la bienvenida a la demo. Desde aquí puedes ver tus alquileres y crear un depósito protegido. | — |

En el modo real (app.lockumi.com) el aviso de ingreso dice «Estamos preparando tu billetera.» en lugar de «Te damos la bienvenida a la demo.». El texto no cambió.

Montos: los de devolución y reparto ya vienen con la comisión de la red de prueba (0,3 %), igual que la pantalla «Depósito devuelto».

## Pruebas

- `src/__tests__/alertas.test.tsx` (21 pruebas; v2: sin diálogo ni X, zonas `status` / `alert`, cierre solo a los 5 s con pausa, toque, Enter, Espacio y Esc, textos de Legal, casita completa con el `viewBox` del logo, CSS de 26 px / 320 / 366 px, llave una sola vez, movimiento reducido, tonos e ícono de «Tomar foto»):
  - el componente (zonas, nombre, ids, sin X, pausa, ícono, movimiento reducido);
  - la cola;
  - cada paso con las acciones reales de la demo;
  - textos sin emojis, sin «liberado» y sin palabras técnicas;
  - marcas `LEGAL`;
  - CSS de `.turno[hidden]`.
- `scripts/alertas/capturar.mjs`:
  - recorre los tres caminos (sin reclamos, mediación y reclamo aceptado) en 390 y 1280 px, con la sesión simulada y `/api/solo` respondido en el script; bloquea Stellar y Cavos;
  - revisa cada aviso: título, zona `status` o `alert` (sin diálogo), que no robe el foco, nombre «Aviso. Toca para cerrar» y sin X; lo cierra por turnos tocándolo, con Esc, enfocándolo (pausa: con mouse o foco encima no se esconde) + Enter con el foco de vuelta, o dejándolo esconderse solo (entre 5 y 7 s); que en el teléfono no tape el encabezado ni el título, la casita completa, tamaño y emojis;
  - guarda `capturas/alertas-preview-<paso>-{movil,escritorio}.png`.

  Uso: `VITE_CAVOS_APP_ID=… OUT=…/alertas-preview- CHROME=/usr/bin/google-chrome node scripts/alertas/capturar.mjs`, con Vite en 5173 (con `VITE_TRUSTLESS=1` y `VITE_CAVOS_APP_ID`) y en 5174 (solo `VITE_TRUSTLESS=1`, para el ingreso simulado).

## Textos de mediación revisados por Legal (24 oct 2026, rama `contrato-compacto`, sin publicar)

Regla: la persona mediadora **ayuda** a buscar un acuerdo; **no decide**. Reemplazan los textos de producción que decían que la persona mediadora «decide». Los avisos de esta página ya cumplían la regla y no cambian.

| Dónde | Texto nuevo |
|---|---|
| Contrato, «Mediación» (`src/screens/ContratoDoc.tsx`; también en «Descargar o imprimir» y en el panel del contrato compacto) | «Si no se ponen de acuerdo, una persona mediadora revisa con ustedes las fotos de entrada y de salida y les ayuda a buscar un acuerdo sobre el reparto del depósito. No decide por ustedes.» En la prueba se agrega: «En esta prueba, la mediación es una simulación y el reparto se elige con el botón «Resolver el reclamo (simulación)».» |
| Reclamo del dueño, inquilino (`src/screens/Detalle.tsx`) | «… Si no estás de acuerdo, una persona mediadora revisa las fotos con ustedes y les ayuda a buscar un acuerdo.» |
| Pantalla de mediación (`src/screens/Detalle.tsx`) | «No hubo acuerdo. Una persona mediadora revisa con ustedes las fotos de entrada y salida y les ayuda a buscar un acuerdo sobre el reparto.» |
| «Sigue» del reclamo, inquilino (`src/flujo.ts`) | «Si lo rechazas, una persona mediadora les ayuda a buscar un acuerdo.» |
| «Sigue» del reclamo, dueño (`src/flujo.ts`) | «Si lo rechaza, una persona mediadora les ayuda a buscar un acuerdo.» |
| «Sigue» de la mediación (`src/flujo.ts`) | «La persona mediadora les ayuda a acordar cómo se reparte el depósito.» |
| Línea «Ahora» de la prueba en mediación (`src/flujo.ts`) | «Ahora toca la mediación (simulada). En esta prueba, el reparto lo decides tú con el botón de abajo.» |

Cada uno lleva `// LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide`. Pruebas: `src/services/__tests__/flujo.test.ts` («mediación: la persona mediadora ayuda, no decide»), `src/screens/__tests__/contrato-compacto.test.tsx` («Mediación en el contrato») y `contrato-plegable.test.tsx`; el script `scripts/contrato-plegable/capturar.mjs` revisa el PDF.

## Legal, ronda 2 (24 oct 2026, rama `contrato-compacto`, sin publicar)

Legal revisó `c5d713e` (los 7 textos de arriba quedan aprobados) y pidió quitar los «decide» que quedaban y la promesa «ni Lockumi». Cada cambio lleva `// LEGAL: revisado (24/10)`.

| Dónde | Antes | Ahora |
|---|---|---|
| Contrato, «El depósito» (`src/screens/ContratoDoc.tsx`; también en «Descargar o imprimir» y en el panel del contrato compacto) | «Nadie puede tomarlo solo: ni el dueño, ni el inquilino, ni Lockumi.» | «Ni el dueño ni el inquilino pueden tomarlo solos. En esta prueba, si hay un reclamo, la cuenta de Lockumi es la que ejecuta el reparto que se elige en la simulación.» |
| Botón de la persona mediadora, dos personas con servidor (`src/screens/Detalle.tsx`) | «Decidir como mediador» | «Registrar el acuerdo» |
| Botón de la persona mediadora, demo local sin red (`src/screens/Detalle.tsx`) | «Demo: decidir como mediador» | «Demo: registrar el acuerdo» |
| Botón que confirma el reparto, fuera de la prueba de video (`src/screens/Detalle.tsx`) | «Decidir» | «Registrar el acuerdo» |
| Espera en la mediación (`src/screens/Detalle.tsx`) | «… Te avisaremos cuando haya una decisión.» | «… Te avisaremos cuando haya un acuerdo.» |
| Comprobante del paso `resolucion` (`src/services/comprobantes.ts`) | «Reparto del depósito según la decisión» | «Reparto del depósito» |
| Historial, demo local (`src/acciones.ts`) | «La persona mediadora decidió: … al dueño y … al inquilino» | «Acuerdo registrado: … al dueño y … al inquilino» |
| Términos 6.7 (`src/legal/terminos.md`, versión 1.5-demo → **1.6-demo**, 24 oct 2026) | «… pasa a una persona mediadora **simulada** que decide un reparto simulado …» | texto exacto de Legal (ver `src/legal/LEEME.md`) |

app.lockumi.com (modo de una persona) muestra «Resolver el reclamo (simulación)» y «Confirmar el reparto», que no cambian.

**Sin cambiar (para Legal):**
- `src/screens/Detalle.tsx`, nota del modo de una persona: «La persona mediadora es simulada: su decisión no se registra en la red de prueba ni mueve el depósito de prueba.» Pendiente de un texto de Legal.
- `supabase/migrations/20261017000000_lockumi_e2e.sql` (versión con servidor, no activa en app.lockumi.com): «Solo una persona mediadora puede decidir.» y «La persona mediadora decidió: …». No se editó: el repositorio no deja constancia de si se aplicó al proyecto de Supabase (`scripts/aplicar-supabase-e2e.mjs`). Si se aplicó, hace falta una migración nueva con `create or replace function` para `lk_decidir_mediacion`; si no, se puede editar este archivo. `scripts/probar-esquema.mjs` sigue esperando el texto actual.
- La frase «nadie puede tomarlo/sacarlos solo» de otros textos (avisos, recorrido, Detalle, Real, Login, README) y la página de inicio (`lockumi/landing`): lista para Legal en el informe de la ronda 2; no se tocaron. *(Cambiados en la ronda 3, salvo la página de inicio; ver abajo.)*

Pruebas: `src/screens/__tests__/contrato-compacto.test.tsx` («ronda 2 de Legal…»), `contrato-plegable.test.tsx` y `src/legal/__tests__/casillas.test.tsx` (versión 1.6-demo, 6.7 exacta, la aceptación de Términos 1.5-demo ya no cuenta).

### [Servicio real]

Aprobada por Legal solo para un servicio real o una versión de producción. **No se muestra en la demo.**

> Si después de la mediación no hay acuerdo, el depósito sigue guardado y cualquiera de las dos partes puede acudir a los tribunales de Costa Rica. El depósito se reparte según el acuerdo al que lleguen después o según lo que resuelva la autoridad.

## Legal, ronda 3 (24 oct 2026, rama `contrato-compacto`, sin publicar)

**Nota de la mediación (modo de una persona, `src/screens/Detalle.tsx`).** El reparto que se elige con «Resolver el reclamo (simulación)» **sí se ejecuta en la red de prueba**: `acciones.decidir` → `escrow.resolver` (`src/services/escrow.ts`, `escrowReal ? real : simulado`) → `/api/solo` «resolver» → `resolve-dispute` firmado por la cuenta de plataforma de Lockumi (`api/_lib/solo.ts`, caso `resolver`). Por eso la nota pasa a ser:

> La mediación es simulada: el reparto que elijas se ejecuta con tokens de prueba, sin valor.

Esa nota solo se ve en el modo de una persona (`VITE_FLUJO=solo`). app.lockumi.com muestra la nota de la demo en vivo, que no cambia. Para Legal (sin cambiar): las notas del mismo modo «El reclamo y la mediación no se registran en la red de prueba» y «El reclamo es simulado: no se registra en la red de prueba…» no coinciden con el código, porque `acciones.reclamar` abre la disputa en la red de prueba (`escrow.disputar`).

**Mensajes de la versión con servidor.** No consta en el repositorio si `20261017000000_lockumi_e2e.sql` se aplicó al proyecto de Supabase. Por eso no se editó; la nueva migración `supabase/migrations/20261024120000_lk_mediacion_acuerdo.sql` reemplaza `lk_decidir_mediacion` (misma lógica y permisos) con los mensajes «Solo la persona mediadora puede registrar el acuerdo.» y «Acuerdo registrado: …». No se cruza con `20261024000000_lk_espacios.sql` de la rama `agregar-espacio`: esa migración no redefine `lk_decidir_mediacion` ni `lk_evento`. `scripts/probar-esquema.mjs` comprueba los dos textos.

**«Nadie puede…» → «Ni el dueño ni el inquilino…»** (texto exacto de Legal; la página de inicio no cambia):

| Dónde | Texto nuevo |
|---|---|
| Aviso «¡Depósito guardado!» (`src/alertas.ts`), con red / sin red | «… Ni el dueño ni el inquilino pueden sacarlos solos.» / «… Ni el dueño ni el inquilino pueden tomarlo solos.» |
| Detalle, notas del depósito (cuenta propia y USDC de Lockumi) | «Ni el dueño ni el inquilino pueden sacarlos solos.» |
| Detalle, alquiler en curso | «El depósito sigue guardado y ni el dueño ni el inquilino pueden tomarlo solos.» |
| Pago en la red de prueba (`Real.tsx`) | «Ni el dueño ni el inquilino pueden tomarlos solos.» |
| Entrar, beneficio «Tu depósito queda guardado» (solo el texto) | «Ni el dueño ni el inquilino pueden liberarlo solos.» |
| Recorrido, «Firmas y depósito» | «Ni el dueño ni el inquilino lo pueden sacar solos.» |
| README, «Depósito protegido» | «ni el dueño ni el inquilino pueden liberar el dinero por su cuenta; en la demo, si hay un reclamo, la cuenta de Lockumi ejecuta el reparto» |

**Devolución automática (sin cambiar).** Cuando terminan los 7 días sin reclamo, ninguna persona aprueba, pero firma el servidor de Lockumi: la app abierta llama a `cerrarSinReclamo` (`Detalle.tsx`, efecto al llegar a 0) → `escrow.devolver` → `/api/solo` «aprobar» (firma la cuenta del dueño de prueba, con llave en el servidor de Lockumi) y «liberar» (firma la cuenta de plataforma de Lockumi). No hay tarea programada (`vercel.json` sin crons): si nadie abre la app, no se libera.

**Términos 1.6-demo (misma versión y fecha, 24 oct 2026).** 4.1 a) cambia «Lockumi no custodia tus tokens de prueba» por el texto de Legal: «Lockumi no guarda tus tokens de prueba en una cuenta propia: quedan en un contrato de escrow en la red de prueba. Si hay un reclamo, la cuenta de Lockumi puede ejecutar el reparto.» **5.3 (Cavos) no cambia:** según la documentación del vault de Cavos, dentro de los límites de la app (por omisión 25 USDC por transacción y 100 por día; 100 XLM y 500 por día) el vault firma pagos **sin preguntar** cuando lo pide el código de la página, así que el código web de Lockumi podría mover fondos de la billetera hasta esos límites sin que la persona lo vea. El servidor de Lockumi no tiene llaves de la billetera de nadie. 5.4 no cambia.

Pruebas: `src/__tests__/alertas.test.tsx`, `recorrido.test.tsx`, `src/legal/__tests__/casillas.test.tsx` (4.1 a) nueva, 5.3 igual, beneficio de Entrar), `contrato-compacto` y `contrato-plegable`; `node scripts/probar-esquema.mjs`.
