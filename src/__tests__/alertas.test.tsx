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

describe('Aviso v2 (componente)', () => {
  const html = (tono: 'paso' | 'logro' | 'error') => renderToStaticMarkup(<Aviso tono={tono} titulo="Depósito guardado" onCerrar={() => {}}><p>Hecho</p></Aviso>)
  it('no es un diálogo: tarjeta enfocable con nombre «Aviso. Toca para cerrar», título y texto enlazados', () => {
    const h = html('paso')
    expect(h).not.toContain('role="dialog"'); expect(h).not.toContain('alertdialog'); expect(h).not.toContain('aria-modal'); expect(h).not.toContain('aviso-velo')
    expect(h).toContain('tabindex="0"'); expect(h).toContain('aria-label="Aviso. Toca para cerrar"')
    const [t, d] = h.match(/aria-describedby="([^"]+)"/)![1].split(' ')
    expect(t).not.toBe(d); expect(h).toContain(`id="${t}"`); expect(h).toContain(`id="${d}"`)
    expect(h).toMatch(/<h2 id="[^"]+" class="aviso-pop__titulo">Depósito guardado<\/h2>/)
  })
  it('sin X ni botones; se esconde solo a los 5 s, con pausa (dedo, mouse o foco) y cierre con clic, Enter, Espacio o Esc', () => {
    const h = html('error'); expect(h).not.toContain('<button'); expect(h).not.toContain('Cerrar aviso')
    const c = leer('../Aviso.tsx')
    expect(c).toContain('export const DURACION_AVISO = 5000')
    for (const x of ['onClick={cerrar}', "e.key === 'Enter' || e.key === ' ' || e.key === 'Escape'", 'onPointerEnter', 'onPointerLeave', 'onPointerDown', 'onFocus', 'onBlur', "e.key === 'Escape') cerrarRef.current()"]) expect(c).toContain(x)
    expect(c).not.toMatch(/\.focus\(\)[^\n]*aviso-pop/)   // no roba el foco al aparecer
    for (const x of ['new ResizeObserver(poner)', "addEventListener('scroll', poner", 'new MutationObserver(', 'tam?.disconnect()', 'cambios?.disconnect()']) expect(c).toContain(x)   // sigue al título si el contenido cambia; limpia al desmontar
    expect(css).toContain('.aviso-pop--pausa .aviso-pop__tiempo{animation-play-state:paused}')
  })
  it('zonas fijas para lectores de pantalla: status (amable) en pasos y logros, alert en errores', () => {
    const z = leer('../Alertas.tsx')
    expect(z).toContain('<div className="aviso-zona" role="status" aria-live="polite">{tono !== \'error\' && aviso}</div>')
    expect(z).toContain('<div className="aviso-zona" role="alert">{tono === \'error\' && aviso}</div>')
  })
  it('lleva la casita oficial completa: mismo viewBox del logo, sin recortes, con la llave y sin ids repetidos', () => {
    const h = html('logro')
    expect(h).toContain('class="aviso-pop aviso-pop--logro"')
    expect(h).toContain('viewBox="419.5 65.25 420.25 408.25"'); expect(h).toContain('overflow="visible"')
    for (const c of ['aviso-logo__planta', 'aviso-logo__franja', 'aviso-logo__puerta', 'aviso-logo__cerradura', 'aviso-logo__llave']) expect(h).toContain(c)
    expect(h).not.toContain('id="casa-clip"'); expect(h).toContain('url(#aviso-casa-clip)')
    expect(leer('../logoLandingMarkup.ts')).toContain('viewBox=\\"419.5 65.25 420.25 408.25\\"')
  })
  it('CSS: tarjeta crema de 26 px, 320 px en escritorio y 366 px en celular; la llave gira una vez (~2 s) solo en logros', () => {
    expect(css).toMatch(/\.aviso-pop\{[^}]*border-radius:26px/); expect(css).toContain('width:320px'); expect(css).toContain('max-width:366px')
    expect(css).toContain('.aviso-pop--logro .aviso-logo__llave{animation:aviso-llave 2s var(--ease) 250ms both}')
    expect(css).not.toMatch(/aviso-llave[^;}]*infinite/)
    expect(css).toMatch(/\.aviso-pop__esquina\{[^}]*overflow:visible/); expect(css).toMatch(/\.aviso-pop__logo svg\{[^}]*overflow:visible/)
  })
  it('respeta prefers-reduced-motion (también la llave)', () => {
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion:reduce){\n  .aviso-pop{'))
    expect(rm).toContain('.aviso-logo__llave,.aviso-logo__cerradura{transform:none!important;opacity:1}'); expect(rm).toContain('.aviso-pop__tiempo{animation:none!important')
  })
  it('tono de cada aviso: logros en verde, errores en terracota, el resto miel', () => {
    expect(al.tonoDe({ paso: 'pago' })).toBe('logro'); expect(al.tonoDe({ paso: 'contrato-firmado' })).toBe('logro'); expect(al.tonoDe({ paso: 'devolucion' })).toBe('logro')
    expect(al.tonoDe({ paso: 'crear' })).toBe('paso'); expect(al.tonoDe(al.alertaIngresoFallo())).toBe('error')
  })
  it('el texto separa qué pasó y qué sigue', () => {
    const h = renderToStaticMarkup(<TextoAlerta a={{ paso: 'x', titulo: 'T', hecho: 'Pasó esto.', sigue: 'Hacer aquello.' }} />)
    expect(h).toBe('<p>Pasó esto.</p><p class="aviso-pop__sigue"><strong>Lo que sigue:</strong> Hacer aquello.</p>')
  })
  it('«Tomar foto» usa el ícono de cámara de la app (sin emoji)', () => {
    const c = leer('../Camara.tsx'); expect(c).toContain('<Icono id="i-camara" />'); expect(c).not.toMatch(EMOJI)
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
    expect((await paso(() => acciones.pagar(a()))).titulo).toBe('¡Depósito guardado!')
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
    expect(app).toContain('avisar(alertaIngreso(modoReal))'); expect(app).toContain("setRegreso('fallo'); avisar(alertaIngresoFallo())")
    expect(app.match(/<Alertas \/>/g)).toHaveLength(3)   // Entrar, «Entrando…» y con sesión
  })
})

describe('textos de los avisos', () => {
  it('textos aprobados por Legal (23 oct): depósito guardado y mediación', () => {
    const base = { id: '1', direccion: 'Casa', monto: 20, ventanaSegundos: 604800, diasSimulados: 0, contrato: { firmas: {} }, entrada: { firmas: {} } }
    const p = al.alertaPorCambio({ ...base, estado: 'pendiente_pago' } as never, { ...base, estado: 'fotos_entrada' } as never, 'inquilino', VIDEO)!
    expect(p.titulo).toBe('¡Depósito guardado!'); expect(p.hecho).toMatch(/^[^a-z]*20[^a-z]* guardados en una cuenta segura de la red de prueba\. Nadie puede sacarlos solo\.$/)   // «20 USDC» en la app (formato de usd())
    const m = al.alertaPorCambio({ ...base, estado: 'reclamo' } as never, { ...base, estado: 'mediacion' } as never, 'inquilino', VIDEO)!
    expect(m.sigue).toBe('En esta prueba, decides tú el reparto con «Resolver el reclamo (simulación)».')
    expect(leer('../screens/Detalle.tsx')).toContain("'Resolver el reclamo (simulación)'"); expect(leer('../screens/Detalle.tsx')).not.toContain('Decidir como persona mediadora')
  })
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
    for (const x of t) { expect(x.titulo.length).toBeGreaterThan(5); expect(x.hecho.length).toBeGreaterThan(10); if (x.paso !== 'ingreso' && x.paso !== 'ingreso-fallo') expect(x.sigue).toBeTruthy() }
  })
  it('sin emojis, sin «liberado» y sin palabras técnicas', () => {
    for (const x of todas()) {
      const s = [x.titulo, x.hecho, x.sigue ?? ''].join(' ')
      expect(s).not.toMatch(EMOJI); expect(s).not.toMatch(/liberad|liberó|escrow|blockchain|wallet|hash|testnet|USDC de/i)
    }
  })
  it('el error dice cómo seguir (texto corto aprobado por Legal)', () => {
    const e = al.alertaIngresoFallo(); expect(e.tipo).toBe('error'); expect(e.titulo).toBe('El ingreso no terminó'); expect(e.hecho).toBe('Toca Entrar y elige tu cuenta.')
  })
  it('los textos con sentido legal están marcados para Legal', () => {
    expect(leer('../alertas.ts').match(/\/\/ LEGAL: revisar/g)!.length).toBeGreaterThanOrEqual(8)
  })
})

describe('error del ingreso escrito en Entrar', () => {
  it('Login con error: texto de Legal, asociado al botón Entrar; sin error no aparece', async () => {
    const { Login, Entrando } = await import('../screens/Login')
    const con = renderToStaticMarkup(<Login onOk={() => {}} error />), sin = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(con).toContain('<div id="error-ingreso" class="entrada-app__error"><strong>El ingreso no terminó</strong> <span>Toca Entrar y elige tu cuenta.</span></div>')
    expect(con).toMatch(/<button[^>]*aria-describedby="error-ingreso"[^>]*>Entrar<\/button>/)
    expect(sin).not.toContain('error-ingreso')
    const e = renderToStaticMarkup(<Entrando />)
    expect(e).toContain('aria-busy="true"'); expect(e).toContain('role="status"'); expect(e).toContain('Entrando a tu cuenta…'); expect(e).not.toContain('<button')
  })
  it('App: «Entrando…» mientras se confirma el regreso; el error queda hasta volver a intentar o entrar', () => {
    const a = leer('../App.tsx')
    expect(a).toContain("if (!u && regreso === 'esperando') return <Fondo>{skip}<Alertas /><Entrando /></Fondo>")
    expect(a).toContain(".catch(() => { setRegreso('fallo'); avisar(alertaIngresoFallo()) })")
    expect(a).toContain("error={regreso === 'fallo'} onReintento={() => setRegreso(null)}")
    expect(a).toContain('const entro = (x: Usuario) => { setRegreso(null);')
    expect(leer('../screens/Login.tsx')).toContain('onReintento?.(); setAbierta(true)')
  })
})

describe('aviso al inicio del orden de Tab', () => {
  const app = leer('../App.tsx')
  it('<Alertas /> va justo después de «Saltar al contenido» en las tres vistas (sin sesión, entrando y con sesión)', () => {
    const fondos = app.match(/<Fondo>\{skip\}[\s\S]*?<\/Fondo>/g)!.filter(f => f.includes('<Alertas />'))
    expect(fondos).toHaveLength(3)
    for (const f of fondos) expect(f).toMatch(/^<Fondo>\{skip\}\s*<Alertas \/>/)
    expect(app).not.toMatch(/<Pie \/>\s*<Alertas \/>/)
  })
  it('sigue sin robar el foco: el aviso no se enfoca solo al aparecer', () => {
    const av = leer('../Aviso.tsx')
    expect(av).not.toMatch(/autoFocus/)
    expect(av).toContain('tabIndex={0}')
  })
})
