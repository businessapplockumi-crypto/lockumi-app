// Ayuda compartida de los scripts de navegador: recorre el formulario «Nuevo alquiler» (una pregunta por pantalla, src/screens/Crear.tsx)
// y deja la página justo antes de tocar «Crear alquiler» (o lo toca, con crear: true). Cierra los avisos de cada pantalla
// para que el script que la usa vea solo los avisos que le interesan. Las fechas se escriben en los campos #f-inicio/#f-fin (dd/mm/aaaa).
export const ddmmaaaa = k => { const x = new Date(); x.setDate(x.getDate() + k); return [x.getDate(), x.getMonth() + 1, x.getFullYear()].map((v, i) => String(v).padStart(i < 2 ? 2 : 4, '0')).join('') }

/** Cierra los avisos v2 que estén a la vista (Escape) hasta que no quede ninguno. */
export async function sinAvisos(p, ms = 4000) {
  const fin = Date.now() + ms
  while (Date.now() < fin) {
    const n = await p.locator('.tostada:not(.tostada--sale)').count()
    if (!n) { await p.waitForTimeout(300); if (!(await p.locator('.tostada:not(.tostada--sale)').count())) return }
    else { await p.keyboard.press('Escape'); await p.waitForTimeout(260) }
  }
}

export async function llenarFormulario(p, { lugar = 'Apartamento en Barreal de Heredia', monto = '20', inicio = 0, fin = 182, crear = false } = {}) {
  const siguiente = n => p.locator('.fz-pie').getByRole('button', { name: n, exact: true }).click()
  await p.locator('#f-direccion').waitFor({ timeout: 15000 })
  await p.fill('#f-direccion', lugar); await siguiente('Siguiente')
  await p.locator('#f-inicio').waitFor({ state: 'attached' })
  await p.fill('#f-inicio', ddmmaaaa(inicio))
  if (fin != null) await p.fill('#f-fin', ddmmaaaa(fin))
  await siguiente('Siguiente')
  await p.locator('#f-monto').waitFor({ state: 'attached' })
  await p.fill('#f-monto', String(monto)); await siguiente('Siguiente')
  await p.locator('[data-recorrido="reglas"]').waitFor()
  await siguiente('Revisar el contrato')
  await p.getByRole('button', { name: 'Seguir', exact: true }).click()
  await p.locator('.fz-resumen').waitFor()
  await sinAvisos(p)
  if (crear) await siguiente('Crear alquiler')
}
