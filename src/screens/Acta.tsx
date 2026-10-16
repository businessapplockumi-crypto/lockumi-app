import { useState } from 'react'
import { store, actaCompleta, ahoraDe } from '../store'
import type { Alquiler, Rol, Cuarto, Foto } from '../types'
import { NOMBRE_ROL } from '../types'
import { fotoEjemplo } from '../demoFotos'
import { Icono } from '../ui'
import { TomarFoto } from '../Camara'
import { textoFoto } from '../fotos'
import { firmar, estadoFirma, ambos, otro, NOMBRE, ErrorFirma, type Firmas } from '../flujo'

export function FotoLista({ fotos, vacio = 'Todavía no hay fotos.' }: { fotos: Foto[]; vacio?: string }) {
  if (!fotos.length) return <p className="nota">{vacio}</p>
  return <ul className="fotos">{fotos.map((f, i) => <li key={i}>
    <img src={f.src} alt={`Foto ${i + 1}, de ${NOMBRE_ROL[f.por].toLowerCase()}`} loading="lazy" />
    <span className="foto__pie">{textoFoto(f)} · {NOMBRE_ROL[f.por]}</span>
    {f.posibleGaleria && <span className="chip chip--coral chip--mini" title="La foto no se tomó ahora con la cámara de la app">Posible foto de galería</span>}
  </li>)}</ul>
}

/** Un espacio de la casa, en su propia pantalla. */
export function CuartoEditor({ a, cual, idx, rol }: { a: Alquiler; cual: 'entrada' | 'salida'; idx: number; rol: Rol }) {
  const acta = a[cual]!; const c = acta.cuartos[idx]
  const habiaFirmas = Object.keys(acta.firmas).length > 0
  const editar = (fn: (c: Cuarto) => void) => store.cambiar(a.id, x => { const ac = x[cual]!; fn(ac.cuartos[idx]); ac.firmas = {} })
  const agregar = (f: Foto) => editar(cc => cc.fotos.push(f))
  const ent = cual === 'salida' ? a.entrada.cuartos[idx] : null
  return <section className="pila cuarto" aria-labelledby={`c-${cual}-${idx}`}>
    <h2 id={`c-${cual}-${idx}`}>{c.nombre}</h2>
    {ent && <div><p className="mini">Así estaba al entrar</p><FotoLista fotos={ent.fotos} /></div>}
    <div><p className="mini">{ent ? 'Así está hoy' : 'Fotos'}</p><FotoLista fotos={c.fotos} vacio="Toma al menos una foto de este espacio." /></div>
    <TomarFoto por={rol} onFoto={agregar} etiqueta={c.fotos.length ? 'Tomar otra foto' : 'Tomar foto'} principal={!c.fotos.length} />
    {<button type="button" className="enlace" onClick={() => agregar({ src: fotoEjemplo(c.nombre, cual, c.fotos.length + idx), por: rol, fecha: new Date(ahoraDe(a)).toISOString(), tomadaEn: ahoraDe(a), origen: 'ejemplo' })}>Demo: usar una foto de ejemplo</button>}
    <fieldset className="campo"><legend>¿Cómo está cada cosa?</legend>
      <ul className="lista checklist">{c.items.map((it, j) => {
        const e0 = ent?.items[j].estado
        return <li key={j}><span>{it.texto}{ent && <small className="nota"> · al entrar: {e0 === 'bien' ? 'bien' : e0 === 'detalle' ? 'con detalle' : '—'}</small>}</span>
          <span className="seg" role="group" aria-label={it.texto}>
            <button type="button" aria-pressed={it.estado === 'bien'} onClick={() => editar(cc => { cc.items[j].estado = 'bien' })}>Bien</button>
            <button type="button" aria-pressed={it.estado === 'detalle'} onClick={() => editar(cc => { cc.items[j].estado = 'detalle' })}>Con detalle</button>
          </span></li>
      })}</ul></fieldset>
    <label className="campo"><span>Notas (opcional)</span>
      <textarea rows={2} defaultValue={c.nota} onBlur={e => e.target.value !== c.nota && editar(cc => { cc.nota = e.target.value })} placeholder="Ej.: rayón pequeño en la puerta" /></label>
    {habiaFirmas && <p className="nota">Si cambias algo, los dos tienen que volver a confirmar.</p>}
  </section>
}
export const cuartoListo = (c: Cuarto) => c.fotos.length > 0 && c.items.every(i => i.estado)

/** Firma o confirmación de una persona. Cada quien ve solo su botón; nadie puede firmar por la otra persona.
 *  Montar con key={rol} para que la casilla no pase de una persona a otra. */
export function Firma({ a, que, rol, titulo, texto, casilla, alCompletar }: {
  a: Alquiler; que: 'contrato' | 'entrada' | 'salida'; rol: Rol; titulo: string; texto: string; casilla: string; alCompletar: (x: Alquiler) => void
}) {
  const f: Firmas = (que === 'contrato' ? a.contrato : a[que]!).firmas
  const listoParaFirmar = que === 'contrato' || actaCompleta(a[que]!)
  const [ok, setOk] = useState(false); const [err, setErr] = useState('')
  const est = estadoFirma(f, rol)
  const hacer = () => {
    if (!ok) return setErr('Marca la casilla para confirmar que estás de acuerdo.')
    try {
      store.cambiar(a.id, x => {
        const obj = que === 'contrato' ? x.contrato : x[que]!
        const cuando = new Date(ahoraDe(x)).toISOString()
        obj.firmas = firmar(obj.firmas, rol, rol, cuando)
        x.historial.push({ fecha: cuando, texto: `${titulo}: firmó el ${NOMBRE[rol]}` })
        if (ambos(obj.firmas)) alCompletar(x)
      })
    } catch (e) { setErr(e instanceof ErrorFirma ? e.message : 'No pudimos guardar tu firma. Intenta de nuevo.') }
  }
  return <section className="pila" aria-labelledby={'firma-' + que}>
    <h2 id={'firma-' + que}>{titulo}</h2>
    <ul className="lista firmas">{(['dueno', 'inquilino'] as Rol[]).map(r => <li key={r}>
      <span><strong>{NOMBRE_ROL[r]}{r === rol ? ' (tú)' : ''}</strong></span>
      {f[r] ? <span className="chip chip--exito"><Icono id="i-check" /> Firmó</span> : <span className="chip chip--neutro">Falta</span>}
    </li>)}</ul>
    <p className={'estado-firma estado-firma--' + est.tipo} role="status">{est.texto}</p>
    {est.tipo === 'te-toca' && <>
      <p>{texto}</p>
      {!listoParaFirmar && <p className="error">Antes de confirmar, cada espacio necesita una foto y todo marcado. Vuelve atrás para completarlo.</p>}
      <label className="check check--grande"><input type="checkbox" checked={ok} disabled={!listoParaFirmar} onChange={e => { setOk(e.target.checked); setErr('') }} /> {casilla}</label>
      {err && <p className="error" role="alert">{err}</p>}
      <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={!listoParaFirmar} onClick={hacer}>
        {que === 'contrato' ? `Firma como ${NOMBRE[rol]}` : `Confirmar como ${NOMBRE[rol]}`}</button>
    </>}
    {est.tipo === 'esperando' && <p className="nota">No tienes que hacer nada más. Te avisaremos cuando el {NOMBRE[otro(rol)]} firme.</p>}
  </section>
}
