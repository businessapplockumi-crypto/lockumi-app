// Cada paso que toca la red de prueba corre UNA sola vez a la vez:
// - en la misma pestaña, un segundo clic recibe la misma promesa (no se envía de nuevo);
// - entre pestañas, Web Locks: si otra pestaña ya lo está haciendo, se avisa en vez de repetirlo.
// Después de un éxito, las acciones vuelven a leer el alquiler y no repiten lo que ya quedó registrado.
export class ErrorPaso extends Error {}
const enCurso = new Map<string, Promise<unknown>>()
export function unaVez<T>(clave: string, f: () => Promise<T>): Promise<T> {
  const ya = enCurso.get(clave); if (ya) return ya as Promise<T>
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  const p = (locks
    ? locks.request('lockumi:' + clave, { ifAvailable: true }, async l => {
        if (!l) throw new ErrorPaso('Este paso ya se está haciendo en otra pestaña. Espera unos segundos: aquí se actualiza solo.')
        return f()
      }) as Promise<T>
    : f()).finally(() => enCurso.delete(clave))
  enCurso.set(clave, p); return p
}
export const ocupadoPaso = (clave: string) => enCurso.has(clave)
