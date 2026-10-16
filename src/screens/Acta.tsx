import { useRef, useState } from 'react'
import { store, actaCompleta, ahoraDe } from '../store'
import type { Alquiler, Rol, Cuarto, Foto } from '../types'
import { NOMBRE_ROL } from '../types'
import { fotoEjemplo, reducirImagen } from '../demoFotos'
import { Demo, Icono, fechaHora } from '../ui'

const otro = (r: Rol): Rol => r === 'dueno' ? 'inquilino' : 'dueno'

function Fotos({ fotos, titulo }: { fotos: Foto[]; titulo?: string }) {
  if (!fotos.length) return <p className="nota">{titulo ? titulo + ': ' : ''}sin fotos todavía.</p>
  return <div>{titulo && <p className="mini">{titulo}</p>}<ul className="fotos">{fotos.map((f, i) =>
    <li key={i}><img src={f.src} alt={`Foto ${i + 1}, subida por ${NOMBRE_ROL[f.por].toLowerCase()}`} loading="lazy" /><span className="chip chip--neutro chip--mini">{NOMBRE_ROL[f.por]}</span></li>)}</ul></div>
}

export function CuartoEditor({ a, cual, idx, rol }: { a: Alquiler; cual: 'entrada' | 'salida'; idx: number; rol: Rol }) {
  const acta = a[cual]!; const c = acta.cuartos[idx]; const ref = useRef<HTMLInputElement>(null); const [err, setErr] = useState('')
  const editar = (fn: (c: Cuarto) => void) => store.cambiar(a.id, x => { const ac = x[cual]!; fn(ac.cuartos[idx]); ac.firmas = {} })
  const subir = async (files: FileList | null) => {
    setErr('')
    for (const f of Array.from(files ?? []).slice(0, 4)) {
      try { const src = await reducirImagen(f); editar(cc => cc.fotos.push({ src, por: rol, fecha: new Date(ahoraDe(a)).toISOString() })) }
      catch { setErr('No pudimos leer esa imagen. Prueba con otra.') }
    }
    if (ref.current) ref.current.value = ''
  }
  const ent = cual === 'salida' ? a.entrada.cuartos[idx] : null
  const listo = c.fotos.length > 0 && c.items.every(i => i.estado)
  return <section className="glass tarjeta cuarto" aria-labelledby={`c-${cual}-${idx}`}>
    <div className="cab"><h3 id={`c-${cual}-${idx}`}>{c.nombre}</h3>
      <span className={'chip ' + (listo ? 'chip--exito' : 'chip--neutro')}>{listo ? <><Icono id="i-check" /> Completo</> : 'Pendiente'}</span></div>
    {ent ? <div className="comparar">
      <div><p className="mini">Entrada</p><Fotos fotos={ent.fotos} /></div>
      <div><p className="mini">Salida</p><Fotos fotos={c.fotos} /></div>
    </div> : <Fotos fotos={c.fotos} />}
    <div className="acciones">
      <input ref={ref} type="file" accept="image/*" multiple className="sr" id={`f-${cual}-${idx}`} onChange={e => subir(e.target.files)} />
      <label htmlFor={`f-${cual}-${idx}`} className="boton boton--secundario boton--chico"><Icono id="i-camara" /> Subir fotos</label>
      <button type="button" className="boton boton--secundario boton--chico" onClick={() => editar(cc => cc.fotos.push({ src: fotoEjemplo(cc.nombre, cual, cc.fotos.length + idx), por: rol, fecha: new Date(ahoraDe(a)).toISOString() }))}>Usar foto de ejemplo</button>
    </div>
    {err && <p className="error" role="alert">{err}</p>}
    <ul className="lista checklist">{c.items.map((it, j) => {
      const e0 = ent?.items[j].estado
      return <li key={j}><span>{it.texto}{ent && <small className="nota"> · entrada: {e0 === 'bien' ? 'bien' : e0 === 'detalle' ? 'con detalle' : '—'}</small>}</span>
        <span className="seg" role="group" aria-label={it.texto}>
          <button type="button" aria-pressed={it.estado === 'bien'} onClick={() => editar(cc => { cc.items[j].estado = 'bien' })}>Bien</button>
          <button type="button" aria-pressed={it.estado === 'detalle'} onClick={() => editar(cc => { cc.items[j].estado = 'detalle' })}>Con detalle</button>
        </span></li>
    })}</ul>
    <label className="campo"><span>Notas (opcional)</span>
      <textarea rows={2} defaultValue={c.nota} onBlur={e => e.target.value !== c.nota && editar(cc => { cc.nota = e.target.value })} placeholder="Ej.: rayón pequeño en la puerta" /></label>
  </section>
}

export function Firmas({ a, cual, rol, onRol, alCompletar }: { a: Alquiler; cual: 'entrada' | 'salida'; rol: Rol; onRol: (r: Rol) => void; alCompletar: (x: Alquiler) => void }) {
  const acta = a[cual]!; const completo = actaCompleta(acta); const [ok, setOk] = useState(false)
  const firmar = () => store.cambiar(a.id, x => {
    const ac = x[cual]!; ac.firmas[rol] = new Date(ahoraDe(x)).toISOString()
    x.historial.push({ fecha: ac.firmas[rol]!, texto: `Acta de ${cual} firmada por ${NOMBRE_ROL[rol].toLowerCase()}` })
    if (ac.firmas.dueno && ac.firmas.inquilino) alCompletar(x)
  })
  return <section className="glass glass--fuerte tarjeta pila" aria-labelledby={'firmas-' + cual}>
    <div className="cab"><h3 id={'firmas-' + cual}>Firmas</h3><Demo t="Firma simulada" /></div>
    {!completo && <p className="nota">Para firmar, cada cuarto necesita al menos una foto y todos los puntos marcados.</p>}
    <p className="nota">Si alguien cambia el acta después de firmar, las firmas se borran y hay que volver a firmar.</p>
    <ul className="lista">{(['dueno', 'inquilino'] as Rol[]).map(r => <li key={r}>
      <span><strong>{NOMBRE_ROL[r]}</strong><br /><small className="nota">{acta.firmas[r] ? 'Firmó el ' + fechaHora(acta.firmas[r]!) : 'Pendiente'}</small></span>
      {acta.firmas[r] ? <span className="chip chip--exito"><Icono id="i-check" /> Firmado</span>
        : r === rol ? null : <button type="button" className="boton boton--secundario boton--chico" onClick={() => onRol(r)}>Ver como {NOMBRE_ROL[r].toLowerCase()}</button>}
    </li>)}</ul>
    {!acta.firmas[rol] && <>
      <label className="check"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} disabled={!completo} /> Confirmo que esta acta refleja el estado real del inmueble.</label>
      <button type="button" className="boton boton--primario boton--ancho" disabled={!completo || !ok} onClick={firmar}>Firmar como {NOMBRE_ROL[rol].toLowerCase()}</button>
    </>}
    {acta.firmas[rol] && !acta.firmas[otro(rol)] && <p className="nota" role="status">Ya firmaste. Falta la firma del {NOMBRE_ROL[otro(rol)].toLowerCase()}.</p>}
  </section>
}
