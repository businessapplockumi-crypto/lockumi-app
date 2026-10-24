# Formulario «Nuevo alquiler»: una pregunta por pantalla

Rama `formulario` (24 oct 2026, desde `master` en `051c071`), solo vista previa; no está en app.lockumi.com. Maqueta y textos: `diseno/envio/recorrido-formulario/` (`resumen.jpg`, `textos.md`, revisados por Legal el 23/10).

## Pantallas

| # | Pregunta | Ayuda | Qué se toca | Al terminar |
|---|---|---|---|---|
| 1 de 5 | ¿Qué lugar van a alquilar? | Un nombre corto basta. | «Nombre del lugar» (Ej.: Apartamento en Barreal de Heredia) · Tipo: Apartamento, Casa, Estudio, Habitación | Aviso «¡Lugar listo!» · «Faltan 4 pasos.» |
| 2 de 5 | ¿Cuándo empieza y cuánto dura? | Elige una duración o pon las fechas. | Empieza · 3 meses, 6 meses, 1 año, Otra fecha · Termina | «¡Fechas listas!» · «Faltan 3 pasos.» |
| 3 de 5 | ¿De cuánto es el depósito? | USDC de prueba, sin valor. Máximo 20. | Montos 1, 2, 3, 5, 10, 20 · Otro monto · Origen: «USDC de prueba de Lockumi» o «Mi propio USDC de prueba» | «¡Monto listo!» · «Faltan 2 pasos.» |
| 4 de 5 | Reglas del lugar | Toca las que apliquen. Quedan en el contrato. | Sin mascotas, Sin fumar, Sin fiestas, Silencio desde las 10 p. m., Máximo 2 personas, Cuidar el jardín, + Otra regla | Botón «Revisar el contrato» → celebración «¡Reglas listas!» · «Falta un paso: revisar y crear.» · «Seguir» |
| 5 de 5 | Revisar el contrato | Revisa los datos antes de crear. | Resumen con «Cambiar» en cada dato · «Crear alquiler» | Aviso «Alquiler creado» · «Ahora: leer y firmar el contrato» |

- Botones: Siguiente · Atrás · Revisar el contrato · Seguir · Crear alquiler · ✕ (`aria-label="Cerrar"`, vuelve a Inicio).
- La duración con chips calcula el fin como inicio + N meses (`sumarMeses`, igual que la validación). «Otra fecha» abre el calendario de «Termina».
- Los montos se muestran con `usd(...)`: «3 USDC» en la red de prueba, «USD 3,00» en el modo sin red.
- **Tipo de lugar (desde el 24/10):** se guarda en el alquiler (`Alquiler.tipo`: Apartamento, Casa, Estudio o Habitación) y sale en el contrato y en su versión para imprimir o guardar como PDF, en «El alquiler»: «Tipo de lugar: Casa». La línea lleva `// LEGAL: revisar` (falta que Legal la apruebe). Migración: al leer `localStorage`, los alquileres creados antes no tienen tipo y siguen igual (no se les inventa uno; el contrato no muestra la línea); un valor que no sea uno de los 4 se quita. En el modo con servidor (Supabase) el tipo todavía no se envía: no hay columna (queda pendiente).
- **Monto según el origen (decisión de Katherine del 19/10: la app no limita el monto):** el tope de 20 es solo de «USDC de prueba de Lockumi» (la tesorería). Solo con ese origen la ayuda dice «Máximo 20.», los chips de más de 20 se desactivan y se valida `≤ 20`. Con «Mi propio USDC de prueba» no hay tope de 20: la ayuda dice «USDC de prueba, sin valor. Hasta tu saldo.» y el límite es el saldo real de la cuenta. El servidor (`/api/solo`) sigue igual: exige el tope de 20 de la tesorería y, para cualquier origen, su máximo técnico de 50 000 (`MONTO_MAX_USDC`). Esta rama no cambia la lógica del depósito.
- **Al cambiar el origen se revalida el monto en el acto** (sin tocar «Siguiente»). Ej.: con 30 escrito, volver a «USDC de prueba de Lockumi» muestra «Con «USDC de prueba de Lockumi» el depósito es de máximo 20 USDC de prueba (no es dinero real). Baja el monto a 20 o menos, o elige «Mi propio USDC de prueba».»
- La validación (`src/validacion.ts`) y la creación (`crearAcuerdo`, aviso `alertaCreado`) no cambiaron. El inicio de sesión tampoco.

## Errores (cada uno dice cómo arreglarlo)

- Lugar vacío: «Escribe la dirección o un nombre para el lugar.»
- Sin inicio: «Elige el día en que empieza.» · Sin fin: «Elige una duración (3 meses, 6 meses o 1 año) o toca «Otra fecha».»
- Sin monto: «Toca un monto o escríbelo en «Otro monto».» · Arriba del tope (solo con «USDC de prueba de Lockumi»): el mensaje con el máximo de 20 y cómo arreglarlo · Con «Mi propio USDC de prueba» arriba del saldo: «Tu cuenta tiene N USDC de prueba. Escribe un monto de N o menos, o usa «Obtener USDC de prueba».»
- Regla vacía: «Escribe la regla y toca «Agregar».» · Repetida: «Esa regla ya está. Escribe otra o toca «Cancelar».»

## Movimiento

- Entre pantallas: la barra se llena con un brillo y la casita hace un pop de 300 ms.
- «¡Reglas listas!»: la casita salta 14 px, la llave gira una vez y 10 puntos de la paleta (salvia, terracota, coral, verde bosque y miel) salen y caen con fundido en 0,9 s.
- Con movimiento reducido no hay brillo, pop, salto ni puntos; los textos siguen iguales.

## Accesibilidad

- Una sola `h1` por pantalla; el foco pasa a la pregunta nueva (salvo durante el recorrido guiado) o al primer campo con error.
- Chips de tipo, duración y monto: `role="radiogroup"`/`role="radio"`, un solo Tab y flechas. Reglas: botones con `aria-pressed`. Todos de 44 px de alto, con foco visible.
- Barra: `role="progressbar"` con `aria-valuenow` y «Paso N de 5».
- Enter pasa a la pantalla siguiente; Esc cierra «+ Otra regla».

## Notas de Legal

- Textos exactos de la maqueta (`// LEGAL: revisado el 23/10`).
- Chips de duración: se pueden usar en la red de prueba; **antes de usar dinero real hay que revisarlos con un abogado (Ley 7527, art. 70)**.
- «+ Otra regla» es texto libre: **moderar antes de producción** (`OTRA_REGLA_SIN_MODERAR` en `src/formulario.ts`).
- Al crear se usa el título aprobado «Alquiler creado» (la maqueta dice «¡Alquiler creado!»).

## Recorrido guiado

El paso 2 («Los datos del alquiler») abre la pantalla 1 y el paso 3 («Las reglas del dueño») abre la pantalla 4, con `pedirPantalla(i)` (`pantalla` en `PASOS_RECORRIDO`).

## Pruebas

- Unitarias: `src/__tests__/formulario.test.tsx` (textos, chips, cuentas, errores, notas de Legal, `usd(...)`, accesibilidad).
- Navegador: `scripts/formulario/capturar.mjs` sobre la app construida (390 px, 1280 px y movimiento reducido). Los demás scripts recorren el formulario con `scripts/_formulario.mjs`.

### Resultados (24 oct 2026, rama `formulario`)

- Unitarias: 212/212 (13 nuevas en `formulario.test.tsx`).
- `scripts/formulario/capturar.mjs`: 43 ✓ / 0 ✗ (390 px, 1280 px y movimiento reducido).
- Recorrido 97 ✓ (los pasos 2 y 3 abren la pantalla de lugar y la de reglas), alertas 949 ✓ / 0 ✗, espera-pagar y aviso-v2 TODO BIEN, contrato-plegable 88 ✓ / 0 ✗.
- contrato-plegable: las 2 fallas del PDF eran de la prueba. Buscaba la regla «No se permiten mascotas», que era la regla inicial del formulario anterior; el formulario nuevo empieza con «Sin mascotas» (texto de la maqueta). Se cambió la prueba y se quitó un relleno de `#f-reglas`, campo que ya no existe.
- Imagen: `diseno/envio/ux-guiada/3-formulario.jpg` y `3-formulario.gif` (demo@lockumi.com).
