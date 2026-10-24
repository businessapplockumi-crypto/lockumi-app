# Estado de espera del pago (v2)

**Pendiente de publicar** (rama `espera-pagar` desde `master` en `76373f8`, solo vista previa protegida de Vercel; falta el OK de Katherine). Solo el paso **«Pagar»** (`PagoSimulado` en `src/screens/Detalle.tsx`, la pantalla del depósito en app.lockumi.com). Los demás pasos que tardan (firma, fotos, devolución, reclamo, reparto) no cambian. La pantalla de la fase 1 mínima (`PagoReal`, `VITE_FLUJO=solo`) tampoco.

Maqueta aprobada: `diseno/estado-espera/v2/` y `diseno/envio/estado-espera-v2/LEEME.md` (fuera del repo).

## Qué se ve

- **En reposo:** «Pagar 20 USDC» en terracota (`--accion`). Es el único momento en que el botón es terracota.
- **Pagando:** el mismo botón pasa a «Guardando tu depósito…» con la casita de Lockumi (`LogoAviso`), con la llave que entra y gira en bucle. Debajo:
  - la nota «Esto tarda unos segundos. No cierres la app.» (la maqueta decía «Esto puede tardar hasta un minuto…» para el pago; Katherine eligió este texto el 23 oct);
  - una barrita y tres pasos: **Firmando · Enviando · Guardado**.
- **Tres verdes de la paleta** para el botón y la barrita, según el paso:

  | Paso | Fondo | Texto |
  |---|---|---|
  | 1 Firmando | `--estado-curso-fondo` | café |
  | 2 Enviando | `--salvia` | café |
  | 3 Guardado | `--exito` | crema |

  El color cambia con un fundido de 500 ms. Con «reducir movimiento» cambia al instante, la llave queda quieta y la barrita salta.
- **Al terminar:** el alquiler pasa a las fotos de entrada y sale el aviso de logro de siempre, «¡Depósito guardado!», con el texto publicado sin cambios («20 USDC guardados en una cuenta segura…»). No se aplicó el recorte de la maqueta, que no está aprobado.
- **Error:** el mensaje sigue escrito en la pantalla (`p.error`, `role="alert"`) y **no se esconde solo**. El botón vuelve a estar activo, en terracota, como **«Volver a intentar el pago»**. El paso que falló queda marcado con una X y «(no se pudo)» para lectores de pantalla. La barrita no aparece. Al reintentar, la app no repite lo que ya quedó hecho: si la cuenta segura ya existe, va directo a «Enviando».
- **No se muestra «Al volver a intentar, no se paga dos veces.»** El código evita repetir los pasos ya anotados y el servidor rechaza fondear una cuenta segura que ya tiene el depósito («Este depósito ya se pagó»). Pero eso no está garantizado en todos los casos. Por ejemplo, si la red de prueba aceptó el depósito y todavía no lo muestra, una segunda solicitud podría pasar el chequeo. Ver `legal/textos-espera-pagar-2026-10-24.md` (fuera del repo).

## De dónde salen los pasos (sin temporizadores)

`acciones.pagar(a, avance)` ya avisaba cada etapa real del depósito con un texto (`services/escrow.ts`). `etapaDeAvance()` (`src/espera.ts`) los traduce así:

| Paso | Cuándo | Textos de `avance` |
|---|---|---|
| 1 Firmando | Desde el clic hasta que sale el depósito: recarga de la cuenta de prueba, dueño de prueba y creación de la cuenta segura. Con cuenta propia, también la firma en la billetera. | «Poniendo USDC de prueba…», «Revisando tu saldo…», «Preparando al dueño de prueba…», «Creando la cuenta segura del depósito…», «Confirma el depósito en …» |
| 2 Enviando | El depósito firmado va a la red de prueba y la app espera la confirmación. | «Guardando el depósito en la cuenta segura…» |
| 3 Guardado | `acciones.pagar` terminó bien (Trustless Work confirmó la transacción y el alquiler quedó anotado). | — |

**Limitaciones honestas:**

- Con la cuenta de prueba de Lockumi (lo normal en la app), la firma del depósito la hace el servidor **dentro** de la misma solicitud que lo envía (`fondear-prueba`). Por eso, en ese caso, «Firmando» cubre la preparación y la cuenta segura, y «Enviando» cubre la firma del servidor, el envío y la confirmación.
- La confirmación no se ve aparte: llega cuando responde la solicitud.
- «Guardado» se pinta en el mismo momento en que el alquiler pasa a las fotos de entrada. En la práctica, lo que se ve es el aviso de logro, no el botón verde final.
- Sin red de prueba (demo local), el depósito es simulado y pasa de «Firmando» a terminado enseguida.

No se tocó la lógica del ingreso ni la de la cuenta segura o Stellar: solo se lee el `avance` que ya existía.

## Accesibilidad

- Botón en espera con `aria-busy="true"` y `aria-disabled="true"`, no `disabled`, para que no pierda el foco.
- Barrita `role="progressbar"` con `aria-valuetext` («Paso 2 de 3: Enviando.»).
- Cada paso se anuncia en un `role="status"`.
- Pasos con «(listo)», «(ahora)», «(falta)» y «(no se pudo)» para lectores de pantalla.
- Todos los textos nuevos ocupan 2 líneas o menos a 390 px. El mensaje de error existente de la red de prueba ocupa 3; no se cambió.

## Archivos

- `src/espera.ts`: textos (`// LEGAL: revisar`), etapas, barrita y estados de los pasos.
- `src/EsperaPago.tsx`: el botón con la espera.
- `src/screens/Detalle.tsx` (`PagoSimulado`).
- `src/index.css`: bloque «Estado de espera v2 del pago», copiado de la maqueta.
- Pruebas:
  - `src/__tests__/espera-pago.test.tsx`;
  - `scripts/espera-pagar/capturar.mjs`, en el navegador, sobre la app construida: 390 y 1280 px, colores, fundido, voz, 2 líneas, error y reintento, «reducir movimiento» y el aviso con Tab, Espacio, Esc y Enter.

Para correr la prueba en el navegador:

```
VITE_TRUSTLESS=1 npx vite build && npx vite preview --port 4173
OUT=/tmp/ep/ node scripts/espera-pagar/capturar.mjs
```

- **Revisión de Legal (23 oct 2026, 10:22 p. m. CR):** textos A1–A13 aprobados. A12 corregido a «La red de prueba está lenta o no respondió. Espera un minuto y vuelve a tocar el botón.» (sin prometer que no se repite). «Al volver a intentar, no se paga dos veces.» queda fuera hasta tener una clave de idempotencia por alquiler en el servidor (pendiente antes de dinero real).
