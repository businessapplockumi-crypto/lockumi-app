# Prueba e2e en Stellar testnet: dos personas, dos aparatos, USDC real de testnet en un escrow de Trustless Work

Rama `testnet-e2e` (sale de 76b66e8). No se publicó nada: sin push, sin deploy, sin tocar app.lockumi.com ni lockumi.com, sin merge a master.

## 1. ¿Puede la billetera de Cavos firmar las XDR de Trustless Work? Sí, probado en testnet

- `@cavos/kit` 0.4.2 tiene `wallet.signXdr(unsignedXdr) → signedXdr` (no envía). La documentación lo describe justo para este caso:
  "When your backend (or a platform's REST API) builds the transaction and hands you an unsigned XDR, use signXdr". También dice "Soroban and Trustless Work still work". Fuente: https://docs.cavos.xyz/docs/stellar
- Lo que hace por dentro: lee la XDR, vuelve a firmar solo las entradas de autorización de Soroban de su propia cuenta y firma el sobre con la clave de control. Esa clave es la llave maestra de la cuenta G.
- **Prueba real** (`scripts/probar-firma-cavos.mjs`). Usé el método real `CavosStellar.prototype.signXdr` con una cuenta desechable y una clave `WebCryptoControlKey`, la misma clase del kit. La XDR la armó otro: una invocación Soroban simulada con `prepareTransaction`.
  - **Origen = cuenta Cavos (el modelo de TW): OK**, tx `211b4c28f8f3715a2e68afbd9326b674df188676e74ba2bba3100c7063e8caaf`, estado SUCCESS.
  - Con otra cuenta como origen y Cavos autorizando solo su entrada, falla (`txBadAuthExtra`; sin la firma de sobre, falla por recursos). **No aplica a Trustless Work.** TW arma cada transacción con el `signer` del rol como origen y auth `sorobanCredentialsSourceAccount`; lo verifiqué con el deploy real de abajo.
- `addTrustline` real del kit (`scripts/probar-trustline-cavos.mjs`), en una cuenta creada por Friendbot y con `{sponsored:false}`: **OK**, tx `4cd86193bde4c14f96166dd12dce744efbe20ae2dab45d21231b27d787bf3a16`.
- **Lo que cambia en los aparatos reales (vault)**: en la web, la llave vive en el iframe `vault.cavos.xyz`. Llamar a contratos o abrir trustlines queda "fuera del límite" sin importar el monto. Con la regla por defecto, "Ask the user", el vault muestra su propio aviso y la persona aprueba. Si en el panel de Cavos la regla es "Block it", la firma falla con `kit/vault: this app's policy does not allow this transaction`. Fuente: https://docs.cavos.xyz/docs/vault
  - **Revisar antes del sábado:** panel de Cavos → app → Approvals → "Over the limit" = *Ask the user*. Además, el origen de la vista previa tiene que estar en las "allowed web origins".
- Plan B, solo si el vault falla el sábado: Freighter (extensión) para la demo, firmando la misma XDR con `signTransaction`. El proxy no cambia, porque solo exige que la transacción salga de la cuenta registrada del participante.

## 2. Trustless Work: lo que encontré (con fuentes)

- **API v1 REST** (la que usa el proxy). Testnet `https://dev.api.trustlesswork.com`, mainnet `https://api.trustlesswork.com`, encabezado `x-api-key`, 50 solicitudes por 60 s.
  - Cada operación devuelve la XDR sin firmar (`unsignedTransaction`). Se firma y se envía con `POST /helper/send-transaction {signedXdr}`.
  - Fuentes: https://docs.trustlesswork.com/trustless-work/api-rest/introduction · https://docs.trustlesswork.com/trustless-work/api-rest/helpers/send-transaction · Swagger: https://dev.api.trustlesswork.com/docs
- **v2 "Core API" (beta)**: `https://beta.api.trustlesswork.com`. Mismo flujo armar → firmar → `POST /stellar/send-transaction`; agrega roles en plural y un rol admin. Las credenciales no sirven entre v1 y v2. Fuente: https://docs.trustlesswork.com/trustless-work/v2-en/api-rest/introduction
- **SDK de React** `@trustless-work/escrow`: pone la llave en el cliente, por eso **no** lo usamos; vamos por el proxy. Fuente: https://docs.trustlesswork.com/trustless-work/escrow-react-sdk/getting-started
- **Cómo se pide la llave**: dApp https://dapp.trustlesswork.com → conectar billetera y firmar → Settings (perfil) → API Keys → Testnet. Se muestra una sola vez. Fuente: https://docs.trustlesswork.com/trustless-work/introduction/developer-resources/request-api-key
  - **Ya está**: verificada con `GET /helper/get-escrows-by-signer` (200 con la llave, 401 sin ella). Está en Vercel como `TRUSTLESS_WORK_API_KEY` (sensitive, solo Preview).
- **Roles**: approver, serviceProvider, releaseSigner, disputeResolver, receiver y platformAddress. Cualquiera puede depositar. Fuente: https://docs.trustlesswork.com/trustless-work/introduction/technology-overview/roles-in-trustless-work
- **Single vs multi-release**: single libera todo de una vez; multi libera por hito. Para un depósito de garantía usamos **single-release**. Fuente: https://docs.trustlesswork.com/trustless-work/api-rest/deploy/initialize-escrow
- **Disputa y reparto**:
  - Disputar: `dispute-escrow {contractId, signer}`; solo pueden hacerlo approver o serviceProvider, y el resolver no puede disputar.
  - Resolver: `resolve-dispute {contractId, disputeResolver, distributions:[{address, amount}]}`. La suma tiene que ser igual al saldo del escrow.
  - Fuentes: https://docs.trustlesswork.com/trustless-work/api-rest/deploy/change-dispute-flag · https://docs.trustlesswork.com/trustless-work/api-rest/deploy/resolving-disputes · https://docs.trustlesswork.com/trustless-work/introduction/developer-resources/types/payloads/resolve-dispute
- **Tokens de testnet**: USDC de Circle, emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`; faucet https://faucet.circle.com. Fuente: https://docs.trustlesswork.com/trustless-work/introduction/stellar-and-soroban-the-backbone-of-trustless-work/testnet-tokens
- **Comprobado con la llave real**, solo armando la XDR del deploy, sin firmar ni enviar:
  - `trustline.address` tiene que ser el **emisor G…**. Con el contrato C… del USDC responde "Issuer is invalid".
  - TW valida en la cadena que **approver, receiver y platformAddress existan y tengan trustline de USDC**. La de la plataforma GCTLNUBV…TJ4G ya está abierta: tx `ce818acce78f7d3545c87ace184cceb4b3456ed76ce1bb65de6f8dda512af60b`.
  - Usar la **misma cuenta** como platformAddress, serviceProvider, releaseSigner y disputeResolver es aceptado: 201, XDR con origen = plataforma.

## 2b. Privacidad on-chain (Ley 8968) · rama `privacidad-onchain`

Lo que se envía en el deploy queda público y permanente en Stellar. Desde esta rama, `api/_lib/tw.ts` solo manda:
- `title` y `description`: "Depósito de alquiler Lockumi" (texto fijo).
- `engagementId`: el `id` del contrato (uuid aleatorio de `gen_random_uuid()`, no derivado de datos personales).
- hito y evidencia: textos fijos, sin la dirección, nombres, correos ni teléfonos.
`sinDatosPersonales` bloquea el deploy si algún texto trae la dirección, un correo o un teléfono. Prueba: `src/services/__tests__/privacidad-onchain.test.ts`.
Siguen en la cadena, por cómo funciona el escrow: las cuentas G… de dueño e inquilino, el monto y las fechas de las transacciones.

## 3. Roles en Lockumi (single-release, v1)

| Rol de TW | Quién | Por qué |
|---|---|---|
| receiver | inquilino | el depósito vuelve a su cuenta |
| approver | dueño | aprueba "entrega sin daños" o abre el reclamo (disputa) |
| serviceProvider | plataforma | deja la evidencia del acta de salida (cambia el hito a Completed) |
| releaseSigner | plataforma | libera después del plazo, desde el servidor |
| platformAddress | plataforma | comisión 0 |
| disputeResolver | plataforma (mediación) | reparte en un reclamo; configurable con `LOCKUMI_TW_MEDIADOR_PUBLICA` |
| depósito (fund) | inquilino | lo firma con Cavos |

**Camino feliz del sábado**, sin reclamo:
1. La plataforma despliega (servidor).
2. El inquilino deposita (Cavos, firma 1).
3. Se hace el acta de salida.
4. El dueño toca "Todo está bien: aprobar la devolución": la plataforma deja la evidencia y el dueño aprueba (Cavos, firma 2).
5. Termina el plazo y la plataforma libera el 100 % al inquilino.

Las claves de la plataforma solo viven en el servidor.

## 4. Lo que quedó hecho en el código

- `supabase/migrations/20261017000000_lockumi_e2e.sql`:
  - Tablas `lk_*`: contrato, participantes (correo de Cavos y G…), actas, firmas, fotos con sha256 y hora, reclamos, eventos con tx y referencia del escrow.
  - RLS de solo lectura; toda escritura pasa por RPC `security definer` que deducen el rol de `auth.uid()`.
  - Invitación por link de un solo uso (hash sha256, 14 días), bucket privado `lk-fotos`, Realtime y sondeo cada 8 s.
  - Probado con PGlite: `node scripts/probar-esquema.mjs` → 47 OK.
- `src/servidor/*`, `src/acciones.ts`, `src/screens/Invitacion.tsx`: la app usa Supabase en lugar de localStorage cuando hay `VITE_SUPABASE_*`. Sin esas variables sigue la demo local, sin cambios.
- `api/tw.ts` + `api/_lib/tw.ts`: proxy de Trustless Work (Vercel Function). Detalles:
  - Lee `TRUSTLESS_WORK_API_KEY` y `LOCKUMI_TW_PLATAFORMA_SECRET` de `process.env`.
  - Solo testnet y solo cinco acciones permitidas.
  - Verifica la sesión de Supabase y el rol en la base. La plataforma solo firma llamadas a contratos con origen propio, y `enviar` solo acepta transacciones que salen de la cuenta registrada del participante.
  - Pruebas: `src/services/__tests__/trustless-proxy.test.ts`. Un build con `VITE_TRUSTLESS=1` no contiene la llave (revisado con un valor centinela).
- `src/services/trustless.ts` + `billetera.ts` (`firmarXdr`, `abrirTrustlineUsdc`, `saldoUsdc`): se activa con `VITE_TRUSTLESS=1`.
- `src/screens/Billetera.tsx`: "Habilitar USDC de prueba" (trustline desde Cavos) e instrucciones del faucet de Circle.
- `src/screens/Detalle.tsx`: "Todo está bien: aprobar la devolución" y "Liberar el depósito"; el plazo real se muestra en el texto.
- `scripts/preparar-testnet.mjs`: `--desechable`, `--revisar G…`, `--activar G… --confirmo`. No se corre contra billeteras de personas sin `--confirmo`.

## 5. Preparar a cada persona (dueño e inquilino)

1. Entrar en la app y abrir "Tu cuenta para el depósito" → "Activar cuenta de prueba" (Friendbot, 10 000 XLM de prueba).
2. "Habilitar USDC de prueba" (trustline; el vault de Cavos pide confirmar). **Los dos lo necesitan**, porque TW lo valida.
3. Solo el inquilino: abrir https://faucet.circle.com → Stellar Testnet → pegar su dirección G… (20 USDC cada 2 h).

## 6. Corrida completa del camino feliz (API real de testnet, cuentas desechables)

`node scripts/e2e-testnet-tw.mjs` (16/10/2026, 11:56 p. m. hora de Costa Rica). Participantes:
- Dueño: GD57OCAF…UIEX (Cavos desechable).
- Inquilino: GBMFMIUF…AQBY (Cavos desechable).
- Plataforma: GCTLNUBV…TJ4G.
- Escrow: `CCUVP4XKQCWCQTBUHZGA3PZAIYUGGKE2TNH4CZIXXGEMW6GOQY4RGCUS`.

| # | Paso | Tx |
|---|---|---|
| 1 | Trustline USDC del dueño (Cavos `addTrustline`) | https://stellar.expert/explorer/testnet/tx/1bfd4257920d16ee0d916145c93fa240af28ce11ad6e06f883ef7a30671d1bae |
| 2 | Trustline USDC del inquilino (Cavos `addTrustline`) | https://stellar.expert/explorer/testnet/tx/3f400bb241ae437435f38f3c47b25233eb5d63cdd0f4e354a800d69290517563 |
| 3 | 2 USDC para el inquilino (DEX de testnet, XLM → USDC de Circle) | https://stellar.expert/explorer/testnet/tx/314a636d180599c4b41cfe15fb15a7f949b8f89d7da566cb61d08f3c9876ddef |
| 4 | Deploy del escrow single-release (plataforma) | https://stellar.expert/explorer/testnet/tx/74bf9594875ff40349c8cf1ec69258d6c6bb2a5299cf25ff186e23c786a93228 |
| 5 | Depósito de 2 USDC (inquilino, Cavos `signXdr`) | https://stellar.expert/explorer/testnet/tx/51db520b8df6b1f287f4545fc5b62d62b847b222d85dfab54300151c834da059 |
| 6 | Evidencia: hito "Completed" (plataforma) | https://stellar.expert/explorer/testnet/tx/4a212fea4861cd67da31ffd887cc392fb418c0af755fb82273a1f0957aa9c766 |
| 7 | Aprobación (dueño, Cavos `signXdr`) | https://stellar.expert/explorer/testnet/tx/d98d3d3979faae4079023d7f2fad6801bf71d8c10be40f372ee3d5830ca09c9d |
| 8 | Liberación (plataforma): 1,994 USDC al inquilino y 0,006 a GA6KH5VW…CK7G | https://stellar.expert/explorer/testnet/tx/49fb34d0b510cd0a7b62ca5f9a66a82297ff0a240a1563498934c0b3ff51635c |

Estado final según TW: saldo 0, `released: true`, hito Completed y aprobado.

Hallazgos:
- **Trustless Work cobra 0,3 % también en testnet**, aunque `platformFee` sea 0. El inquilino recibe el 99,7 %.
- **Faucet de Circle**: la API (`api.circle.com/v1/faucet/drips`) exige credenciales de Circle (401). Para scripts se usa el DEX de testnet, que vende USDC real de Circle a ~9,26 XLM por USDC. Para las personas, faucet.circle.com en el navegador.
- **`get-escrow-by-contract-ids`** exige `contractIds[]=` (arreglo); con `contractIds=` responde 400.

## 7. Bloqueos

1. **Supabase**: `SUPABASE_ACCESS_TOKEN` es inválido (401 en la Management API), así que no se pueden crear las tablas ni activar el acceso anónimo. Salidas:
   - Un token nuevo y correr `node scripts/aplicar-supabase-e2e.mjs`.
   - O pegar el SQL de la migración en el SQL Editor y activar Authentication → Sign In / Providers → "Allow anonymous sign-ins".
   - Falta además la clave publishable/anon para `VITE_SUPABASE_ANON_KEY`.
2. **Variables de Vercel (Preview)**: ya están `TRUSTLESS_WORK_API_KEY`, `LOCKUMI_TW_PLATAFORMA_SECRET` (sensibles), `VITE_TRUSTLESS=1` y `VITE_VENTANA_SEGUNDOS=300`. Faltan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. **Panel de Cavos**: Approvals → "Over the limit" = Ask the user, y el origen de la vista previa en allowed web origins.
4. Sin probar todavía: el flujo por la app (proxy + Supabase) y la firma con el vault de Cavos en dos aparatos reales. El camino feliz contra TW ya está probado por script (sección 6).
