// Avisos emergentes después de cada paso del flujo: confirman qué pasó y dicen qué sigue.
// Se muestran de a uno (cola). Las pantallas llaman a `avisar`; <Alertas /> (en App) los muestra con <Aviso />.
// Los textos con sentido legal están marcados con `// LEGAL: revisar` (pendientes de revisión de Legal).
import type { Alquiler, Rol } from './types'
import { NOMBRE, otro } from './flujo'
import { usd } from './ui'
import { textoPlazo } from './acciones'
import { modoReal } from './services/auth'
import { modoPrueba, modoVideo, escrowReal } from './servidor/config'

export interface Alerta {
  /** Paso del flujo (sirve para pruebas y capturas). */
  paso: string
  tipo?: 'exito' | 'error'
  titulo: string
  /** Qué pasó. */
  hecho: string
  /** Qué sigue. */
  sigue?: string
}

/** Logros del flujo: el aviso sale en verde y la llave del logo entra y gira una vez. */
export const LOGROS = new Set(['ingreso', 'contrato-firmado', 'pago', 'entrada-confirmada', 'devolucion', 'acuerdo'])
/** Tono del aviso: paso (miel), logro (verde) o error (terracota). */
export const tonoDe = (a: Pick<Alerta, 'paso' | 'tipo'>): 'paso' | 'logro' | 'error' => a.tipo === 'error' ? 'error' : LOGROS.has(a.paso) ? 'logro' : 'paso'

// ---- Cola ----
let cola: Alerta[] = []
const oyentes = new Set<() => void>()
const avisarCambio = () => oyentes.forEach(f => f())
export function avisar(a: Alerta | null | undefined) {
  if (!a) return
  if (cola.some(x => x.paso === a.paso && x.titulo === a.titulo)) return   // el mismo aviso no se repite en la cola
  cola = [...cola, a]; avisarCambio()
}
export function cerrarAlerta() { cola = cola.slice(1); avisarCambio() }
export const alertaActual = () => cola[0] ?? null
export function suscribirAlertas(f: () => void) { oyentes.add(f); return () => { oyentes.delete(f) } }
/** Solo para pruebas. */
export function vaciarAlertas() { cola = []; avisarCambio() }

// ---- Textos ----
export interface Contexto { prueba: boolean; video: boolean; red: boolean }
const CTX: Contexto = { prueba: modoPrueba, video: modoVideo, red: escrowReal }
const TERMINO = 'El alquiler terminó. No tienes nada pendiente.'
const quien = (r: Rol, c: Contexto) => r === 'dueno' && c.prueba ? 'El dueño de prueba' : r === 'dueno' ? 'El dueño' : 'El inquilino'

export const alertaIngreso = (real = modoReal): Alerta => ({
  paso: 'ingreso', titulo: '¡Ingresaste correctamente!',
  hecho: `${real ? 'Estamos preparando tu billetera.' : 'Te damos la bienvenida a la demo.'} Desde aquí puedes ver tus alquileres y crear un depósito protegido.`,
})
export const alertaIngresoFallo = (): Alerta => ({
  paso: 'ingreso-fallo', tipo: 'error', titulo: 'El ingreso no terminó',
  hecho: 'Toca Entrar y elige tu cuenta.',   // texto corto aprobado por Legal (23 oct 2026)
})

export const alertaCreado = (a: Pick<Alquiler, 'direccion' | 'monto'>, c = CTX): Alerta => ({
  paso: 'crear', titulo: 'Alquiler creado',
  hecho: `Guardamos el alquiler de ${a.direccion} con un depósito de ${usd(a.monto)}.`,
  sigue: c.prueba ? 'Leer el contrato y firmarlo. Después lo firma el dueño de prueba.' : 'Leer el contrato y firmarlo. Falta también la firma del inquilino.',
})

const ETAPA = { contrato: 'el contrato', entrada: 'las fotos de entrada', salida: 'las fotos de salida' } as const
function alertaFirma(etapa: keyof typeof ETAPA, quienFirmo: Rol, rol: Rol, c: Contexto): Alerta {
  const yo = quienFirmo === rol, falta = otro(quienFirmo)
  const verbo = etapa === 'contrato' ? 'firm' : 'confirm'
  const titulo = yo ? `${verbo === 'firm' ? 'Firmaste' : 'Confirmaste'} ${ETAPA[etapa]}` : `${quien(quienFirmo, c)} ${verbo}ó ${ETAPA[etapa]}`
  const hecho = etapa === 'contrato' ? 'La firma quedó guardada con la fecha y la hora.' : 'Las fotos y la lista quedaron guardadas con la fecha y la hora.'
  const sigue = c.prueba && falta === 'dueno'
    ? `El dueño de prueba ${etapa === 'contrato' ? 'lo firma' : 'las revisa y las confirma'} solo, en unos segundos.`
    : `Falta que el ${NOMBRE[falta]} ${etapa === 'contrato' ? 'lo firme' : 'las confirme'}.`
  return { paso: `${etapa}-firma-${quienFirmo}`, titulo, hecho, sigue }
}

/** Lo mínimo del alquiler para comparar antes y después (sin copiar las fotos). */
export type Instantanea = Pick<Alquiler, 'id' | 'estado' | 'diasSimulados'> & { contrato: Pick<Alquiler['contrato'], 'firmas'>; entrada: Pick<Alquiler['entrada'], 'firmas'>; salida?: { firmas: NonNullable<Alquiler['salida']>['firmas'] } }
export const instantanea = (a: Alquiler): Instantanea => ({
  id: a.id, estado: a.estado, diasSimulados: a.diasSimulados, contrato: { firmas: { ...a.contrato.firmas } }, entrada: { firmas: { ...a.entrada.firmas } },
  ...(a.salida ? { salida: { firmas: { ...a.salida.firmas } } } : {}),
})

/** Compara el alquiler antes y después de un cambio y devuelve el aviso del paso que acaba de pasar (o null). */
export function alertaPorCambio(antes: Instantanea, ahora: Alquiler, rol: Rol, c: Contexto = CTX): Alerta | null {
  if (antes.id !== ahora.id) return null
  const r = ahora.resultado
  if (antes.estado !== ahora.estado) switch (ahora.estado) {
    case 'pendiente_pago': return antes.estado !== 'firmas' ? null : {
      paso: 'contrato-firmado', titulo: 'Contrato firmado por los dos',
      hecho: c.prueba ? 'El dueño de prueba también firmó. El contrato ya tiene las dos firmas.' : 'El contrato ya tiene las dos firmas.',
      sigue: `Pagar el depósito de ${usd(ahora.monto)}.`,
    }
    case 'fotos_entrada': return {
      paso: 'pago', titulo: '¡Depósito guardado!',
      // LEGAL: revisar · texto corto de la red de prueba aprobado por Legal (23 oct 2026)
      hecho: c.red ? `${usd(ahora.monto)} guardados en una cuenta segura de la red de prueba. Nadie puede sacarlos solo.` : `El depósito de ${usd(ahora.monto)} quedó guardado. Nadie puede tomarlo solo.`,
      sigue: 'Tomar las fotos de entrada de cada espacio y marcar la lista.',
    }
    case 'en_curso': return {
      paso: 'entrada-confirmada', titulo: 'Empezó el alquiler',
      hecho: 'Los dos confirmaron las fotos de entrada. El depósito sigue guardado.',
      sigue: rol === 'inquilino' ? 'Cuando entregues el lugar, toca «Empezar fotos de salida».' : 'Cuando el inquilino entregue el lugar, cualquiera de los dos puede empezar las fotos de salida.',
    }
    case 'salida': return {
      paso: 'salida-inicio', titulo: 'Empezaron las fotos de salida',
      hecho: 'Ya pueden registrar cómo quedó el lugar.',
      sigue: 'Tomar una foto de cada espacio, marcar la lista y confirmar.',
    }
    case 'ventana_reclamo': return {
      paso: 'salida-confirmada', titulo: 'Fotos de salida confirmadas',
      hecho: `Los dos confirmaron las fotos de salida. Empiezan los ${textoPlazo(ahora)} para reclamos.`,
      // LEGAL: revisar
      sigue: c.video ? `Si el dueño de prueba no reclama en ${textoPlazo(ahora)}, el depósito vuelve al inquilino. En esta prueba puedes adelantar el plazo o hacer un reclamo en nombre del dueño de prueba.`
        : `Si el dueño no reclama en ${textoPlazo(ahora)}, el depósito vuelve al inquilino.`,
    }
    case 'reclamo': return !ahora.reclamo ? null : {
      paso: 'reclamo', titulo: 'Reclamo enviado',
      hecho: `${quien('dueno', c)} reclamó ${usd(ahora.reclamo.monto)} del depósito.`,
      // LEGAL: revisar
      sigue: `El inquilino acepta o no el reclamo. Si no lo acepta, pasa a una persona mediadora${c.prueba ? ' (simulación)' : ''}.`,
    }
    case 'mediacion': return {
      paso: 'mediacion', titulo: 'Pasa a una persona mediadora',
      hecho: `No hubo acuerdo con el reclamo.${c.prueba ? ' En esta prueba la persona mediadora es una simulación.' : ''}`,
      // LEGAL: revisar
      sigue: c.video ? 'En esta prueba, decides tú el reparto con «Resolver el reclamo (simulación)».' : 'Una persona mediadora revisa las fotos de entrada y de salida y decide cómo se reparte el depósito.',
    }
    case 'cerrado': {
      if (!r) return null
      const red = c.red ? ' en la red de prueba' : ''
      // LEGAL: revisar
      if (r.via === 'automatico') return {
        paso: 'devolucion', titulo: 'Depósito devuelto',
        hecho: c.red ? `No hubo reclamos en ${textoPlazo(ahora)}. El dueño de prueba aprobó y Lockumi devolvió ${usd(r.inquilino)} al inquilino en la red de prueba.`
          : `No hubo reclamos en ${textoPlazo(ahora)}. El depósito volvió completo al inquilino: ${usd(r.inquilino)}.`,
        sigue: TERMINO,
      }
      // LEGAL: revisar
      if (r.via === 'acuerdo') return {
        paso: 'acuerdo', titulo: 'Reclamo aceptado',
        hecho: `Se repartió el depósito${red}: ${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino.`,
        sigue: TERMINO,
      }
      // LEGAL: revisar
      return {
        paso: 'reparto', titulo: 'Reparto decidido',
        hecho: `La persona mediadora${c.prueba ? ' (simulación)' : ''} decidió: ${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino.${c.red ? ' El reparto se hizo en la red de prueba.' : ''}`,
        sigue: TERMINO,
      }
    }
    default: return null
  }
  // Mismo estado: una firma nueva de una de las partes (sin que hayan firmado los dos todavía).
  const firmas = { firmas: ['contrato', antes.contrato.firmas, ahora.contrato.firmas], fotos_entrada: ['entrada', antes.entrada.firmas, ahora.entrada.firmas], salida: ['salida', antes.salida?.firmas ?? {}, ahora.salida?.firmas ?? {}] } as const
  const f = firmas[ahora.estado as keyof typeof firmas]
  if (f) for (const p of ['inquilino', 'dueno'] as const) if (!f[1][p] && f[2][p]) return alertaFirma(f[0], p, rol, c)
  // Solo red de prueba: se adelantó el plazo para reclamos.
  if (ahora.estado === 'ventana_reclamo' && ahora.diasSimulados > antes.diasSimulados) return {
    paso: 'adelantar', titulo: 'Plazo adelantado',
    hecho: `Solo en la red de prueba: terminamos ahora los ${textoPlazo(ahora)} para reclamos.`,
    // LEGAL: revisar
    sigue: c.red ? 'El dueño de prueba aprueba y Lockumi devuelve el depósito al inquilino en la red de prueba. Tarda entre 20 y 60 segundos.' : 'El depósito vuelve completo al inquilino.',
  }
  return null
}
