/** Conversor mínimo de Markdown a HTML para los textos legales (sin dependencias).
 *  Soporta: títulos #..####, párrafos, listas (- * + y 1.), citas (>), separadores (---), tablas simples,
 *  **negrita**, *cursiva*, `código` y [enlaces](url). Escapa todo el HTML del texto de origen. */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const idDe = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function enLinea(s: string): string {
  let t = esc(s)
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt: string, url: string) => {
    const seguro = /^(https?:|mailto:|\/|#)/i.test(url) ? url : '#'
    const ext = /^https?:/i.test(seguro) ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${seguro}"${ext}>${txt}</a>`
  })
  t = t.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`)
  t = t.replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>').replace(/(^|[^_\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>')
  return t
}

const sangria = (l: string) => l.match(/^\s*/)![0].replace(/\t/g, '    ').length
/** Lista con sub-listas por sangría (- * + o 1.). Las líneas sangradas sin viñeta continúan el ítem anterior. */
function lista(ls: string[]): string {
  const base = sangria(ls[0]); const ord = /^\s*\d+[.)]/.test(ls[0]); const items: { t: string; hijos: string[] }[] = []
  for (const l of ls) {
    const viñeta = /^\s*([-*+]|\d+[.)])\s+/.test(l)
    if (viñeta && sangria(l) <= base) items.push({ t: l.replace(/^\s*([-*+]|\d+[.)])\s+/, ''), hijos: [] })
    else if (viñeta && items.length) items[items.length - 1].hijos.push(l)
    else if (items.length) { const it = items[items.length - 1]; if (it.hijos.length) it.hijos[it.hijos.length - 1] += ' ' + l.trim(); else it.t += ' ' + l.trim() }
  }
  const tag = ord ? 'ol' : 'ul'
  return `<${tag}>${items.map(x => `<li>${enLinea(x.t)}${x.hijos.length ? lista(x.hijos) : ''}</li>`).join('')}</${tag}>`
}

export function aHtml(md: string): string {
  // Las notas internas para Legal (<!-- … --> en su propia línea) no se muestran en la página.
  const L = md.replace(/\r\n?/g, '\n').replace(/^<!--[\s\S]*?-->[ \t]*(\n|$)/gm, '').split('\n'); const out: string[] = []; let i = 0
  const esLista = (l: string) => /^\s*([-*+]|\d+[.)])\s+/.test(l)
  const esBloque = (l: string) => /^(#{1,6})\s|^\s*>|^\s*(---+|\*\*\*+)\s*$|^\s*\|/.test(l) || esLista(l)
  while (i < L.length) {
    const l = L[i]
    if (!l.trim()) { i++; continue }
    const h = l.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/)
    if (h) { const n = Math.min(h[1].length + 1, 6); out.push(`<h${n} id="${idDe(h[2])}">${enLinea(h[2])}</h${n}>`); i++; continue }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(l)) { out.push('<hr />'); i++; continue }
    if (/^\s*>/.test(l)) { const b: string[] = []; while (i < L.length && /^\s*>/.test(L[i])) b.push(L[i++].replace(/^\s*>\s?/, '')); out.push(`<blockquote>${aHtml(b.join('\n'))}</blockquote>`); continue }
    if (/^\s*\|/.test(l)) {
      const filas: string[][] = []; while (i < L.length && /^\s*\|/.test(L[i])) { const f = L[i++].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()); if (!f.every(c => /^:?-+:?$/.test(c))) filas.push(f) }
      const [cab, ...cuerpo] = filas
      out.push(`<div class="legal__tabla"><table><thead><tr>${cab.map(c => `<th>${enLinea(c)}</th>`).join('')}</tr></thead><tbody>${cuerpo.map(f => `<tr>${f.map(c => `<td>${enLinea(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)
      continue
    }
    if (esLista(l)) {
      const bloque: string[] = []
      while (i < L.length && (esLista(L[i]) || (L[i].trim() && /^\s{2,}/.test(L[i]) && bloque.length))) bloque.push(L[i++])
      out.push(lista(bloque)); continue
    }
    const p: string[] = []; while (i < L.length && L[i].trim() && !esBloque(L[i])) p.push(L[i++].trim())
    out.push(`<p>${p.map(enLinea).join('<br />')}</p>`)
  }
  return out.join('\n')
}
