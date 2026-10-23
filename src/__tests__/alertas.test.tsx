// Avisos emergentes de cada paso (src/alertas.ts + src/Aviso.tsx) y arreglo de la caja «Te toca / Al dueño / Qué sigue».
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })

const { Aviso } = await import('../Aviso')
const { TextoAlerta } = await import('../Alertas')
const al = await import('../alertas')
const { acciones } = await import('../acciones')
const { store } = await import('../store')
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const leer = (r: string) => fs.readFileSync(new URL(r, import.meta.url), 'utf8')
const css = leer('../index.css')

const VIDEO = { prueba: true, video: true, red: true }
const LOCAL = { prueba: false, video: false, red: false }
const EMOJI = /\p{Extended_Pictographic}/u

describe('caja «Qué toca ahora» (.turno) con hidden', () => {
  it('el CSS respeta el atributo hidden (display:grid ya no le gana)', () => {
    expect(css).toMatch(/\.turno\{display:grid;/)
    expect(css).toMatch(/\.turno\[hidden\]\{display:none\}/)
    expect(css.indexOf('.turno[hidden]')).toBeGreaterThan(css.indexOf('.turno{display:grid'))
  })
  it('Detalle sigue ocultándola en el modo video', () => {
    expect(leer('../screens/Detalle.tsx')).toContain('<section className="turno" aria-label="Qué toca ahora" hidden={modoVideo}>')
  })
})

describe('Aviso (componente)', () => {
  const html = (tipo: 'exito' | 'error', icono?: string) => renderToStaticMarkup(<Aviso tipo={tipo} titulo="Depósito guardado" icono={icono} boton="Continuar" onCerrar={() => {}}><p>Hecho</p></Aviso>)
  it('es un diálogo modal con título y descripción enlazados por id', () => {
    const h = html('exito')
    expect(h).toContain('role="dialog"'); expect(h).toContain('aria-modal="true"')
    const t = h.match(/aria-labelledby="([^"]+)"/)![1], d = h.match(/aria-describedby="([^"]+)"/)![1]
    expect(t).not.toBe(d); expect(h).toContain(`id="${t}"`); expect(h).toContain(`id="${d}"`)
    expect(h).toMatch(/<h2 id="[^"]+" class="aviso-pop__titulo">Depósito guardado<\/h2>/)
  })
  it('los errores son alertdialog', () => { expect(html('error')).toContain('role="alertdialog"') })
  it('tiene un botón Cerrar claro y el botón principal', () => {
    const h = html('exito')
    expect(h).toContain('aria-label="Cerrar"'); expect(h).toMatch(/aviso-pop__boton"[^>]*>Continuar<\/button>/)
  })
  it('usa el ícono del sprite de la app cuando se lo pasan', () => {
    expect(html('exito', 'i-candado')).toContain('href="#i-candado"')
    expect(html('exito')).toContain('aviso-pop__trazo')
    for (const id of ['i-registro', 'i-check', 'i-candado', 'i-camara', 'i-escudo', 'i-balanza', 'i-flecha']) expect(leer('../../index.html')).toContain(`<symbol id="${id}"`)
  })
  it('respeta prefers-reduced-motion (también el ícono)', () => {
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion:reduce){\n  .aviso-velo'))
    expect(rm).toContain('.aviso-pop__icono{animation:none!important;opacity:1}')
  })
  it('el texto separa qué pasó y qué sigue', () => {
    const h = renderToStaticMarkup(<TextoAlerta a={{ paso: 'x', titulo: 'T', hecho: 'Pasó esto.', sigue: 'Hacer aquello.' }} />)
    expect(h).toBe('<p>Pasó esto.</p><p class="aviso-pop__sigue"><strong>Lo que sigue</strong>Hacer aquello.</p>')
  })
})

describe('cola de avisos', () => {
  it('muestra de a uno, en orden, sin repetir', () => {
    al.vaciarAlertas()
    const a = { paso: 'a', titulo: 'A', hecho: '.' }, b = { paso: 'b', titulo: 'B', hecho: '.' }
    al.avisar(a); al.avisar(a); al.avisar(b); al.avisar(null)
    expect(al.alertaActual()).toBe(a); al.cerrarAlerta(); expect(al.alertaActual()).toBe(b); al.cerrarAlerta(); expect(al.alertaActual()).toBeNull()
  })
})

describe('cada paso del flujo dispara su aviso', () => {
  it('flujo completo con acciones reales (demo local): crear, firmas, pago, fotos, salida, plazo, devolución', async () => {
    const { id } = await acciones.crear({ direccion: 'Casa en Heredia', monto: 300, inicio: '2026-11-01', fin: '2027-05-01', reglas: [], inquilinoEmail: 'i@x.cr' }, 'd@x.cr')
    const pasos: string[] = []
    const paso = async (f: () => Promise<unknown> | void, rol: 'dueno' | 'inquilino' = 'inquilino') => {
      const antes = al.instantanea(store.fresco(id)!); await f(); const x = al.alertaPorCambio(antes, store.fresco(id)!, rol, LOCAL)
      expect(x, 'sin aviso después de un paso').not.toBeNull(); pasos.push(x!.paso); return x!
    }
    const a = () => store.fresco(id)!
    expect((await paso(() => acciones.firmar(a(), 'contrato', 'inquilino'))).titulo).toBe('Firmaste el contrato')
    await paso(() => acciones.firmar(a(), 'contrato', 'dueno'))
    expect((await paso(() => acciones.pagar(a()))).titulo).toBe('Depósito guardado')
    expect((await paso(() => acciones.firmar(a(), 'entrada', 'dueno'))).titulo).toBe('El dueño confirmó las fotos de entrada')
    await paso(() => acciones.firmar(a(), 'entrada', 'inquilino'))
    await paso(() => acciones.iniciarSalida(a()))
    await paso(() => acciones.firmar(a(), 'salida', 'inquilino'))
    await paso(() => acciones.firmar(a(), 'salida', 'dueno'))
    await paso(() => store.cambiar(id, x => { x.diasSimulados += 7 }))
    const dev = await paso(() => acciones.cerrarSinReclamo(a()))
    expect(dev.hecho).toContain('volvió completo al inquilino')
    expect(pasos).toEqual(['contrato-firma-inquilino', 'contrato-firmado', 'pago', 'entrada-firma-dueno', 'entrada-confirmada', 'salida-inicio',
      'salida-firma-inquilino', 'salida-confirmada', 'adelantar', 'devolucion'])
  })
  it('reclamo, rechazo, mediación y reparto; y reclamo aceptado', async () => {
    const hasta = async () => {
      const { id } = await acciones.crear({ direccion: 'Apto', monto: 100, inicio: '2026-11-01', fin: '2027-05-01', reglas: [], inquilinoEmail: 'i@x.cr' }, 'd@x.cr')
      store.cambiar(id, x => { x.estado = 'ventana_reclamo'; x.ventanaInicio = new Date().toISOString() }); return id
    }
    const paso = async (id: string, f: () => Promise<unknown>) => { const antes = al.instantanea(store.fresco(id)!); await f(); return al.alertaPorCambio(antes, store.fresco(id)!, 'inquilino', VIDEO)! }
    const id = await hasta()
    const r = await paso(id, () => acciones.reclamar(store.fresco(id)!, 40, 'mancha en la pared', []))
    expect(r.paso).toBe('reclamo'); expect(r.sigue).toContain('(simulación)')
    expect((await paso(id, () => acciones.responder(store.fresco(id)!, false))).paso).toBe('mediacion')
    const m = await paso(id, () => acciones.decidir(store.fresco(id)!, 25))
    expect(m.paso).toBe('reparto'); expect(m.hecho).toContain('La persona mediadora (simulación) decidió')
    const id2 = await hasta()
    await paso(id2, () => acciones.reclamar(store.fresco(id2)!, 40, 'mancha en la pared', []))
    expect((await paso(id2, () => acciones.responder(store.fresco(id2)!, true))).paso).toBe('acuerdo')
  })
  it('cambiar de pantalla («Ver como») o cambios sin paso no avisan', () => {
    const a = { id: '1', estado: 'en_curso', diasSimulados: 0, contrato: { firmas: {} }, entrada: { firmas: {} } } as never
    expect(al.alertaPorCambio(a, a as never, 'dueno', VIDEO)).toBeNull()
    expect(al.alertaPorCambio(a, { ...(a as object), id: '2', estado: 'salida' } as never, 'dueno', VIDEO)).toBeNull()
  })
  it('las pantallas llaman a los avisos', () => {
    expect(leer('../screens/Detalle.tsx')).toContain('avisar(alertaPorCambio(x, a, rol))')
    expect(leer('../screens/Crear.tsx')).toContain("avisar(alertaCreado({ direccion: f.direccion.trim(), monto: m }))\n      ir('/alquiler/' + r.id)")
    const app = leer('../App.tsx')
    expect(app).toContain('avisar(alertaIngreso(modoReal))'); expect(app).toContain('.catch(() => avisar(alertaIngresoFallo()))')
    expect(app.match(/<Alertas \/>/g)).toHaveLength(2)
  })
})

describe('textos de los avisos', () => {
  const todas = () => {
    const base = { id: '1', direccion: 'Casa', monto: 20, ventanaSegundos: 604800, diasSimulados: 0, contrato: { firmas: {} }, entrada: { firmas: {} }, salida: { firmas: {} } }
    const r = (via: string) => ({ resultado: { via, dueno: 5, inquilino: 15, fecha: '' } })
    const casos: [object, object][] = [
      [{ estado: 'firmas' }, { estado: 'firmas', contrato: { firmas: { inquilino: 'x' } } }], [{ estado: 'firmas' }, { estado: 'pendiente_pago' }],
      [{ estado: 'pendiente_pago' }, { estado: 'fotos_entrada' }], [{ estado: 'fotos_entrada' }, { estado: 'fotos_entrada', entrada: { firmas: { inquilino: 'x' } } }],
      [{ estado: 'fotos_entrada' }, { estado: 'en_curso' }], [{ estado: 'en_curso' }, { estado: 'salida' }],
      [{ estado: 'salida' }, { estado: 'salida', salida: { firmas: { inquilino: 'x' } } }], [{ estado: 'salida' }, { estado: 'ventana_reclamo' }],
      [{ estado: 'ventana_reclamo' }, { estado: 'ventana_reclamo', diasSimulados: 7 }], [{ estado: 'ventana_reclamo' }, { estado: 'reclamo', reclamo: { monto: 5 } }],
      [{ estado: 'reclamo' }, { estado: 'mediacion' }], [{ estado: 'ventana_reclamo' }, { estado: 'cerrado', ...r('automatico') }],
      [{ estado: 'reclamo' }, { estado: 'cerrado', ...r('acuerdo') }], [{ estado: 'mediacion' }, { estado: 'cerrado', ...r('mediacion') }],
    ]
    return [VIDEO, LOCAL].flatMap(c => casos.map(([x, y]) => al.alertaPorCambio({ ...base, ...x } as never, { ...base, ...y } as never, 'inquilino', c)!))
      .concat(al.alertaCreado({ direccion: 'Casa', monto: 20 }), al.alertaIngreso(true), al.alertaIngreso(false), al.alertaIngresoFallo())
  }
  it('hay aviso para cada paso y todos dicen qué pasó (y casi todos qué sigue)', () => {
    const t = todas(); expect(t.every(Boolean)).toBe(true)
    expect(new Set(t.map(x => x.paso)).size).toBe(17)
    for (const x of t) { expect(x.titulo.length).toBeGreaterThan(5); expect(x.hecho.length).toBeGreaterThan(10); if (x.paso !== 'ingreso') expect(x.sigue).toBeTruthy() }
  })
  it('sin emojis, sin «liberado» y sin palabras técnicas', () => {
    for (const x of todas()) {
      const s = [x.titulo, x.hecho, x.sigue ?? '', x.boton ?? ''].join(' ')
      expect(s).not.toMatch(EMOJI); expect(s).not.toMatch(/liberad|liberó|escrow|blockchain|wallet|hash|testnet|USDC de/i)
    }
  })
  it('el error dice cómo seguir y es alertdialog', () => {
    const e = al.alertaIngresoFallo(); expect(e.tipo).toBe('error'); expect(e.sigue).toMatch(/Toca «Entrar»/)
  })
  it('los textos con sentido legal están marcados para Legal', () => {
    expect(leer('../alertas.ts').match(/\/\/ LEGAL: revisar/g)!.length).toBeGreaterThanOrEqual(8)
  })
})
