# Plan · Modo imán con guías, vibración e interruptor (fase 3)

> Tarea del roadmap: «Modo imán con guías y vibración». Issue #70, rama `fase-3/iman-guias`.
> Punto de partida: el borrador de la PR #53 (cerrada). Lo que cambió respecto a él está en
> «Decisiones»; cómo quedó implementado, en docs/ARCHITECTURE.md («Imán»).

## Decisiones

| Tema | Decisión | Por qué |
| --- | --- | --- |
| Objetivos | Centro de la imagen sobre el eje vertical y el horizontal del lienzo; rotación a múltiplos de 90° | Es lo que se usa al calcar: dejar la imagen centrada y recta. 45° y los 4 bordes se quedan en `snapTransform` (playground de PC) |
| Histéresis | Engancha a 8 px / 3°; suelta a 16 px / 6° | Sin ella, un dedo quieto en el borde del umbral hace vibrar la imagen |
| Pin | Es un objetivo más: gana a los ejes si posición, escala y giro están dentro de su radio (12 px, 3 %, 3°; suelta a 20 px, 6 %, 6°) | El pin es una elección explícita y fija las cuatro magnitudes. Si los ejes compitieran, una imagen fijada cerca del centro saltaría entre pin y eje |
| Bruta y magnetizada | Los gestos escriben la bruta; el lienzo pinta la magnetizada mientras hay un dedo; al soltar el último dedo la magnetizada pasa a bruta y se guarda | Si la magnetizada fuera la base, la imagen se quedaría pegada a la guía |
| Nudge, reset, espejo | Escriben la bruta y no enganchan; el panel ignora pulsaciones mientras hay un dedo en el lienzo | Un paso de 1 px no puede volver a saltar a la guía; la bruta no puede tener dos escritores |
| Vibración | Solo `guideSnap` al engancharse moviendo. No al soltar ni al tocar una imagen ya encajada | Soltar no es un logro y duplicaría vibraciones; en iOS la cámara silencia el motor, así que la señal principal es la guía con rebote |
| Interruptor | En Ajustes, activo por defecto, tabla `settings` (migración v6) | Es una forma de trabajar, no un dato del dibujo. La lectura no retrasa la cámara |

## Piezas

- `packages/core/src/magnet.ts`: `magnetize`, `magnetEngaged`, `NO_MAGNET_LOCK`, umbrales
  (worklets puros, con tests de umbrales, histéresis, ángulos negativos y > 360°, espejo y pin).
- `packages/core/src/storage/settings.ts` y migración v6.
- `apps/mobile/src/camera/useOverlayGestures.ts`: bruta/magnetizada, contador de dedos, háptica.
- `apps/mobile/src/camera/MagnetGuides.tsx`: guías en Skia, en el mismo `<Canvas>` que la imagen.
- `apps/mobile/src/settings/AppSettingsProvider.tsx` y la fila de `app/settings.tsx`.

## Casos límite cubiertos

- Tocar una imagen que ya está sobre un eje no vibra (al empezar se anota en silencio qué sostiene).
- Soltar un dedo con otro moviendo no fija nada: manda el último que se levanta.
- Perder el foco, pasar a segundo plano o desmontar termina los toques y conserva lo pintado.
- Un cambio del interruptor antes de que termine la lectura de `settings` gana a la lectura.
- Posible doble vibración al salir del pin y caer a la vez en un eje (aceptado).

## Verificación en el móvil

Ver la lista de la PR (#70).
