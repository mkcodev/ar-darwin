# Spike de cámara · prueba real de 10 minutos (issue #20)

Cierra la puerta de la fase 2: **fluido en móvil real (también en un Android modesto) y la imagen
no se mueve al bloquear.**

## Build

Siempre en la build `preview` (release, APK), nunca en la de desarrollo: la dev build ejecuta JS
sin minificar a través de Metro y el dev-client, y sus fps no dicen nada del producto.

```
cd apps/mobile
pnpm dlx eas-cli build -p android --profile preview
```

Se instala como «AR-Darwin» (paquete `com.mkcodev.ardarwin`, icono provisional del árbol) y
convive con «AR-Darwin Dev». `EXPO_PUBLIC_SPIKES=1` deja visible el enlace al spike de cámara.

## Contador de fps

Píldora «fps» junto a «Cuadrícula/Boceto Darwin». Arriba, en el lado contrario al candado:

```
UI 60 · JS 60          ← último segundo
mín UI 54 · JS 41      ← peor segundo de la sesión
peor 50 ms · tirones 3 ← frame más largo de UI y frames de UI > 1,5 × el de la pantalla
```

- **UI**: hilo de UI (Reanimated). Es lo que se nota al mover, pellizcar y girar la imagen.
- **JS**: hilo de JavaScript. Si baja, tardan los botones y el slider, no los gestos.
- La pantalla puede ir a 90/120 Hz: entonces el máximo es 90/120, no 60. Anota la frecuencia.
- La vista previa de la cámara va aparte, fija a 30 fps (`constraints`); no la mide el contador.
- El propio contador añade algo de carga (pide un frame en cada vsync): mídelo siempre encendido
  para comparar móviles en igualdad.
- Al ocultarlo y volverlo a mostrar, la sesión empieza de cero.

## Protocolo

**Antes** (cargador desconectado, brillo fijo a ~70 %, apps cerradas, móvil a temperatura ambiente):
batería %, temperatura (Ajustes › Batería, o `adb shell dumpsys battery` → `temperature` en
décimas de °C) y hora de inicio. Papel fijo con cinta y móvil en un soporte o apoyado como para
calcar de verdad.

| Minuto | Qué hacer | Qué anotar |
| --- | --- | --- |
| 0–1 | Abrir el spike, activar fps. Cuadrícula: arrastrar, pellizcar y girar rápido, con dos dedos a la vez | fps UI/JS en reposo y durante el gesto |
| 1–2 | Boceto Darwin, encajarlo sobre el papel, ajustar opacidad, bloquear (1 s en el candado) | — |
| 2–8 | Calcar de verdad. Mirar el contador en el minuto 4, 6 y 8 | fps en cada vistazo, tirones que notes |
| 8–9 | Con candado: tocar y arrastrar la imagen a propósito, pellizcar encima. Cambiar la opacidad | ¿se movió la imagen respecto a tus trazos? |
| 9–10 | Desbloquear y repetir gestos rápidos (ya en caliente) | fps en gesto; luego mín y tirones de la sesión |

**Después**: batería %, temperatura, ¿el móvil quema al tacto?

Repetir lo mismo en el Android modesto.

## Resultados

Dispositivo A = móvil principal. Dispositivo B = Android modesto.

| | A | B |
| --- | --- | --- |
| Modelo / Android / RAM | | |
| Frecuencia de pantalla (Hz) | | |
| fps UI reposo / gesto (min 0–1) | | |
| fps JS reposo / gesto (min 0–1) | | |
| fps UI / JS en min 4 · 6 · 8 | | |
| fps UI / JS en gesto en caliente (min 9–10) | | |
| Sesión: mín UI / mín JS | | |
| Sesión: peor frame (ms) / tirones | | |
| Tirones que notaste (cuándo, haciendo qué) | | |
| Temperatura inicio → fin (°C) | | |
| Batería inicio → fin (% gastado en 10 min) | | |
| ¿La imagen se movió con candado? | | |
| Opacidad con candado: ¿la cambiaste? ¿útil, o mejor bloquearla también? | | |
| Sensación general (fluido / aceptable / a tirones) | | |

> El slider de opacidad ya funciona con el candado puesto (issue #19); la pregunta es si se usa
> de verdad o si estorba.

## Criterio de la puerta

Se pasa si, en **los dos** dispositivos:

1. UI ≥ 55 fps sostenidos durante los gestos (en pantallas de 60 Hz; proporcional en 90/120 Hz).
2. Ningún tirón notado mientras se calca.
3. La imagen no se mueve con el candado puesto.

Si falla en el Android modesto, plan B (en este orden, midiendo tras cada cambio):

1. Bajar la resolución de la vista previa (constraint de resolución en `<Camera>`).
2. Canvas de Skia con `android={{ surfaceType: "SurfaceView", zOrderOnTop: true }}` (sin la copia
   de textura de `TextureView`; ver docs/ARCHITECTURE.md).

## Decisión

_Pendiente de los resultados._
