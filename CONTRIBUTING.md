# Cómo contribuir a Lockumi

Gracias por tu interés. Lockumi es una demo en la **red de prueba de Stellar (testnet)**: no uses cuentas ni fondos de la red principal. El código bloquea la red principal; no quites esos bloqueos.

## Proponer cambios

1. Abre un *issue* con el problema o la idea, o comenta en uno existente.
2. Crea una rama desde `master` con un nombre corto y descriptivo, por ejemplo `fix-login-correo` o `docs-guia`.
3. Haz commits pequeños con mensajes en español que digan qué cambia y por qué.
4. Abre un *pull request* contra `master`. Explica qué cambiaste, cómo lo probaste y, si cambia la interfaz, agrega una captura.
5. El CI (`.github/workflows/ci.yml`) tiene que pasar antes del merge.

## Correr tests y lint

Con Node.js 22:

```bash
npm ci
npm run lint    # Oxlint
npm test        # Vitest (vitest run)
npm run build   # TypeScript + Vite
```

Si agregas lógica nueva, agrega su prueba en `src/**/__tests__/`.

Antes de publicar, revisa que el build no lleve secretos:

```bash
npm run build && npm run revisar:bundle
```

### Base de datos (Supabase)

- Los cambios de esquema van en una migración nueva en `supabase/migrations/` (no edites una ya aplicada). Tienen que poder correrse dos veces.
- Toda escritura pasa por funciones `lk_*` que deducen el papel de la sesión (`auth.uid()`): cada persona solo actúa como dueño o como inquilino.
- `npm test` corre las migraciones en PGlite (`src/servidor/__tests__/invitaciones-sql.test.ts`) y `node scripts/probar-esquema.mjs` hace el recorrido completo del esquema.
- Para probar en el navegador con dos personas sin Supabase: `scripts/servidor-local.mjs` (ver README, «Invitaciones sin Supabase»).

### Qué corre en producción

app.lockumi.com es la prueba de **una sola persona** en testnet (tú eres el inquilino y el dueño es una cuenta de prueba de Lockumi). Las invitaciones entre dos personas necesitan Supabase y por ahora solo se prueban en vistas previas. No actives `VITE_SUPABASE_*` en «Production» de Vercel sin una prueba con dos sesiones.

## No subas secretos

- Copia `.env.example` a `.env` y pon ahí tus valores. `.env`, `.env.local` y `.env.*.local` están en `.gitignore`.
- Nunca subas llaves de API, claves secretas de Stellar (`S…`) ni claves de servicio de Supabase.
- Las variables con prefijo `VITE_` terminan en el bundle del navegador: solo pueden ser públicas. Las secretas van sin prefijo y solo en el servidor.
- Si subiste un secreto por error, avísanos y rótalo; borrarlo del historial no basta.

## Estilo de código

- TypeScript (el build corre `tsc -b`) y componentes de React con funciones y hooks.
- Nombres, textos de la interfaz y comentarios en español neutro.
- Sigue el estilo de los archivos vecinos: funciones cortas, sin dependencias nuevas si no hacen falta.
- `npm run lint` no debe dar errores.
- Los textos legales de `src/legal/` no se editan a mano: se reemplazan como indica `src/legal/LEEME.md`.
