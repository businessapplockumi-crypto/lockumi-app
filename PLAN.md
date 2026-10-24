# Lockumi · Demo de la app web — Plan

> **Documento histórico (fases 1 y 2, 16 oct 2026).** No describe lo que hace hoy app.lockumi.com. Hoy la app corre en la red de prueba de Stellar (testnet) con escrow real de Trustless Work y USDC de prueba en cada paso, login real con Cavos, una sola persona (tú eres el inquilino y el dueño es un dueño de prueba de Lockumi) y sin selector «Ver la demo como». Las fechas se escriben dd/mm/aa (también dd/mm/aaaa). El rendimiento con Blend **no está activo** y nunca sería garantizado. Las invitaciones por correo o link y el modo de dos personas son **próximamente**. El estado actual está en el [README](README.md).

## Estado actual (20 oct 2026)

- **Repositorio (23 oct 2026):** el repositorio de la app pasó a la organización de GitHub **`lockumi`**: https://github.com/lockumi/lockumi-app (público, rama por defecto `master`). Los enlaces y el `git` de la dirección anterior (`businessapplockumi-crypto/lockumi-app`) redirigen a la nueva. El repositorio de la landing, `lockumi-landing`, **sigue privado en `businessapplockumi-crypto`** y no se mueve. El CI volvió a verde el 23 oct: faltaba en `package-lock.json` la entrada opcional `typescript@5.9.3` que exige `npm ci` con npm 10 (Node 22).
- **Íconos de la app (23 oct 2026, publicado en producción el 23 oct 2026 desde `master` 46199cc, deploy `dpl_83nhyLjh1Ey17RzMjiCEC5LFjFQh`):** `public/` ahora trae el isotipo de Lockumi en `favicon.ico` (16/32/48), `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` (180, fondo crema `#FFF5EE`), `icon-192.png`, `icon.png` (512) y un `manifest.webmanifest` mínimo; `index.html` los enlaza. Antes solo había el `favicon.svg` de ejemplo de Vite.
- **Publicado el 20 oct 2026 (código `d42e91b`, `master` en `3e044e4`; deploy `dpl_2831CmooXSLZpsH9yKhFTh5quDCe`):** «Tus alquileres» con un color por estado (pendiente miel, en curso salvia, reclamo o mediador terracota, terminado arena; solo tonos que ya existían), «qué te toca» en cada tarjeta, los 3 pasos arriba y «Tu cuenta para el depósito» con los mismos colores (misma lógica). Probado con 4 alquileres reales en testnet.
- **Nuevo alquiler** rediseñado: tarjetas de USDC de prueba («USDC de prueba de Lockumi», hasta 20, o «Usar mi propio USDC de prueba», hasta el saldo y como máximo 50 000), depósito con − y +, y **Entrada y Salida lado a lado** (también en celular) con calendarios de react-day-picker 10 en `<dialog>` (hoja inferior en celular, ventanita en escritorio).
- **Términos y Aviso de privacidad 1.5-demo** (20 oct 2026).
- **Depósito con el USDC de Lockumi:** antes de crear la cuenta segura, la cuenta de prueba se recarga siempre hasta el monto (arreglo del error «Tu cuenta tiene 0 USDC de prueba…»).
- **Publicado el 20 oct 2026 (commit `1483e31`, `master` en `4e6245a`; deploy `dpl_8Vcp5XCRTfb9nw2pVpafeJrXfBiz`):** el error «Tu cuenta tiene 0 USDC de prueba…» que seguía saliendo con sesión de Google venía de una pestaña abierta antes de publicar la recarga (versión vieja de la app). Ahora el servidor completa la cuenta de prueba al crear la cuenta segura (`origen: 'lockumi'` + identificador) y, a una pestaña vieja, le pide recargar la página. Probado en testnet con sesión de Cavos simulada: cuenta nueva y cuenta reutilizada en 0 llegan al depósito; sin sesión sigue funcionando.
- **Sección «Contrato»** siempre visible en el detalle, con firmas (fecha y hora) y «Descargar o imprimir».
- **Publicado el 23 oct 2026 (rama `contrato-plegable`, `master` en `abdfd9b`; deploy `dpl_ARoWYrXEBftUcz1L4NoRiQNA9N6v`):** contrato plegable. El resumen (estado, referencia, «El alquiler», «Partes» y pie), «Descargar o imprimir», la casilla y «Firma como inquilino» se ven siempre; Reglas, El depósito, 7 días para reclamos, Mediación y Firmas quedan tras «Ver contrato completo» (empieza cerrado cada vez). Imprimir siempre da el contrato completo. Sin cambios en textos legales. Ver [`docs/contrato-plegable.md`](docs/contrato-plegable.md).
- **Publicado el 23 oct 2026 (rama `contrato-plegable`, `master` en `abdfd9b`; deploy `dpl_ARoWYrXEBftUcz1L4NoRiQNA9N6v`):** avisos después de cada paso (qué pasó y qué sigue), aviso de error si el regreso de Google o Apple no termina, y arreglo de la caja «Qué toca ahora» que se veía en el modo de una persona. **23 oct: avisos v2** (tarjeta pequeña con la casita completa, debajo del encabezado en el teléfono, llave que gira una vez en los logros; «Tomar foto» con el ícono de la app). **23 oct, 11:25 a. m.:** sin X; el aviso se esconde solo a los 5 s (pausa con dedo, mouse o foco; se cierra al tocarlo, Enter, Espacio o Esc), sin diálogo y sin robar el foco. **Legal dio el OK (23 oct)** a «¡Depósito guardado!», «El ingreso no terminó» y al botón «Resolver el reclamo (simulación)». Ver [`docs/alertas.md`](docs/alertas.md). **23 oct, 11:24 a. m.:** Katherine confirmó quitar «Continuar»/«Entendido», los 6 logros con llave y la tarjeta abajo en el teléfono si el título queda abajo; publicar queda aprobado tras el OK de Legal a los 2 textos acortados. 23 oct: el error del ingreso queda escrito en Entrar hasta reintentar o entrar, y al volver de Google o Apple se ve «Entrando a tu cuenta…» en lugar de Entrar.
- **Publicado el 24 oct 2026 (aviso al alcance de Tab; rama `ux-guiada` unida a `master` con merge `--no-ff` en `1ab36ae` (master anterior `76373f8`); deploy de producción `dpl_EkFHfSn82SwL2JGvD7GmwXUGo38K`):** el aviso de 5 s es la 2.ª parada de Tab (justo después de «Saltar al contenido»), sin robar el foco; con el foco se pausa y Enter, Espacio o Esc lo cierran.
- **Publicado el 24 oct 2026 (rama `ux-guiada` unida a `master` con merge `--no-ff` en `1ab36ae` (master anterior `76373f8`); deploy de producción `dpl_EkFHfSn82SwL2JGvD7GmwXUGo38K`):** estado de espera v2 del paso «Pagar»: «Guardando tu depósito…» con la casita, nota «Esto tarda unos segundos. No cierres la app.», pasos reales Firmando · Enviando · Guardado en tres verdes, error que no se esconde con «Volver a intentar el pago». Incluye el aviso al alcance de Tab de `aviso-tab`. Detalle: [`docs/estado-espera.md`](docs/estado-espera.md).
- **Publicado el 24 oct 2026 (rama `ux-guiada` unida a `master` con merge `--no-ff` en `1ab36ae` (master anterior `76373f8`); deploy de producción `dpl_EkFHfSn82SwL2JGvD7GmwXUGo38K`):** aviso v2 · toast (pastilla de vidrio abajo, botón de acción, pila de 3, deslizar para cerrar, error de red A12 sin esconderse). También publicados: el recorrido guiado con driver.js ([`docs/recorrido.md`](docs/recorrido.md)) y los textos cortos aprobados por Legal el 24/10. **Pendiente:** el formulario «Nuevo alquiler» de una pregunta por pantalla (en desarrollo, no publicado). Ver [`docs/alertas.md`](docs/alertas.md).
- **Probado en producción (24 oct 2026, app.lockumi.com, 390 y 1280 px, sesión de demostración demo@lockumi.com sin login real de Cavos; `/api/solo` respondido por el script, sin tocar la red):** recorrido 97 ✓ (sale solo la primera vez con localStorage limpio, no sale al recargar, «¿Cómo funciona?» lo vuelve a abrir), espera del pago 84 ✓ y aviso v2 21 ✓. Imagen: `diseno/envio/ux-guiada/produccion.jpg`.
- ~~**Pendiente de Legal antes de usar dinero real:** cambiar «La persona mediadora (simulación) decidió…» del aviso `reparto`.~~ **Cerrado el 24 oct 2026 (rama `ux-guiada`):** Legal aprobó «Reparto del depósito» y «Se repartió el depósito…: {usd(r.dueno)} al dueño y {usd(r.inquilino)} al inquilino», la línea y el texto largo nuevos de la mediación (ayuda a buscar un acuerdo; no decide) y las líneas cortas de los 11 pasos del aviso v2. Detalle: `docs/alertas.md`.
- **Cerrado el 24 oct 2026 (rama `ux-guiada`):** la tarjeta de Inicio dice «Pagar el depósito · Luego, fotos de entrada» en vez de «Depósito protegido» (Legal). «Depósito guardado» solo se usa cuando ya está pagado.
- **Pendiente de Legal:** todavía dicen que la persona mediadora «decide» `src/flujo.ts` (línea «sigue» de mediación), el texto de la mediación en `src/screens/Detalle.tsx` y el contrato (`src/screens/ContratoDoc.tsx`). El aviso de ingreso dice «crear un depósito protegido». No se cambian sin el OK de Legal.
- **Historial:** «Alquiler creado» (ya no dice que se envió una invitación).
- **Resend:** dominio `lockumi.com` verificado y DNS listos para el correo de invitación de la Parte 4, que **no está activa**. Ver [`docs/correo-resend.md`](docs/correo-resend.md).
- Próximamente: dos personas reales con invitación por correo o link (Parte 4). El rendimiento con Blend no está activo.


Demo navegable (no se publica en lockumi.com). Vite + React + TypeScript, estado en localStorage con datos de ejemplo ficticios, rutas con hash (`#/…`) para desplegar como sitio estático. Estilo y tokens "Terracota viva" copiados de la landing (Inter para texto, Nunito para títulos, glass, chips verdes).

## Pantallas
1. **Entrar** (`#/` sin sesión) — pantalla con logo, 3 beneficios y botón «Entrar»; hoja de acceso con Google, Apple o correo + código de 6 dígitos (simulado, Cavos). Sin billetera ni frase semilla. El rol sale de cada alquiler (quien crea = dueño; invitado = inquilino). ✅ v3
2. **Tus alquileres** (`#/`) — lista de alquileres con estado, monto y fechas; selector de rol en la barra. ✅ Fase 1 · Desde el 20 oct 2026: un color por estado (`src/estados.ts`), «qué te toca», 3 pasos arriba y la tarjeta «Tu cuenta para el depósito» con los mismos colores.
3. **Nuevo alquiler** (`#/crear`) — monto del depósito, fechas de entrada y salida, reglas (lista), correo del inquilino. ✅ Fase 1
4. **Detalle / línea de tiempo** (`#/alquiler/:id`) — datos, reglas e historial. ✅ Fase 2 (línea de tiempo con todos los estados, datos e historial)
5. **Acta de entrada** — fotos + checklist por cuarto, de ambas partes; firmas simuladas con fecha y hora. ✅ Fase 2
6. **Pago del depósito** — el inquilino paga; queda "apartado" en escrow; mensaje: nadie lo libera solo. ✅ Fase 2
7. **Rendimiento opcional** — interruptor USDC (Blend); VARIABLE y NO GARANTIZADO; reparto 40% inquilino / 40% dueño / 20% Lockumi; sin tasa fija (cualquier número va marcado como "ejemplo"). ✅ Fase 2
8. **Acta de salida** — fotos + checklist, comparación lado a lado con la entrada. ✅ Fase 2
9. **Ventana de reclamo** — 7 días con cuenta regresiva; sin reclamo, el depósito vuelve solo al inquilino; botón "simular paso de 7 días". ✅ Fase 2
10. **Reclamo** — el dueño presenta fotos y monto; el inquilino acepta o rechaza. ✅ Fase 2
11. **Mediación** — el mediador decide el reparto; mensaje: la mayoría de los casos se resuelve en la app, la mediación es solo para pocos. ✅ Fase 2

## Simulado vs. real
| Pieza | Estado | Archivo |
|---|---|---|
| Login Cavos (correo/social, sin semilla) | Simulado | `src/services/auth.ts` |
| Escrow Trustless Work (liberación multiparte) | Simulado | `src/services/escrow.ts` |
| Rendimiento Blend (USDC) | Simulado, tasa "variable", ninguna cifra | `src/services/yield.ts` |
| Datos de alquileres | Locales (localStorage), ejemplos ficticios | `src/store.ts` |
| Interfaz, rutas y validaciones | Reales | `src/screens/*` |
No se usan llaves ni secretos. Toda integración simulada lleva la insignia "Demo: simulado".

## Checklist de la fase 2
- [x] Máquina de estados completa (`borrador → entrada → pendiente_pago → apartado → salida → ventana_reclamo → reclamo → mediacion → cerrado`) con acciones según el rol
- [x] Acta de entrada: cuartos, checklist, subida de fotos (vista previa local), firmas de ambas partes con fecha y hora
- [x] Pago del depósito + aviso de escrow multiparte
- [x] Interruptor de rendimiento con avisos de "variable / no garantizado" y reparto 40/40/20
- [x] Acta de salida + comparación lado a lado
- [x] Ventana de 7 días: cuenta regresiva, botón "simular paso de 7 días", devolución automática
- [x] Reclamo (fotos/monto) → aceptar/rechazar → pantalla del mediador (reparto)
- [x] Línea de tiempo visual con todos los estados
- [x] Decoraciones SVG, repaso del texto (español neutro, CR), accesibilidad
- [x] Capturas a 390/1366 de todas las pantallas; despliegue de vista previa (proyecto aparte, NO la landing)

## Estado al cierre de la fase 2 (16 oct 2026)
- Recorrido completo verificado con Playwright (`node e2e.mjs <url> [carpeta] [anchos]`) a 390 y 1366: entrar → crear → acta de entrada → firmas → pago → rendimiento → acta de salida → 7 días → devolución automática; y reclamo → rechazo → mediación → cierre. Sin desbordes ni errores JS.
- Fechas: campo propio dd/mm/aaaa con la fecha escrita debajo (ej.: "1 nov 2026"), igual en cualquier navegador.
- Fondo: la aurora ahora es `absolute` y cubre todo el documento (antes era `fixed` y se cortaba en capturas de página completa).
- Barra a 390: logo más compacto y "Salir" como ícono.
- `prefers-reduced-motion`: se apagan animaciones y transiciones.
- Vista previa: proyecto Vercel aparte `lockumi-app-demo`, con protección en todos los despliegues; acceso por enlace compartible de 7 días.

## Limitaciones conocidas
- Todo vive en el navegador (localStorage): cada persona ve su propia copia; dueño e inquilino se simulan con el selector de rol en el mismo dispositivo.
- Fotos reales se reducen y guardan localmente; con muchas fotos el almacenamiento del navegador puede llenarse.
- Correo de invitación, firmas, pago, escrow, rendimiento y mediador son simulados.

## v3 (16 oct 2026): acceso nuevo
- `src/services/auth.ts` expone `loginGoogle`, `loginApple`, `sendOtp`, `verifyOtp`, `handleCallback` sobre una interfaz `CavosLike` con la forma de CavosAuth de @cavos/kit (`getGoogleOAuthUrl`, `getAppleOAuthUrl`, `handleCallback`, `sendOtp`, `verifyOtp`). Proveedor actual: simulado; la dependencia no se agregó.
- Sin selector de rol al entrar; dentro de cada alquiler queda el selector «Ver la demo como» (demo en un solo dispositivo).
- Texto en español neutro con tuteo (sin voseo).

## Formulario «Nuevo alquiler» (24 oct 2026, rama local `formulario`, sin publicar)

- [x] 5 pantallas, una pregunta por pantalla, con los textos exactos de la maqueta (Legal 23/10).
- [x] Chips de 44 px: tipo, duración (3 meses, 6 meses, 1 año, «Otra fecha»), monto (con `usd(...)`) y reglas («+ Otra regla»).
- [x] Errores que dicen cómo arreglarlos; foco en la pregunta nueva o en el primer error; flechas en los chips; Enter para seguir.
- [x] Aviso v2 al terminar cada pantalla y «Alquiler creado» al crear; celebración de 0,9 s en «¡Reglas listas!»; movimiento reducido sin animación.
- [x] El paso 2 y el 3 del recorrido guiado piden su pantalla (lugar y reglas).
- [ ] El tipo de lugar no se guarda (no existe en `types.ts`).
- [ ] El título al crear sigue siendo «Alquiler creado» (aprobado por Legal), no «¡Alquiler creado!» de la maqueta. Cambiarlo requiere el OK de Legal.
- [ ] **Antes de usar dinero real:** revisar los chips de duración con un abogado (Ley 7527, art. 70) y moderar «+ Otra regla».
- [ ] Publicar en `master` cuando Katherine dé el OK.

## Recorrido guiado (24 oct 2026, rama `ux-guiada`)

- [x] 6 pasos con driver.js sobre las pantallas reales; textos exactos de la maqueta.
- [x] Se abre solo la primera vez (por correo, guardado como huella) y tiene «Saltar».
- [x] Se vuelve a ver desde «¿Cómo funciona?» (encabezado) y la tarjeta «¿Primera vez?» de Inicio.
- [x] Alquiler de ejemplo de solo lectura para fotos, firmas y depósito, y mediación (simulación).
- [x] Accesible: foco en el globo, Tab atrapado, Esc, foco de vuelta, movimiento reducido.
- [ ] Entrada en el menú de la cuenta (avatar) de la maqueta: la app todavía no tiene ese menú.
- [x] Publicado en `master` el 24 oct 2026 (OK de Katherine).
