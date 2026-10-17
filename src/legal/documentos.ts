import { aHtml } from './markdown'

/** Textos legales: cada `*.md` de esta carpeta es una página (`terminos.md` → `/terminos`).
 *  Para cambiar un texto basta con reemplazar su archivo (ver LEEME.md). */
const archivos = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export interface DocLegal { slug: string; titulo: string; version: string; fecha: string | null; html: string; borrador: boolean }

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(16).padStart(8, '0') }

export function leerDoc(slug: string, crudo: string): DocLegal {
  let cuerpo = crudo.replace(/^\uFEFF/, ''); const meta: Record<string, string> = {}
  const fm = cuerpo.match(/^---\n([\s\S]*?)\n---\n?/)
  if (fm) { for (const l of fm[1].split('\n')) { const m = l.match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/); if (m) meta[m[1].toLowerCase()] = m[2].replace(/^["']|["']$/g, '') } cuerpo = cuerpo.slice(fm[0].length) }
  // Sin metadatos: busca "**Versión:** 1.0 · **Fecha:** …" (o "Última actualización:") en el propio texto.
  const enTexto = (re: RegExp) => cuerpo.match(re)?.[1]?.replace(/[*_]/g, '').trim() || undefined
  const version = meta.version || meta['versión'] || enTexto(/versi[oó]n\s*\**\s*:\s*\**\s*([^·\n]+)/i) || 'texto-' + hash(cuerpo)
  const fecha = meta.fecha || enTexto(/(?:fecha|[uú]ltima actualizaci[oó]n|vigente desde)\s*\**\s*:\s*\**\s*([^·\n]+)/i) || null
  const titulo = cuerpo.match(/^#\s+(.+)$/m)?.[1].trim() || slug
  return { slug, titulo, version, fecha, html: aHtml(cuerpo), borrador: /borrador/i.test(version) || /borrador provisional/i.test(cuerpo) }
}

export const DOCS: Record<string, DocLegal> = Object.fromEntries(
  Object.entries(archivos)
    .map(([ruta, txt]) => [ruta.replace(/^\.\/|\.md$/g, ''), txt] as const)
    .filter(([slug]) => /^[a-z0-9-]+$/.test(slug)) // LEEME.md no es una página
    .map(([slug, txt]) => [slug, leerDoc(slug, txt)]),
)
export const TERMINOS = DOCS.terminos
export const PRIVACIDAD = DOCS.privacidad as DocLegal | undefined
export const hayPrivacidad = !!PRIVACIDAD

/** Texto de la casilla de consentimiento: se toma tal cual de la línea "☐ …" de `privacidad.md`.
 *  Devuelve el texto en partes para enlazar "[Aviso de privacidad de la app]" a /privacidad. */
export function consentimientoPrivacidad(crudo = archivos['./privacidad.md'] ?? ''): { antes: string; enlace: string; despues: string } | null {
  const l = crudo.match(/^\s*>?\s*☐\s*(.+)$/m)?.[1]?.trim(); if (!l) return null
  const m = l.match(/^(.*?)\[([^\]]+)\](?:\([^)]*\))?(.*)$/)
  return m ? { antes: m[1], enlace: m[2], despues: m[3] } : { antes: l, enlace: '', despues: '' }
}

/** Fecha legible: acepta ISO aaaa-mm-dd; si viene en otro formato se muestra tal cual. */
export const fechaLegible = (f: string | null) => !f ? null : /^\d{4}-\d{2}-\d{2}$/.test(f)
  ? new Date(f + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' }) : f

/** '/terminos', '/terminos/' o el hash '/terminos' → 'terminos' si existe ese texto legal; si no, null. */
export const rutaLegal = (p: string) => { const s = p.replace(/^\/+|\/+$/g, ''); return s && s in DOCS ? s : null }
