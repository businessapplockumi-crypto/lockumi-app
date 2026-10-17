# Textos legales de la app

Cada documento es **un solo archivo Markdown** en esta carpeta. La app lo carga en el build
(`import.meta.glob('./*.md', { query: '?raw' })` en `documentos.ts`), lo convierte a HTML y crea
su ruta (`terminos.md` → `/terminos`) y su enlace en el pie.

| Archivo         | Ruta          | Origen |
|-----------------|---------------|--------|
| `terminos.md`   | `/terminos`   | `/workspace/lockumi-landing/terminos-app.md`, copia exacta |
| `privacidad.md` | `/privacidad` | `/workspace/lockumi-landing/privacidad-app.md`, sin la sección final "Nota interna (no publicar)" |

## Reemplazar un texto
Sustituir el archivo `.md` (sin editar su contenido; en privacidad, quitar la "Nota interna" si viene).
- **Versión y fecha:** se leen de la línea `**Versión:** … · **Fecha:** …` (o `**Última actualización:** …`)
  del propio texto, o de un bloque de metadatos `---\nversion: …\nfecha: …\n---` al inicio.
- **Casilla de consentimiento de privacidad:** su texto se toma tal cual de la línea `> ☐ …` de
  `privacidad.md`; `[Aviso de privacidad de la app]` se enlaza a `/privacidad`.
- Si cambia la versión, la aceptación anterior deja de contar y la casilla vuelve a salir sin marcar.

Las aceptaciones se guardan en `localStorage` (`lockumi.terminos.aceptacion`, `lockumi.privacidad.consentimiento`)
como `{ version, fecha }` y en el usuario (`lockumi.usuario` → `terminos`, `privacidad`). Este LEEME no es una página.
