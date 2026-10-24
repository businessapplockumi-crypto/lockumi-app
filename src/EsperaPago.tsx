// Botón «Pagar» con el estado de espera v2: casita animada, tres verdes que avanzan, barrita y pasos (ver src/espera.ts).
import type { CSSProperties } from 'react'
import { LogoAviso } from './LogoAviso'
import { Icono } from './ui'
import { PASOS_PAGO, ESPERA_PAGO, NOTA_ESPERA_PAGO, LISTO_PAGO, REINTENTO_PAGO, BARRA_PAGO, LISTA_PASOS, MARCA_PASO, vozPago, tramoBarra, estadosPasos, type EtapaPago } from './espera'

function Pasos({ etapa, fallo }: { etapa: EtapaPago; fallo: EtapaPago }) {
  return <ol className="envio__pasos" aria-label={LISTA_PASOS}>{estadosPasos(etapa, fallo).map((e, i) =>
    <li key={i} className={`envio__paso envio__paso--${e}`} aria-current={e === 'actual' ? 'step' : undefined}>
      <span className="envio__punto">{e === 'hecho' ? <Icono id="i-check" /> : e === 'error' ? <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg> : i + 1}</span>
      <span>{PASOS_PAGO[i]}</span><span className="sr">{MARCA_PASO[e]}</span>
    </li>)}</ol>
}

/** etapa 0 = en reposo (botón terracota «Pagar …» o, después de un error, «Volver a intentar el pago»). */
export function EsperaPago({ etapa, fallo = 0, etiqueta, onPagar }: { etapa: EtapaPago; fallo?: EtapaPago; etiqueta: string; onPagar: () => void }) {
  if (etapa === 0) return <div className="envio">
    <button type="button" className="boton boton--primario boton--ancho boton--grande" onClick={onPagar}>{fallo ? REINTENTO_PAGO : etiqueta}</button>
    {fallo > 0 && <Pasos etapa={0} fallo={fallo} />}
  </div>
  const listo = etapa === 3, t = tramoBarra(etapa), voz = vozPago(etapa)
  const estilo = { '--desde': `${t.desde.toFixed(1)}%`, '--hasta': `${t.hasta.toFixed(1)}%`, '--salto': `${t.salto.toFixed(1)}%` } as CSSProperties
  return <div className={`envio envio--t${etapa}`} data-etapa={etapa}>
    {listo
      ? <button type="button" className="boton boton--primario boton--ancho boton--grande envio__boton envio__boton--listo" aria-disabled="true"><Icono id="i-check" /><span>{LISTO_PAGO}</span></button>
      : <button type="button" className="boton boton--primario boton--ancho boton--grande envio__boton" aria-busy="true" aria-disabled="true" aria-describedby="pago-nota">
          <span className="envio__logo" aria-hidden="true"><LogoAviso /></span><span>{ESPERA_PAGO}</span></button>}
    <p className="nota envio__nota" id="pago-nota">{NOTA_ESPERA_PAGO}</p>
    <div className={`envio__barra${listo ? ' envio__barra--listo' : ''}`} role="progressbar" aria-label={BARRA_PAGO} aria-valuemin={0} aria-valuemax={100} aria-valuenow={t.ahora} aria-valuetext={voz}>
      <span key={etapa} style={estilo} /></div>
    <Pasos etapa={etapa} fallo={0} />
    <p className="sr" role="status">{voz}</p>
  </div>
}
