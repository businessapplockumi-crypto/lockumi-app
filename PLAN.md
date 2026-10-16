# Lockumi · Demo de la app web — Plan

Demo navegable (no se publica en lockumi.com). Vite + React + TypeScript, estado en localStorage con datos de ejemplo ficticios, rutas con hash (`#/…`) para desplegar como sitio estático. Estilo y tokens "Terracota viva" copiados de la landing (Inter para texto, Nunito para títulos, glass, chips verdes).

## Pantallas
1. **Entrar** (`#/` sin sesión) — login con correo o Google/Apple al estilo Cavos, sin billetera ni frase semilla; selector de rol Dueño/Inquilino. ✅ Fase 1
2. **Tus alquileres** (`#/`) — lista de alquileres con estado, monto y fechas; selector de rol en la barra. ✅ Fase 1
3. **Nuevo alquiler** (`#/crear`) — monto del depósito, fechas de entrada y salida, reglas (lista), correo del inquilino. ✅ Fase 1
4. **Detalle / línea de tiempo** (`#/alquiler/:id`) — datos, reglas e historial. 🟡 Básico (falta la línea de tiempo con todos los estados)
5. **Acta de entrada** — fotos + checklist por cuarto, de ambas partes; firmas simuladas con fecha y hora. ⏳ Fase 2
6. **Pago del depósito** — el inquilino paga; queda "apartado" en escrow; mensaje: nadie lo libera solo. ⏳ Fase 2
7. **Rendimiento opcional** — interruptor USDC (Blend); VARIABLE y NO GARANTIZADO; reparto 40% inquilino / 40% dueño / 20% Lockumi; sin tasa fija (cualquier número va marcado como "ejemplo"). ⏳ Fase 2
8. **Acta de salida** — fotos + checklist, comparación lado a lado con la entrada. ⏳ Fase 2
9. **Ventana de reclamo** — 7 días con cuenta regresiva; sin reclamo, el depósito vuelve solo al inquilino; botón "simular paso de 7 días". ⏳ Fase 2
10. **Reclamo** — el dueño presenta fotos y monto; el inquilino acepta o rechaza. ⏳ Fase 2
11. **Mediación** — el mediador decide el reparto; mensaje: la mayoría de los casos se resuelve en la app, la mediación es solo para pocos. ⏳ Fase 2

## Simulado vs. real
| Pieza | Estado | Archivo |
|---|---|---|
| Login Cavos (correo/social, sin semilla) | Simulado | `src/services/auth.ts` |
| Escrow Trustless Work (liberación multiparte) | Simulado | `src/services/escrow.ts` |
| Rendimiento Blend (USDC) | Simulado, tasa "variable", ninguna cifra | `src/services/yield.ts` |
| Datos de alquileres | Locales (localStorage), ejemplos ficticios | `src/store.ts` |
| Interfaz, rutas y validaciones | Reales | `src/screens/*` |
No se usan llaves ni secretos. Toda integración simulada lleva la insignia "Demo: simulado".

## Checklist de la fase 2
- [ ] Máquina de estados completa (`borrador → entrada → pendiente_pago → apartado → salida → ventana_reclamo → reclamo → mediacion → cerrado`) con acciones según el rol
- [ ] Acta de entrada: cuartos, checklist, subida de fotos (vista previa local), firmas de ambas partes con fecha y hora
- [ ] Pago del depósito + aviso de escrow multiparte
- [ ] Interruptor de rendimiento con avisos de "variable / no garantizado" y reparto 40/40/20
- [ ] Acta de salida + comparación lado a lado
- [ ] Ventana de 7 días: cuenta regresiva, botón "simular paso de 7 días", devolución automática
- [ ] Reclamo (fotos/monto) → aceptar/rechazar → pantalla del mediador (reparto)
- [ ] Línea de tiempo visual con todos los estados
- [ ] Decoraciones SVG, repaso del texto (español neutro, CR), accesibilidad
- [ ] Capturas a 390/1366 de todas las pantallas; despliegue de vista previa (proyecto aparte, NO la landing)
