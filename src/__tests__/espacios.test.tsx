// «+ Agregar espacio»: id fijo, migración de datos viejos, salida copiada de la entrada, reglas (12 espacios, 2-30 letras, sin duplicados),
// acciones locales (agregar, renombrar, quitar con respaldo y deshacer), textos de Legal (23/10), texto libre escapado y mapeo del servidor por id.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler, Acta, Foto } from '../types'

const K = 'lockumi.alquileres.v3'
const viejaActa = { firmas: {}, cuartos: ['Sala', 'Cocina', 'Dormitorio', 'Baño'].map(nombre => ({ nombre, nota: '', fotos: [], items: [{ texto: 'Piso', estado: null }] })) }
const VIEJO = { id: 'v1', direccion: 'Apartamento en Barreal de Heredia', monto: 20, moneda: 'USD', inicio: '2026-11-01', fin: '2027-05-01', reglas: [], duenoEmail: 'dueno@ejemplo.cr',
  inquilinoEmail: 'demo@lockumi.com', estado: 'salida', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: viejaActa, salida: structuredClone(viejaActa), diasSimulados: 0 }
const mem = new Map<string, string>([[K, JSON.stringify([VIEJO])]])
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })

const E = await import('../espacios')
const { store } = await import('../store')
const { acciones } = await import('../acciones')
const { ListaEspacios } = await import('../screens/Espacios')
const { aAlquiler } = await import('../servidor/mapeo')
const { alertaEspacioAgregado, alertaNombreCambiado, alertaEspacioQuitado } = await import('../alertas')
const { fotoEjemplo } = await import('../demoFotos')
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const leer = (r: string) => fs.readFileSync(new URL(r, import.meta.url), 'utf8')

const foto = (n = 'x'): Foto => ({ src: 'data:image/svg+xml,' + n, por: 'inquilino', fecha: '2026-10-24T07:00:00Z', origen: 'ejemplo' })
const nuevo = () => {
  const a = store.crear({ direccion: 'Apartamento en Barreal de Heredia', monto: 20, inicio: '2026-11-01', fin: '2027-05-01', reglas: [], duenoEmail: 'dueno@ejemplo.cr', inquilinoEmail: 'demo@lockumi.com' })
  store.cambiar(a.id, x => { x.estado = 'fotos_entrada' }); return a.id
}
const A = (id: string) => store.obtener(id)!

describe('migración de datos viejos (localStorage)', () => {
  it('los espacios sin id reciben uno por posición; la salida ya creada no se rehace', () => {
    const v = A('v1')
    expect(v.entrada.cuartos.map(c => c.id)).toEqual(['sala', 'cocina', 'dormitorio', 'bano'])
    expect(v.salida!.cuartos.map(c => c.id)).toEqual(['sala', 'cocina', 'dormitorio', 'bano'])
    expect(v.salida!.cuartos[1].nombre).toBe('Cocina')
  })
  it('migrarActa: ids repetidos o de más de 4 espacios', () => {
    const m = E.migrarActa({ firmas: {}, cuartos: [{ id: 'sala' }, {}, {}, {}, {}].map((c, i) => ({ ...c, nombre: 'E' + i, nota: '', fotos: [], items: [] })) } as unknown as Acta)!
    expect(m.cuartos.map(c => c.id)).toEqual(['sala', 'cocina', 'dormitorio', 'bano', 'espacio-5'])
    const ya = E.actaVacia(); expect(E.migrarActa(ya)).toBe(ya)
  })
})

describe('reglas', () => {
  const acta = E.actaVacia()
  it('nombres: vacío, 2 a 30 letras, sin duplicados (sin mayúsculas ni tildes), sin emojis ni saltos de línea', () => {
    expect(E.errorNombre(acta, '   ')).toBe('Escribe un nombre.')
    expect(E.errorNombre(acta, 'x')).toMatch(/al menos 2/)
    expect(E.errorNombre(acta, 'a'.repeat(31))).toBe('Máximo 30 letras.')
    expect(E.errorNombre(acta, 'bano')).toBe('Ya hay un espacio con ese nombre.')
    expect(E.errorNombre(acta, '  SALA ')).toBe('Ya hay un espacio con ese nombre.')
    expect(E.errorNombre(acta, 'Patio')).toBe('')
    expect(E.limpiar('Patio 🌴\n  grande')).toBe('Patio grande')
    expect(E.errorNombre(acta, 'Baño', 'bano')).toBe('')   // renombrar: el mismo espacio no choca consigo
  })
  it('máximo 12 espacios', () => {
    const lleno: Acta = { firmas: {}, cuartos: Array.from({ length: 12 }, (_, i) => ({ id: 'e' + i, nombre: 'E' + i, nota: '', fotos: [], items: [] })) }
    expect(E.errorNombre(lleno, 'Patio')).toBe('Llegaste al máximo de 12 espacios.')
  })
  it('plantillas y sugerencias', () => {
    expect(E.SUGERENCIAS).toEqual(['Patio', 'Cochera', 'Cuarto de pilas', 'Balcón', 'Bodega', 'Jardín', 'Oficina'])
    expect(E.plantilla('Patio')).toEqual(['Piso o zacate', 'Paredes y portón', 'Luces y enchufes', 'Desagües'])
    expect(E.plantilla('jardin')).toEqual(E.plantilla('Patio'))
    expect(E.plantilla('Cochera')).toEqual(['Piso', 'Portón y control', 'Luces'])
    expect(E.plantilla('Cuarto de pilas')).toEqual(['Pila y grifería', 'Piso', 'Conexión de lavadora'])
    expect(E.plantilla('Balcón')).toEqual(['Piso', 'Baranda', 'Puerta y vidrios'])
    expect(E.plantilla('Bodega')).toEqual(['Piso', 'Paredes', 'Puerta y llavín'])
    expect(E.plantilla('Oficina')).toEqual(['Paredes y pintura', 'Piso', 'Ventanas', 'Luces y enchufes'])
    expect(E.plantilla('Terraza')).toEqual(['Piso', 'Paredes y pintura', 'Puertas y llavín', 'Luces y enchufes'])
    const conPatio: Acta = { ...acta, cuartos: [...acta.cuartos, E.cuartoNuevo('Patio', [])] }
    expect(E.sugerirNombre(conPatio, 'patio')).toBe('patio 2')
  })
  it('puntos: hasta 8, de hasta 60 letras, sin vacíos ni repetidos', () => {
    expect(E.limpiarPuntos(['Piso', 'piso', '', 'x'.repeat(70), ...'abcdefgh'])).toHaveLength(8)
    expect(E.limpiarPuntos(['x'.repeat(70)])[0]).toHaveLength(60)
  })
  it('actaDesde: la salida copia id, nombres y puntos, sin estado, fotos ni notas', () => {
    const e = E.actaVacia(); e.cuartos.push({ ...E.cuartoNuevo('Patio', ['Piso'], 'inquilino'), fotos: [foto()], nota: 'n' }); e.cuartos[0].items[0].estado = 'bien'
    const s = E.actaDesde(e)
    expect(s.cuartos.map(c => c.id)).toEqual(e.cuartos.map(c => c.id))
    expect(s.cuartos[4]).toMatchObject({ nombre: 'Patio', propio: true, agregadoPor: 'inquilino', nota: '', fotos: [] })
    expect(s.cuartos[0].items[0].estado).toBeNull()
  })
})

describe('acciones locales', () => {
  beforeEach(() => { mem.delete(K) })
  it('agregar: al final, propio, quién lo agregó, evento y borra confirmaciones; rechaza duplicados (otra pestaña)', async () => {
    const id = nuevo(); store.cambiar(id, x => { x.entrada.firmas = { dueno: 'x' } })
    const cid = await acciones.agregarCuarto!(A(id), ' Patio ', ['Piso o zacate', 'Desagües'], 'inquilino')
    const c = A(id).entrada.cuartos.at(-1)!
    expect(c).toMatchObject({ id: cid, nombre: 'Patio', propio: true, agregadoPor: 'inquilino' })
    expect(c.items.map(i => i.texto)).toEqual(['Piso o zacate', 'Desagües'])
    expect(A(id).entrada.firmas).toEqual({})
    expect(A(id).historial.at(-1)!.texto).toBe('Se agregó el espacio Patio')
    await expect(acciones.agregarCuarto!(A(id), 'PATIO', [], 'dueno')).rejects.toThrow('Ya hay un espacio con ese nombre.')
  })
  it('renombrar: mismo id y fotos; quitar con fotos: quedan de respaldo; deshacer: vuelve a su lugar', async () => {
    const id = nuevo()
    store.cambiar(id, x => { x.entrada.cuartos[1].fotos.push(foto('c')) })
    await acciones.renombrarCuarto!(A(id), 'cocina', 'Cocineta')
    expect(A(id).entrada.cuartos[1]).toMatchObject({ id: 'cocina', nombre: 'Cocineta' })
    expect(A(id).entrada.cuartos[1].fotos).toHaveLength(1)
    await acciones.quitarCuarto!(A(id), 'cocina', 'inquilino')
    expect(A(id).entrada.cuartos.map(c => c.id)).toEqual(['sala', 'dormitorio', 'bano'])
    expect(A(id).quitados![0]).toMatchObject({ pos: 1, por: 'inquilino', cuarto: { id: 'cocina' } })
    expect(A(id).quitados![0].cuarto.fotos).toHaveLength(1)
    expect(A(id).historial.at(-1)!.texto).toBe('Se quitó el espacio Cocineta; sus 1 fotos quedan como respaldo en el historial')
    await acciones.deshacerQuitar!(A(id), 'cocina')
    expect(A(id).entrada.cuartos.map(c => c.id)).toEqual(['sala', 'cocina', 'dormitorio', 'bano'])
    expect(A(id).quitados).toBeUndefined()
  })
  it('debe quedar al menos 1; la lista queda fija con las dos confirmaciones', async () => {
    const id = nuevo()
    for (const k of ['sala', 'cocina', 'dormitorio']) await acciones.quitarCuarto!(A(id), k, 'dueno')
    await expect(acciones.quitarCuarto!(A(id), 'bano', 'dueno')).rejects.toThrow('Tiene que quedar al menos 1 espacio.')
    store.cambiar(id, x => { x.entrada.firmas = { dueno: 'x', inquilino: 'y' } })
    expect(E.listaFija(A(id))).toBe(true)
    await expect(acciones.agregarCuarto!(A(id), 'Patio', [], 'dueno')).rejects.toThrow(E.TXT.bloqueado)
  })
  it('la salida copia la entrada y la comparación empareja por id (no por posición)', async () => {
    const id = nuevo()
    const pid = await acciones.agregarCuarto!(A(id), 'Patio', [], 'inquilino')
    await acciones.quitarCuarto!(A(id), 'cocina', 'inquilino')
    store.cambiar(id, x => { x.entrada.cuartos.find(c => c.id === pid)!.fotos.push(foto('p')); x.estado = 'en_curso' })
    await acciones.iniciarSalida(A(id))
    const a = A(id)
    expect(a.salida!.cuartos.map(c => c.id)).toEqual(['sala', 'dormitorio', 'bano', pid])
    expect(E.parEnEntrada(a, a.salida!.cuartos[3])!.fotos).toHaveLength(1)
    expect(a.salida!.cuartos[3].fotos).toHaveLength(0)
    expect(leer('../screens/Acta.tsx')).toMatch(/parEnEntrada\(a, c\)/)
    expect(leer('../screens/Acta.tsx')).not.toMatch(/a\.entrada\.cuartos\[idx\]/)
  })
})

describe('pantalla y textos', () => {
  const base = (): Alquiler => { const id = nuevo(); return A(id) }
  it('lista de entrada: filas, «Agregado», «+ Agregar espacio» y la ayuda', async () => {
    mem.delete(K); const a0 = base(); await acciones.agregarCuarto!(a0, 'Patio', [], 'inquilino'); const a = A(a0.id)
    const html = renderToStaticMarkup(<ListaEspacios a={a} cual="entrada" rol="inquilino" onAbrir={() => {}} />)
    expect(html).toContain('Agregado'); expect(html).toContain('Agregar espacio'); expect(html).toContain(E.TXT.ayuda)
    expect(html).toContain('Sin fotos · 0 de 3 revisados'); expect(html).toContain('aria-label="Opciones de Patio"')
  })
  it('lista fija: sin «⋯» ni «+ Agregar espacio», con la nota', () => {
    mem.delete(K); const a = { ...base(), entrada: { ...E.actaVacia(), firmas: { dueno: 'x', inquilino: 'y' } } }
    const html = renderToStaticMarkup(<ListaEspacios a={a} cual="entrada" rol="inquilino" onAbrir={() => {}} />)
    expect(html).not.toContain('Agregar espacio'); expect(html).not.toContain('Opciones de'); expect(html).toContain(E.TXT.bloqueado)
  })
  it('salida: notas arriba y abajo y «Al entrar: N foto(s)»', () => {
    mem.delete(K); const e = E.actaVacia(); e.cuartos[0].fotos.push(foto())
    const a = { ...base(), estado: 'salida' as const, entrada: e, salida: E.actaDesde(e) }
    const html = renderToStaticMarkup(<ListaEspacios a={a} cual="salida" rol="inquilino" onAbrir={() => {}} />)
    expect(html).toContain(E.TXT.salidaArriba); expect(html).toContain(E.TXT.salidaAbajo); expect(html).toContain('Al entrar: 1 foto'); expect(html).toContain('Al entrar: 0 fotos')
    expect(html).not.toContain('Agregar espacio')
  })
  it('el texto libre se escapa siempre (pantalla y foto de ejemplo)', () => {
    mem.delete(K); const a = base(); const malo = '<img src=x onerror=alert(1)>'
    a.entrada.cuartos.push({ ...E.cuartoNuevo('Patio', [malo]), nombre: malo })
    const html = renderToStaticMarkup(<ListaEspacios a={a} cual="entrada" rol="inquilino" onAbrir={() => {}} />)
    expect(html).not.toContain('<img src=x'); expect(html).toContain('&lt;img src=x')
    expect(decodeURIComponent(fotoEjemplo(malo, 'entrada'))).toContain('&lt;img src=x')
  })
  it('textos exactos de Legal (23/10) y marcas', () => {
    expect(E.TXT.quienVe).toBe('En esta demo, el dueño es un rol de prueba que confirma solo. Cuando los dos usen la app, los dos verán la misma lista y quién agregó cada espacio. Los espacios se usan en la entrada y en la salida.')
    expect(E.textoQuitar(2)).toBe('Este espacio ya tiene 2 fotos y su lista revisada. Si lo quitas, salen de las fotos de entrada, pero quedan guardadas en el historial del alquiler como respaldo.')
    expect(E.textoQuitar(0)).toBe('También sale de las fotos de salida, para que las dos listas sigan iguales.')
    expect(E.preguntaQuitar('Patio')).toBe('¿Quitar «Patio»?'); expect(E.TXT.mantener).toBe('Mantener el espacio'); expect(E.TXT.quitar).toBe('Quitar espacio')
    expect(E.TXT.bloqueado).toBe('La lista de espacios quedó fija cuando los dos confirmaron las fotos de entrada.')
    expect(E.contador(5)).toBe('5 de 30')
    const ui = leer('../screens/Espacios.tsx')
    expect(ui).toMatch(/TXT\.mantener\}<\/button>\s*<button[^>]*>\{TXT\.quitar\}/)   // «Mantener el espacio» primero
    expect(ui).not.toMatch(/Quitar con las fotos/)                                        // texto viejo reemplazado por Legal
    expect(ui).toMatch(/role="alertdialog"/); expect(ui).toMatch(/role="dialog"/); expect(ui).toMatch(/aria-haspopup="menu"/)
    expect(leer('../espacios.ts').match(/LEGAL: revisado \(23\/10\)/g)!.length).toBeGreaterThanOrEqual(8)
  })
  it('avisos v2: «Espacio agregado» con «Tomar foto →», «Nombre cambiado» sin botón y «Espacio quitado» con «Deshacer»', () => {
    const ag = alertaEspacioAgregado('Patio', 'p1')
    expect(ag).toMatchObject({ titulo: 'Espacio agregado', linea: { texto: 'Patio está en la lista. Ahora: una foto' }, accion: { texto: 'Tomar foto →', ir: 'espacio', dato: 'p1' } })
    const nc = alertaNombreCambiado('Terraza'); expect(nc.titulo).toBe('Nombre cambiado'); expect(nc.linea!.texto).toBe('Ahora se llama Terraza'); expect(nc.accion).toBeUndefined()
    expect(alertaEspacioQuitado('Patio', 'p1')).toMatchObject({ titulo: 'Espacio quitado', linea: { texto: 'Patio salió de la lista' }, accion: { texto: 'Deshacer', ir: 'deshacer-espacio' } })
  })
})

describe('servidor: mapeo por id', () => {
  it('fotos por cuarto_id (y por índice si son viejas); las quitadas no salen', () => {
    const fotoF = (id: string, cuarto: number, cuarto_id: string | null, quitada_en: string | null = null) => ({ id, etapa: 'entrada' as const, cuarto, cuarto_id, quitada_en, por_rol: 'inquilino' as const,
      ruta: 'r/' + id, sha256: 'a'.repeat(64), sha256_original: null, tomada_en: '2026-10-24T07:00:00Z', fecha_archivo: null, origen: 'camara' as const, posible_galeria: false, subido_en: '2026-10-24T07:00:00Z' })
    const a = aAlquiler({ contrato: { id: 'c', direccion: 'x', monto: 20, inicio: '2026-11-01', fin: '2027-05-01', reglas: [], email_inquilino: 'demo@lockumi.com', estado: 'fotos_entrada', ventana_inicio: null, ventana_segundos: 60,
      escrow_contract_id: null, resultado: null, liquidacion_tx: null, creado_en: '', actualizado_en: '' }, participantes: [], firmas: [], reclamo: null, eventos: [],
      actas: [{ etapa: 'entrada', cuartos: [{ nombre: 'Sala', nota: '', items: [] }, { id: 'p', nombre: 'Patio', propio: true, agregado_por: 'dueno', nota: '', items: [] }] }],
      fotos: [fotoF('1', 0, null), fotoF('2', 0, 'p'), fotoF('3', 1, 'p', '2026-10-24T08:00:00Z')] }, 'yo', r => r)
    expect(a.entrada.cuartos.map(c => c.id)).toEqual(['sala', 'p'])
    expect(a.entrada.cuartos[0].fotos.map(f => f.id)).toEqual(['1'])
    expect(a.entrada.cuartos[1].fotos.map(f => f.id)).toEqual(['2'])
    expect(a.entrada.cuartos[1]).toMatchObject({ propio: true, agregadoPor: 'dueno' })
  })
  it('la migración SQL existe, es local y trae las 3 RPC', () => {
    const sql = leer('../../supabase/migrations/20261024000000_lk_espacios.sql')
    for (const f of ['lk_agregar_cuarto', 'lk_renombrar_cuarto', 'lk_quitar_cuarto', 'cuarto_id', 'quitada_en']) expect(sql).toContain(f)
    expect(sql).toMatch(/No se aplicó en ningún proyecto real/)
    expect(sql).not.toMatch(/delete from public\.lk_fotos/)   // las fotos de un espacio quitado no se borran
  })
})
