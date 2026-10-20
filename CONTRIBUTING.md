# Cómo contribuir a Lockumi

Gracias por tu interés. Lockumi es una demo en la **red de prueba de Stellar (testnet)**: no uses cuentas ni fondos de la red principal.

## Qué hace la app hoy

Antes de cambiar código o documentación, lee la [guía para jueces del README](README.md#prueba-el-flujo-en-5-minutos-guía-para-jueces): describe lo que hace app.lockumi.com (testnet, una persona, flujo completo de 8 pasos con escrow real de Trustless Work). Si tu cambio modifica ese comportamiento, actualiza también el README en el mismo *pull request*. Lo que todavía no funciona (dos personas reales, invitaciones por correo o link) se escribe como «Próximamente».

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

Para probar el flujo de la red de prueba en local hacen falta las variables del servidor (ver la tabla del README); sin ellas, la app corre como demo local con el escrow simulado. `VITE_FLUJO=solo` activa el flujo mínimo anterior de 5 pasos.

Si agregas lógica nueva, agrega su prueba en `src/**/__tests__/`.

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
