# Textos legales de la app

Cada documento es **un solo archivo Markdown** en esta carpeta. La app lo carga en el build
(`import.meta.glob('./*.md', { query: '?raw' })` en `documentos.ts`), lo convierte a HTML y crea
su ruta (`terminos.md` → `/terminos`) y su enlace en el pie.

| Archivo         | Ruta          | Origen |
|-----------------|---------------|--------|
| `terminos.md`   | `/terminos`   | `/workspace/lockumi-landing/terminos-app-1.5-borrador.md`, copia exacta (1.5-demo) |
| `privacidad.md` | `/privacidad` | `/workspace/lockumi-landing/privacidad-app-1.5-borrador.md`, copia exacta (1.5-demo, sin nota interna) |

## Reemplazar un texto
Sustituir el archivo `.md` (sin editar su contenido; en privacidad, quitar la "Nota interna" si viene).
- **Versión y fecha:** se leen de la línea `**Versión 1.5-demo · 20 de octubre de 2026**` (o `**Versión:** … · **Fecha:** …`)
  del propio texto, o de un bloque de metadatos `---\nversion: …\nfecha: …\n---` al inicio. Si el texto ya las muestra,
  la página no las repite; si no, las muestra una vez arriba.
- **Casilla de consentimiento de privacidad:** su texto es fijo en el código (`CONSENTIMIENTO_PRIVACIDAD` en `documentos.ts`).
- **Marca de revisión por abogado:** si el texto no dice "revisión por abogado", la página muestra arriba el aviso
  discreto "Pendiente de revisión por abogado" (`PaginaLegal.tsx`, `legal__revision`).
- Si cambia la versión, la aceptación anterior deja de contar y la casilla vuelve a salir sin marcar.

Las aceptaciones se guardan en `localStorage` (`lockumi.terminos.aceptacion`, `lockumi.privacidad.consentimiento`)
como `{ version, fecha }` y en el usuario (`lockumi.usuario` → `terminos`, `privacidad`). Este LEEME no es una página.
