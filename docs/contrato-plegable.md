# Contrato plegable (22 oct 2026, rama `contrato-plegable`)

**Pendiente de publicar.** Solo está en la rama `contrato-plegable` (desde `master` en `ad1578f`) y en su vista previa protegida de Vercel. app.lockumi.com y `master` no cambian.

Maqueta aprobada: `/workspace/lockumi/producto/contrato-plegable/` (`LEEME.md`, `contrato-plegable.css`, `construir.mjs` y las capturas `firma-*` y `detalle-*`).

## Qué cambia

Un solo cambio en `ContratoDoc` (`src/screens/ContratoDoc.tsx`), que afecta dos pantallas:

| Pantalla | Dónde | Qué se ve |
|---|---|---|
| **Firma** (estado `firmas`, justo después de «Crear alquiler de prueba») | `src/screens/Detalle.tsx` → `Contrato` | Resumen del contrato, «Ver contrato completo», pie, «Descargar o imprimir», la nota del dueño de prueba y `Firma` completo (casilla «Leí el contrato y estoy de acuerdo.» y «Firma como inquilino»). |
| **Detalle del alquiler** (después de firmar) | `src/screens/Detalle.tsx`, columna lateral (`aria-label="Contrato"`) | Resumen del contrato, «Ver contrato completo», pie y «Descargar o imprimir». |

- **Siempre a la vista:** cabecera («Contrato», sello «Pendiente de firmas» o «Firmado por los dos» y referencia), **El alquiler** (lugar, depósito, entrada, salida), **Partes**, el botón **«Ver contrato completo»** con la línea «Reglas, depósito, reclamos, mediación y firmas», el **pie** (aviso legal) y **«Descargar o imprimir»**.
- **Plegado por defecto:** Reglas, El depósito, 7 días para reclamos, Mediación y Firmas. Abierto, el botón dice «Ocultar contrato completo» y la flecha gira.
- **Empieza cerrado cada vez** que se abre la pantalla; el estado no se guarda. Al firmar el dueño de prueba, el contrato pasa del panel principal a la columna lateral y vuelve a empezar cerrado.
- **Casilla:** opción (a) de la maqueta. Funciona igual que hoy aunque el contrato esté cerrado. Cualquier otra opción la decide Legal.
- **Textos legales:** sin cambios (incluidos los marcados `// LEGAL: revisar`). Solo cambia la presentación; las secciones se mueven a un bloque plegable sin tocar su texto ni su orden.

## Accesibilidad

- `<button type="button" class="cp-abrir" aria-expanded aria-controls>`; el bloque plegado es `role="region"` con `aria-label="Contrato completo"` y el atributo `hidden` cuando está cerrado (no recibe foco ni lo leen los lectores de pantalla).
- Tab llega al botón; Enter y Espacio abren y cierran; el foco se queda en el botón.
- Letra de 14 px o más; alto mínimo de 56 px (en celular la segunda línea ocupa más de un renglón, igual que en la maqueta); solo variables de `src/index.css` (estilos `cp-` copiados de la maqueta). Sin animación con `prefers-reduced-motion`.

## Impresión: siempre el contrato completo

- **«Descargar o imprimir»** imprime la versión `ct--impresion` (`Documento` con `impresion`), que no tiene botón ni partes plegadas.
- **Menú del navegador (Ctrl+P / Cmd+P):** `@media print` muestra `.cp-completo[hidden]` y oculta el botón; además `beforeprint` abre el contrato y `afterprint` lo deja como estaba.

## Pruebas (22/10/2026, noche, hora de Costa Rica)

- `npm test`: **140/140** (134 anteriores + 6 nuevas en `src/screens/__tests__/contrato-plegable.test.tsx`: cerrado por defecto, qué queda a la vista y qué se pliega, abrir y cerrar con `aria-expanded` y `hidden`, impresión completa, reglas de `@media print`, 56 px / 14 px / solo variables). `npm run build`: bien.
- `scripts/contrato-plegable/capturar.mjs` (Playwright con Chrome, 390 px y 1280 px): **88 comprobaciones bien, 0 fallas**. Crea un alquiler con «Crear alquiler de prueba», revisa la pantalla Firma cerrada (resumen, pie, «Descargar o imprimir», casilla activa y «Firma como inquilino» visibles), teclado (Tab, Enter abre, Espacio cierra, foco en el botón, Tab no entra en lo oculto), sin desborde horizontal, marca la casilla **con el contrato cerrado** y firma (los mismos pasos que `scripts/tus-alquileres/real.mjs` y `scripts/saldo0-login/pagar-con-sesion.mjs`), y repite las revisiones en el detalle; al recargar empieza cerrado. Genera dos PDF con el contrato cerrado y los revisa con `pdftotext`: los dos tienen todas las secciones y el pie, y el de «Descargar o imprimir» solo tiene el contrato.
- **Cómo:** el login de Cavos no funciona en las vistas previas. La app de la rama corrió en `http://localhost:5173` con `VITE_TRUSTLESS=1` y el `VITE_CAVOS_APP_ID` público, con la sesión simulada como la deja el login (`lockumi.usuario` con `metodo: 'google'`, kattmoresol@gmail.com, y la identidad pública de Cavos). Crear y firmar no llaman a `/api/solo`; por si acaso, el script responde ahí con datos de ejemplo (no se paga ni se toca la red de prueba). No se usó la vista previa protegida ni ningún enlace para saltar su protección.
- `scripts/tus-alquileres/real.mjs` y `scripts/saldo0-login/pagar-con-sesion.mjs` no se corrieron (necesitan `/api/solo` de una vista previa y crean depósitos reales en testnet). Siguen sirviendo: marcan la casilla con `getByLabel('Leí el contrato y estoy de acuerdo.')` y tocan «Firma como inquilino», que se ven sin abrir el contrato (comprobado arriba).

Capturas: `/workspace/lockumi/capturas/contrato-plegable-preview-{firma,detalle}-{cerrado,abierto}-{movil,escritorio}.png`, `contrato-plegable-preview-impresion-menu-cerrado.png` (vista de impresión con el contrato cerrado) y los PDF `contrato-plegable-preview-impresion-{boton,menu}-cerrado.pdf`. JPEG para enviar en `/workspace/lockumi/diseno/envio/contrato-plegable-preview/`.

## Pendiente

- Preguntas para Legal de la maqueta (§5 de su `LEEME.md`): casilla con el contrato cerrado, reglas y cláusulas plegadas, pie plegado y versión del texto.
- Publicar: unir a `master` solo cuando Katherine lo apruebe (un push a `master` publica en app.lockumi.com) y pasar la entrada de «Pendiente de publicar» del README a «Cambios publicados».
