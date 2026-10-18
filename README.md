# Lockumi

## Video demo

<!-- VIDEO_ADJUNTO -->

[![Video demo de Lockumi](docs/demo/lockumi-demo-poster.jpg)](docs/demo/lockumi-demo.mp4)

1:14, con voz narrada. [Ver el video en GitHub](https://github.com/businessapplockumi-crypto/lockumi-app/blob/master/docs/demo/lockumi-demo.mp4) · [Descargar el MP4](https://github.com/businessapplockumi-crypto/lockumi-app/raw/master/docs/demo/lockumi-demo.mp4)

Lockumi es una app de **depósito de alquiler protegido** para Costa Rica. Dueño e inquilino firman el contrato, documentan el estado del inmueble con fotos al entrar y al salir, y el depósito de garantía queda protegido hasta el final del alquiler.

- App (demo): https://app.lockumi.com
- Sitio: https://lockumi.com

> **Estado:** demo. En app.lockumi.com el depósito es **simulado** y no se mueve ningún fondo ni token. Las integraciones reales con Stellar se probaron en **testnet** (ver abajo).

## El problema

En muchos alquileres el depósito de garantía queda retenido al terminar el contrato sin pruebas de daños: no hay un acta clara del estado del inmueble al entrar ni al salir, y el inquilino no tiene cómo reclamar.

## Cómo funciona

1. **Contrato:** el dueño crea el alquiler (inmueble, monto, fechas y reglas), invita al inquilino y ambos firman.
2. **Depósito protegido:** el inquilino deposita; nadie puede liberar el dinero por su cuenta.
3. **Fotos de entrada:** se hace el acta de entrada con inventario y fotos con fecha y hora.
4. **Fotos de salida:** al terminar se hace el acta de salida.
5. **7 días para reclamos:** el dueño tiene 7 días para abrir un reclamo con pruebas.
6. **Devolución automática:** si no hay reclamo en ese plazo, el depósito vuelve al inquilino.
7. **Mediador:** si el inquilino no acepta el reclamo, el caso pasa a una persona mediadora que decide el reparto (en la demo, la mediación es simulada).

## Integraciones reales (Stellar testnet)

### Login sin billetera con Cavos

`@cavos/kit` 0.4.2 (`src/services/auth.ts`, `src/services/billetera.ts`). La persona entra sin instalar una billetera ni guardar frases semilla, y Cavos crea una **billetera Stellar de testnet**. Métodos de acceso en el código:

- Google (redirección OAuth);
- Apple (redirección OAuth);
- correo electrónico con código de un solo uso (9 caracteres).

Si `VITE_CAVOS_APP_ID` no está definido, la app usa un acceso **simulado** (sin red; cualquier código de 6 dígitos sirve). La cuenta de testnet se puede activar con Friendbot y su saldo se lee en Horizon testnet.

### Escrow de Trustless Work con USDC de testnet

Escrow *single-release* de [Trustless Work](https://www.trustlesswork.com) (API REST v1 de testnet) con USDC de Circle en testnet. Las transacciones las firman las billeteras de Cavos (`signXdr`) y la llave de Trustless Work solo vive en el servidor (proxy `api/tw.ts`).

**El código real de Trustless Work está en la rama `testnet-e2e`** (proxy, servicios, scripts y la documentación `docs/testnet-e2e.md`). No está en `master`.

#### Prueba real: 2 USDC depositados, 1,994 USDC devueltos

Corrida completa del camino feliz con `node scripts/e2e-testnet-tw.mjs` el 16/10/2026 (hora de Costa Rica), con cuentas desechables.

- Escrow: [`CCUVP4XKQCWCQTBUHZGA3PZAIYUGGKE2TNH4CZIXXGEMW6GOQY4RGCUS`](https://stellar.expert/explorer/testnet/contract/CCUVP4XKQCWCQTBUHZGA3PZAIYUGGKE2TNH4CZIXXGEMW6GOQY4RGCUS)
- Depósito de 2 USDC (inquilino, firmado con Cavos): [51db520b…a059](https://stellar.expert/explorer/testnet/tx/51db520b8df6b1f287f4545fc5b62d62b847b222d85dfab54300151c834da059)
- Liberación: **1,994 USDC al inquilino** y 0,006 USDC de comisión de Trustless Work (0,3 %): [49fb34d0…635c](https://stellar.expert/explorer/testnet/tx/49fb34d0b510cd0a7b62ca5f9a66a82297ff0a240a1563498934c0b3ff51635c)

| # | Paso | Transacción |
|---|---|---|
| 1 | Trustline USDC del dueño (Cavos `addTrustline`) | [1bfd4257…1bae](https://stellar.expert/explorer/testnet/tx/1bfd4257920d16ee0d916145c93fa240af28ce11ad6e06f883ef7a30671d1bae) |
| 2 | Trustline USDC del inquilino (Cavos `addTrustline`) | [3f400bb2…7563](https://stellar.expert/explorer/testnet/tx/3f400bb241ae437435f38f3c47b25233eb5d63cdd0f4e354a800d69290517563) |
| 3 | 2 USDC para el inquilino (DEX de testnet) | [314a636d…ddef](https://stellar.expert/explorer/testnet/tx/314a636d180599c4b41cfe15fb15a7f949b8f89d7da566cb61d08f3c9876ddef) |
| 4 | Deploy del escrow single-release | [74bf9594…3228](https://stellar.expert/explorer/testnet/tx/74bf9594875ff40349c8cf1ec69258d6c6bb2a5299cf25ff186e23c786a93228) |
| 5 | Depósito de 2 USDC (inquilino, Cavos `signXdr`) | [51db520b…a059](https://stellar.expert/explorer/testnet/tx/51db520b8df6b1f287f4545fc5b62d62b847b222d85dfab54300151c834da059) |
| 6 | Evidencia: hito "Completed" | [4a212fea…c766](https://stellar.expert/explorer/testnet/tx/4a212fea4861cd67da31ffd887cc392fb418c0af755fb82273a1f0957aa9c766) |
| 7 | Aprobación del dueño (Cavos `signXdr`) | [d98d3d39…9c9d](https://stellar.expert/explorer/testnet/tx/d98d3d3979faae4079023d7f2fad6801bf71d8c10be40f372ee3d5830ca09c9d) |
| 8 | Liberación: 1,994 USDC al inquilino y 0,006 de comisión | [49fb34d0…635c](https://stellar.expert/explorer/testnet/tx/49fb34d0b510cd0a7b62ca5f9a66a82297ff0a240a1563498934c0b3ff51635c) |

## Qué es simulado en app.lockumi.com

- **Escrow:** `src/services/escrow.ts` es una interfaz simulada pensada para reemplazarse por Trustless Work. En pantalla se marca como "Pago simulado".
- **Rendimiento con Blend (40/40/20):** `src/services/yield.ts` es simulado. Es una **función futura, no disponible**: destinaría el depósito a un protocolo de préstamos en USDC (Blend) con un reparto 40 % inquilino, 40 % dueño y 20 % Lockumi. El rendimiento sería variable y no garantizado.
- **Mediación:** la persona mediadora y sus resoluciones son simuladas y no tienen efecto legal.
- **Plazo de reclamos:** la demo tiene un botón para adelantar 7 días y ver la devolución automática.
- **Datos:** los alquileres se guardan en el navegador (localStorage). El servidor compartido con Supabase está en la rama `testnet-e2e`.
- **Login:** sin `VITE_CAVOS_APP_ID`, el acceso de Cavos es simulado.
- **Textos legales:** los Términos y la Política de Privacidad (`/terminos`, `/privacidad`, versión 1.3-demo) están pendientes de revisión por abogado.

## Correr localmente

```bash
npm ci
cp .env.example .env   # opcional: VITE_CAVOS_APP_ID para el login real de Cavos
npm run dev
npm test
```

Otros comandos: `npm run build`, `npm run lint`, `npm run preview`.

## Stack

- React 19 + TypeScript 6 + Vite 8 (`@vitejs/plugin-react`)
- `@cavos/kit` 0.4.2 (login y billetera Stellar)
- Vitest 5 (pruebas), Oxlint (lint), Playwright (pruebas en el navegador)
- Despliegue en Vercel
- En la rama `testnet-e2e`: Trustless Work (API REST), Stellar testnet y Supabase

## Equipo

- Katherine Moreira Solano

## Licencia

[MIT](LICENSE) © 2026 Katherine María Moreira Solano
