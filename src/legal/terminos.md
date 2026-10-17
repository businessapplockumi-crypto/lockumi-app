# Términos y condiciones de app.lockumi.com (demo en red de prueba)

> **⚠ PENDIENTE DE REVISIÓN POR ABOGADO.** Este texto lo preparó un asesor legal que no es abogado. Antes de publicarlo debe revisarlo un abogado costarricense. Los puntos marcados [CONFIRMAR] deben resolverse antes de publicar.

**Versión:** 1.0-demo · **Fecha:** 17 de octubre de 2026 · Estos términos aplican solo a la app app.lockumi.com.

---

## 1. Quién es responsable
1.1 Lockumi es un proyecto de **Quantz**, una iniciativa que **todavía no está constituida como sociedad**. Mientras tanto, la responsable de la app y de estos términos es **Katherine María Moreira Solano**, persona física, con domicilio en Torres de Heredia, Barreal de Heredia, Costa Rica ("Lockumi", "nosotros").
1.2 Contacto: **business.applockumi@gmail.com**.

## 2. Qué es esta app: una demo
2.1 app.lockumi.com es una **demostración** de cómo funcionaría un depósito de garantía de alquiler protegido. Funciona en la **red de prueba (testnet) de Stellar**, que es una red pública para pruebas.
2.2 En la demo:
a) Los tokens que se usan, incluido el USDC de prueba, **no son dinero real, no tienen valor económico y no se pueden canjear** por dinero ni por ningún otro bien.
b) La persona mediadora es **simulada**. Las resoluciones de la demo no tienen ningún efecto legal.
c) **No hay rendimiento ni intereses** de ningún tipo.
d) Algunas funciones están simuladas y se marcan en pantalla como "Demo".
2.3 **No uses la app para depositar garantías reales de alquiler.** Lo que hagas en la demo no crea, modifica ni extingue obligaciones reales entre un dueño y un inquilino.
2.4 La app **no sustituye el contrato de arrendamiento ni la asesoría legal**. Para un alquiler real, rigen el contrato que firmen las partes y la Ley 7527, Ley General de Arrendamientos Urbanos y Suburbanos.

## 3. Cuentas y acceso
3.1 Para entrar, usas el servicio de **Cavos** (ver la cláusula 5) con Google, Apple o tu correo y un código. Debes ser mayor de 18 años.
3.2 Eres responsable de lo que hagas con tu cuenta y de proteger el acceso a ella. Si sospechas un acceso no autorizado, escríbenos.

## 4. Lockumi no custodia fondos
4.1 Lockumi **no recibe, no guarda y no custodia** fondos ni tokens de los usuarios. Los tokens de prueba quedan apartados en un contrato digital de escrow en la red de prueba de Stellar, creado con la infraestructura de Trustless Work (cláusula 5).
4.2 Para que el flujo funcione, la cuenta de Lockumi tiene en ese contrato digital algunos roles técnicos: **registrar la evidencia, ejecutar la liberación según las reglas, recibir la tarifa de plataforma y, en la demo, actuar como resolutora simulada de disputas.** Con esos roles, Lockumi no puede quedarse con los tokens: solo puede liberarlos a las cuentas definidas en el contrato digital, según sus reglas. [CONFIRMAR con Producto el alcance exacto de cada rol en Trustless Work antes de publicar.]

## 5. Servicios de terceros
5.1 **Trustless Work** da la infraestructura de los contratos digitales de escrow en Stellar. No es parte de tu relación con Lockumi, y sus servicios se rigen por sus propios términos.
5.2 **Comisión:** Trustless Work cobra una comisión del **0,3 % sobre cada liberación** de fondos, que se descuenta automáticamente del monto liberado (https://www.trustlesswork.com/pricing). En la demo, esa comisión se aplica **con tokens de prueba sin valor**. Por ejemplo, si se liberan 2 USDC de prueba, el receptor recibe 1,994. En un servicio real, antes de firmar se informaría quién paga la comisión y el monto exacto.
5.3 **Cavos** da el inicio de sesión y una **billetera integrada de Stellar** (una cuenta G…). Según Cavos, es una billetera **autocustodiada**: la llave que firma vive en tu aparato, dentro de un componente seguro de Cavos (vault.cavos.xyz), y **ni Cavos ni Lockumi pueden firmar por ti ni mover tus fondos** (https://cavos.xyz/embedded-stellar-wallet, https://docs.cavos.xyz/docs/concepts). Si pierdes el acceso a tu aparato y a tus métodos de recuperación, podrías perder el acceso a esa cuenta. Lockumi no puede recuperarla. [CONFIRMAR: qué método de recuperación tiene configurado la app en Cavos y los términos de Cavos que aplican.]
5.4 Para obtener USDC de prueba, la app puede enlazar a herramientas de terceros, como el faucet de Circle. Su uso se rige por las condiciones de cada tercero.
5.5 Lockumi elige a estos proveedores con cuidado, pero no controla su funcionamiento. Si un tercero falla, Lockumi te informará en cuanto lo sepa y hará lo razonable para resolverlo dentro de la demo.

## 6. Reglas de la simulación: retención y devolución
Estas reglas describen cómo funciona la simulación. En la demo no generan derechos ni obligaciones reales.
6.1 **Inventario.** Al inicio, ambas partes firman en la app el inventario de entrada con fotos de cada ambiente. Al terminar, se hace el inventario de salida. Si no hay inventario de entrada firmado por ambas partes, la simulación no permite retener por daños. Si el inquilino no hace el inventario de salida, el dueño puede hacerlo solo y el inquilino puede objetarlo.
6.2 **Motivos de retención (lista cerrada).** Solo se puede retener por: a) daños imputables al inquilino o a sus convivientes o visitas, más allá del desgaste normal, comparando las fotos de entrada y de salida; b) faltantes de elementos del inventario de entrada, a su valor menos depreciación; c) limpieza para volver al estado documentado al inicio, al costo real y con tope; d) reparaciones que el contrato de alquiler asigne expresamente al inquilino; e) alquiler pendiente hasta el día de la entrega, con comprobante; f) servicios o cuotas de condominio a cargo del inquilino, con el recibo del proveedor.
6.3 **Motivos de devolución.** Se devuelve: a) lo que corresponda al desgaste normal y al paso del tiempo; b) lo que se deba a vicios o defectos del inmueble, caso fortuito o fuerza mayor; c) las reparaciones que le tocan al dueño; d) todo el depósito, si el dueño no reclama a tiempo; e) cualquier monto que se reclame sin pruebas o que supere el costo justificado; f) la parte no reclamada, de inmediato.
6.4 **Pruebas.** Cada monto reclamado debe indicar su motivo, las fotos y una factura o un presupuesto.
6.5 **Plazos.** El dueño tiene **7 días naturales** desde la entrega de las llaves para reclamar. Si no reclama, se libera todo al inquilino. El inquilino tiene **7 días naturales** para responder, y si no responde, se entiende que **no acepta** el reclamo. La demo permite adelantar el tiempo para mostrar estos plazos.
6.6 **Tope.** Lo retenido nunca supera el depósito.
6.7 **Desacuerdo.** En la demo, si el inquilino no acepta el reclamo, el caso pasa a una persona mediadora **simulada**, que propone un reparto. En un servicio real, la mediación la haría una persona neutral, que no decide por las partes, y cualquiera de las partes podría acudir a los tribunales.

## 7. Uso aceptable
No está permitido: a) usar la app para alquileres o depósitos reales, ni para engañar a otra persona haciéndole creer que la demo tiene valor; b) subir fotos de personas, documentos de identidad, datos sensibles o contenido ilegal u ofensivo; c) intentar vulnerar la seguridad de la app, de sus proveedores o de la red; d) automatizar el uso de la app de forma abusiva; e) suplantar a otra persona. Si alguien incumple estas reglas, Lockumi puede suspender su acceso a la demo y le avisará el motivo.

## 8. Propiedad intelectual
La marca Lockumi, el logo, los textos, el diseño y el código de la app pertenecen a sus titulares. Puedes usar la app para probarla, pero no copiar, modificar ni distribuir esos elementos sin permiso escrito. Las fotos que subas siguen siendo tuyas. Nos das permiso para guardarlas y mostrarlas a la otra parte del alquiler simulado, y a la persona mediadora simulada, solo para que la demo funcione.

## 9. Responsabilidad
9.1 La app se ofrece como demostración, de forma gratuita, y puede tener errores o interrupciones. Como en la demo no se usa dinero real, no deberías sufrir pérdidas económicas por usarla.
9.2 Lockumi responde por los daños que cause conforme a la ley costarricense. Nada en estos términos limita los derechos que te da la Ley 7472, de Promoción de la Competencia y Defensa Efectiva del Consumidor, ni la responsabilidad que la ley no permite excluir.
9.3 Lockumi no responde por el funcionamiento de la red de prueba de Stellar ni de los servicios de terceros de la cláusula 5, salvo en la medida en que el daño se deba a su propia falta.

## 10. Rendimiento, intereses e inversión
10.1 **Lockumi no ofrece rendimiento, intereses ni inversión de los depósitos.** Nada en estos términos ni en la app es una oferta, una recomendación ni una invitación a invertir.
10.2 **Función futura, NO disponible.** Lockumi está evaluando, sin fecha, una función opcional que destinaría el depósito a un protocolo de préstamos en USDC (Blend) mientras dure el alquiler. Se describe aquí solo para informar. **Hoy no está activa ni en la demo ni en ningún otro lugar**, y no se puede contratar.
a) **Reparto que se está evaluando:** si algún día hubiera rendimiento, se repartiría 40 % para el inquilino, 40 % para el dueño y 20 % para Lockumi. El rendimiento sería **variable y no garantizado**, podría ser cero y **podría haber pérdida** de parte o de la totalidad del depósito.
b) **Riesgos:** fallas o ataques al protocolo o al contrato digital; riesgo del emisor del USDC y de las demás contrapartes; falta de liquidez, que podría retrasar la devolución del depósito al terminar el alquiler. El USDC **no es moneda de curso legal** en Costa Rica (Banco Central de Costa Rica). No es un depósito bancario y **no tiene garantía de depósitos**.
c) **Aceptación por separado:** se activaría solo si el dueño y el inquilino la aceptan **cada uno por separado y de forma expresa**, con términos propios. Cualquiera de los dos podría retirarse según esos términos.
d) **Condición regulatoria:** **no se activará sin el visto bueno de un abogado ni sin un análisis regulatorio** que incluya, entre otros temas, la regulación de la intermediación financiera (Ley 7558), del mercado de valores (Ley 7732) y de los proveedores de servicios de activos virtuales (Ley 7786), y, si corresponde, la autorización de la autoridad competente.

## 11. Datos personales
El tratamiento de tus datos se explica en el **Aviso de privacidad de la app** [ENLACE]. La dirección de tu billetera y las transacciones quedan registradas en una red pública que no se puede borrar.

## 12. Cambios
Podemos cambiar estos términos para reflejar cambios en la demo o en la ley. Publicaremos la nueva versión con su fecha y te avisaremos en la app antes de que rija. Si el cambio te afecta de forma importante, te pediremos que lo aceptes de nuevo. Si no estás de acuerdo, puedes dejar de usar la app y pedir que borremos tus datos.

## 13. Ley aplicable y tribunales
Estos términos se rigen por las leyes de la República de Costa Rica. Cualquier controversia se someterá a los tribunales de Costa Rica, sin perjuicio de los derechos que la ley te dé como consumidor ni de la posibilidad de acudir a la Comisión Nacional del Consumidor o a un mecanismo de resolución alterna de conflictos, si ambas partes lo aceptan.

## 14. Contacto
Para dudas, reclamos o para ejercer tus derechos: **business.applockumi@gmail.com**.
