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

**2026-10-10 · Puerta pasada.** Prueba hecha con la build `preview` en el móvil principal y en un
Android modesto. Resultado cualitativo: fluido en los dos, sin tirones notados al calcar, y la
imagen no se mueve con el candado. Sin cifras registradas: no se anotaron los valores del contador,
modelos, temperatura ni batería, así que la tabla de arriba queda como plantilla para repetir la
medición si aparece algún problema de rendimiento (p. ej. al añadir el divisor en trozos o la
importación de fotos grandes en la fase 3). Plan B no necesario por ahora.

## Memoria de la imagen del overlay (issue #62)

**Antes del arreglo** (development build, `adb shell dumpsys meminfo com.mkcodev.ardarwin.dev`,
varias tandas de abrir y cerrar la cámara de proyectos con 2 fotos grandes):

| Medida | Evolución |
| --- | --- |
| Graphics / GL mtrack | 31 → 38 → 52 → 59 → 71 → 73 MB (sube en cada tanda, no baja) |
| Native Heap | 503 → 542 MB |
| TOTAL PSS | 675 → 786 MB |

Crecimiento sostenido: las imágenes de Skia no se liberaban al salir de la cámara (el GC de Hermes
no ve su peso nativo). Arreglo: `dispose()` explícito en `useProjectImage` (ver
docs/ARCHITECTURE.md, «Cámara del proyecto»).

**Después del arreglo:** Graphics siguió subiendo unos 7 MB por apertura. La foto no era la fuga
principal. El `dispose()` se queda porque es correcto.

### Investigación (17 oct 2026)

Medido con GC forzado (`kill -10`) antes de cada lectura, 10 aperturas por variante, en una
pantalla de diagnóstico que montaba cada pieza por separado (ya retirada):

| Variante | Texturas GL | Views | Lectura |
| --- | --- | --- | --- |
| Solo `<Camera>` | plano | +13 por apertura | Vision Camera retiene su vista |
| Solo el Canvas de Skia con la foto | +7 MB la primera vez (caché), luego plano | plano | Skia está bien |
| Pantalla real sin overlay | plano | 131 → 299 | ídem |
| Pantalla real sin `<Camera>` | +7 MB una vez, luego plano | plano | Skia está bien |

Las texturas solo filtran con la cámara y el overlay juntos.

**Causa:**
[vision-camera#4180](https://github.com/mrousavy/react-native-vision-camera/issues/4180) (5.2.3, Android,
abierto). Al desmontar se llama a `onDropView()`, no a `dispose()`, y `HybridPreviewView` nunca
desconecta el preview output. Ese output es un objeto Nitro de JS que Hermes casi nunca recoge, y su
referencia global JNI retiene la `PreviewView`. La cadena completa: JNI → `HybridPreviewOutput` →
`surfaceProvider` → `PreviewView` → `mParent` → toda la pantalla → `SkiaTextureView` y su textura a
pantalla completa (~7 MB). Además, `useCameraSession` nunca libera la sesión: su `CustomLifecycle`
sigue registrado, así que se filtra una `HybridCameraSession` por apertura.

**Descartado:**
- Parche de Skia ([#4079](https://github.com/Shopify/react-native-skia/issues/4079)/PR #4080):
  bajó de 7 a 5,3 MB, pero no era la causa.
- Apaños en JS:
  - pasar `previewOutput={undefined}`: Fabric lo manda como `null` y Nitro solo acepta `undefined`;
  - llamar a `previewOutput.dispose()`: en desarrollo, Fabric congela las props de los componentes
    nativos (`deepFreezeAndThrowOnMutationInDev`) y Hermes ya no puede quitar el `NativeState`.

**Arreglo previsto:** en el próximo rebuild nativo (ver docs/ROADMAP.md), parche de
react-native-vision-camera con las PRs #4185 (`onDropView()` suelta la vista y desconecta el
output) y #4186 (se destruye el `CustomLifecycle` en cada `configure`), más `session.dispose()` en
el teardown de `useCameraSession`.
