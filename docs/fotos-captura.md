# Fotos de entrada y salida: cómo se capturan y qué se puede garantizar

## Implementación en Lockumi
1. **Principal: cámara dentro de la app** (`navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`).
   Se muestra el video en vivo y el botón "Tomar foto" copia el cuadro a un `<canvas>`. No existe la opción de elegir de la galería.
   Se usa en celular y en computadora (webcam).
2. **Respaldo: `<input type="file" accept="image/*" capture="environment">`** cuando no hay cámara en vivo (sin permiso,
   navegador sin `getUserMedia`, navegador interno de otra app, sin HTTPS).
3. Para cada foto se guarda: hora en que se tomó o eligió (`Date.now()`), la fecha que trae la imagen (EXIF
   `DateTimeOriginal`, si existe) y una huella SHA-256 del archivo original (`crypto.subtle.digest`).
   Si la foto llegó como archivo y no trae fecha, o la fecha es más de 10 minutos anterior, se marca
   **"Posible foto de galería"**. Las fotos de la cámara de la app nunca se marcan.

## Comportamiento real de `capture` (con fuentes)
- **Especificación**: `capture` es una *preferencia* ("is preferred"); el navegador *debería* abrir un selector de captura,
  pero no está obligado. W3C HTML Media Capture: https://www.w3.org/TR/html-media-capture/
- **MDN**: soporte limitado ("not Baseline"); en computadora se obtiene el selector de archivos normal.
  https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture
- **Android Chrome**: con `capture` abre directamente la app de cámara y quita la opción de elegir una foto existente
  (web.dev, equipo de Chrome): https://web.dev/articles/media-capturing-images . Sin `capture`, las versiones recientes
  muestran el selector de fotos de Android (galería).
- **iOS Safari**: con `capture` abre la cámara directamente; sin `capture` ofrece "Tomar foto" o "Fototeca".
  Desde iOS 10.3 respeta `capture` (antes lo ignoraba). Referencias: web.dev (arriba) y
  https://stackoverflow.com/questions/43396109 .
- **Samsung Internet**: se comporta como Chrome (Chromium); la versión 29 tiene un error con `multiple` + galería que
  congela el campo, por eso no usamos `multiple`. https://hi098123.tistory.com/533 ; soporte de `input file`:
  https://caniuse.com/wf-input-file
- **Laptop/escritorio**: `capture` se ignora y se abre el explorador de archivos (MDN, web.dev). Por eso en computadora
  usamos la webcam con `getUserMedia`; si no hay cámara o no hay permiso, se avisa y se ofrece subir un archivo.
- **getUserMedia**: requiere HTTPS (contexto seguro) y permiso del usuario.
  https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia . En iOS funciona en Safari desde la
  versión 11 y en navegadores internos (WKWebView) desde iOS 14.3 solo si la app anfitriona tiene permiso de cámara
  (https://stackoverflow.com/questions/68485089).

## Límites honestos
- `capture` **no bloquea la galería en el 100 % de los navegadores**: es una sugerencia; navegadores internos de apps y
  versiones viejas pueden mostrar la galería igual.
- Un `<input type="file">` **siempre se puede sortear** (por ejemplo, con herramientas de desarrollador o un navegador que
  ignore `capture`). La fecha EXIF se puede editar o borrar; por eso es una señal, no una prueba.
- La opción más fuerte disponible en la web es la **cámara en vivo con `getUserMedia` dentro de la app**: no permite elegir
  de la galería. Aun así, alguien podría apuntar la cámara a otra pantalla; para evitarlo haría falta atestación del
  dispositivo (fuera del alcance de una app web).
- La huella SHA-256 sirve para demostrar que la foto no cambió después de guardarla, no para demostrar cuándo se tomó.
