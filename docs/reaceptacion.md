# Nueva aceptación con la sesión abierta (propuesta, sin código)

Estado: **solo imagen**, esperando el OK de Katherine
(`/workspace/lockumi/diseno/envio/contrato-compacto/reaceptacion.jpg`). Debe salir **junto con 1.6-demo**: sin esto,
quien ya tiene la sesión abierta nunca vuelve a ver «Entrar» (`App.tsx:39`) y no acepta la nueva versión.

## Cuándo sale
- Al cargar `App.tsx` **con sesión** (`auth.actual()` devuelve un usuario), si la aceptación guardada de los Términos **o** del
  Aviso de privacidad no es la versión actual (`!aceptoVersion('terminos', TERMINOS.version) || !aceptoVersion('privacidad', PRIVACIDAD.version)`).
  Se compara igual que en «Entrar» (la misma versión exacta, no «mayor o menor»): 1.5-demo o nada guardado → sale; 1.6-demo → no sale.
- Va después de las páginas legales (`/terminos` y `/privacidad` se siguen viendo, para poder leerlas) y antes de cualquier otra pantalla.
- Bloquea: sin la barra de arriba, sin «Salir» y sin otro camino. No cambia la ruta: al aceptar, sigue a la pantalla que se estaba
  abriendo (también un link de invitación).

## Qué muestra (un paso, sin palabras técnicas)
- Casita animada de Lockumi.
- Título: «Actualizamos los Términos y el Aviso de privacidad (versión 1.6-demo, 24 oct 2026).» Texto: «Para seguir usando Lockumi,
  revísalos y acéptalos.» La versión y la fecha se pueden armar desde `TERMINOS.version` y la fecha del documento, para no tener que
  cambiarlas a mano.
- Las mismas dos casillas de «Entrar» (`CasillaLegal` + `CONSENTIMIENTO_PRIVACIDAD`), **sin marcar**, con los enlaces a `/terminos` y
  `/privacidad` en otra pestaña.
- Botón «Aceptar y seguir», **desactivado hasta que estén las dos marcadas**. (En «Entrar» el botón está activo y muestra los errores
  al tocarlo; aquí se pidió desactivado.)

## Qué guarda
- Igual que «Entrar»: `guardarAceptacion(c, version)` para cada documento → `{ version, fecha }` con fecha y hora ISO 8601 en
  `lockumi.terminos.aceptacion` y `lockumi.privacidad.consentimiento`. Después se copia al usuario con
  `guardarUsuario(conAceptacion(u))` (`lockumi.usuario` → `terminos`, `privacidad`).

## Pruebas
- Sesión con 1.5-demo guardado en los dos documentos (y en `lockumi.usuario`): sale la pantalla, no hay «Salir», las dos casillas
  están sin marcar y el botón desactivado. Con una sola marcada, el botón sigue desactivado. Con las dos, se activa. Al tocarlo se
  guarda 1.6-demo con fecha y hora en los dos documentos y en el usuario, y se ve la pantalla de antes.
- Sesión con Términos 1.6-demo y Privacidad 1.5-demo: sale igual (falta una).
- Sesión con las dos en 1.6-demo: no sale.
- Sin sesión: no sale (está «Entrar»). `/terminos` y `/privacidad` se ven aunque falte aceptar.

En un borrador aparte (no subido), con el build real (`VITE_TRUSTLESS=1`) y una sesión con 1.5-demo, el botón estuvo desactivado
con 0 o 1 casillas y activo con 2, no apareció «Salir», y al aceptar se guardó 1.6-demo con fecha y hora en los dos documentos y en el usuario.

## Estimación para construirla
- Tiempo real mío: unos 20 a 30 minutos (componente de ~30 líneas, un `if` en `App.tsx`, 4 pruebas, revisión en teléfono y
  computadora, CI y vista previa). El borrador para la imagen me tomó unos 7 minutos.
- Una persona: unas 4 a 6 horas de trabajo (componente y estilos, conexión en `App.tsx`, pruebas, accesibilidad: foco y lector de
  pantalla, revisión en teléfono y computadora, y revisión del código).
