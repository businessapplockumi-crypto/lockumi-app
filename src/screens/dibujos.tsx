// Dibujos de 24×24 (trazo), los de la maqueta 04-estados.
const TRAZOS: Record<string, string[]> = {
  contrato: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M8 13h8M8 17h5'],
  escudo: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z', 'm9 12 2 2 4-4'],
  devolver: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  firma: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  candado: ['M6 11h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  camara: ['M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z', 'M15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
  casa: ['M3 10.5 12 3l9 7.5', 'M5 9v11h14V9', 'M10 20v-6h4v6'],
  reloj: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 7v5l3 2'],
  alerta: ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z', 'M12 9v4M12 17h.01'],
  check: ['M20 6 9 17l-5-5'],
  cal: ['M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M16 2v4M8 2v4M3 10h18'],
  der: ['m9 18 6-6-6-6'],
  persona: ['M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', 'M4 21a8 8 0 0 1 16 0'],
}
export const Dibujo = ({ n, className = '' }: { n: string; className?: string }) =>
  <svg className={'ico ' + className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{TRAZOS[n].map(d => <path key={d} d={d} />)}</svg>
