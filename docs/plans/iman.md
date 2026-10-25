# Plan · Modo imán con guías, vibración e interruptor (fase 3)

> Borrador para revisar. Tarea del roadmap: «Modo imán con guías y vibración (`snapTransform`)».
> No hay código todavía. Lo que aparece como «A decidir» espera tu respuesta antes de empezar.

## Contexto

PRD → «Detalle: menú de la cámara · Modo imán»:
- La imagen se alinea sola con el centro y los 4 bordes de la pantalla.
- Las guías en azul no-foto solo se ven mientras está encajada.
- Vibración ligera al encajar.
- Rotación imantada a múltiplos de 45°.
- Un interruptor para activarlo o desactivarlo.
- Umbrales de 8 px y 3°.

La matemática ya está hecha y probada en core. En el móvil falta conectarla a los gestos, dibujar
las guías con Skia y añadir el interruptor. El playground de PC
(`apps/desktop/src/playground/camera/`) ya lo resuelve en la web y sirve de referencia de
comportamiento.

## Lo que ya existe (se reutiliza)

| Pieza | Dónde | Para qué |
| --- | --- | --- |
| `snapTransform(t, image, viewport, options)` → `{ transform, activeGuides }` | `packages/core/src/transform.ts` (worklet) | Encaje de posición, escala y rotación (45°) |
| `DEFAULT_SNAP_OPTIONS` (8 px, 3°, `move`) | ídem | Umbrales del PRD |
| `useOverlayGestures` | `apps/mobile/src/camera/` | Ya tiene los huecos marcados («Magnet (next task)») en pinch y rotate |
| `magnetGuide` (doble trazo y marcas cada 20 px, mayor cada 5) | `packages/ui/src/components.ts` | Medidas de la guía |
| `camera.guide` / `guideCase` | tokens de `packages/ui` | Colores (contraste ≥ 3,8:1 en todos los folios, DESIGN.md) |
| `spring.snappy` + `resolveMotion` | `packages/ui`, `apps/mobile/src/theme/motion.ts` | Rebote de la guía; fundido de 120 ms con «reducir movimiento» |
| `haptics.guideSnap` + `playHaptic` | `packages/ui/src/haptics.ts`, `apps/mobile/src/theme/playHaptic.ts` | Impacto ligero al encajar |
| `IconButton` (`pressed`) + icono `magnet` | `apps/mobile/src/components/` | Interruptor |
| i18n `camera.magnet`, `camera.status.magnetOn/Off` | `packages/i18n` | Etiqueta y aviso de estado |
| `MagnetGuide.tsx`, `CameraView.tsx` | playground de PC | Referencia: dibujo de la guía y regla «vacío → no vacío = vibrar» |

## Diseño

### 1. Contrato «mostrar imantado, guardar al soltar» (como dice ARCHITECTURE.md)
- `useOverlayGestures` guarda la transformada **en bruto** del gesto (la base para el frame
  siguiente) separada de la **mostrada**. Hoy x/y/scale/rotation hacen de las dos cosas.
  - Bruto: los shared values actuales (`x`, `y`, `scale`, `rotation`…). Los gestos siguen sumando
    sobre ellos con `applyGesture`.
  - Mostrado: un `useDerivedValue` que aplica `snapTransform(bruto)` si el imán está activo, o
    devuelve el bruto si no. Todo en el hilo de UI y sin `setState` por frame.
  - `OverlayCanvas` construye la matriz con la transformada **mostrada**.
- Al acabar el gesto (`onEnd` de pan, pinch y rotate) se copia la mostrada al bruto y se llama a
  `emitSettle`, así que se guarda el valor imantado. Así la imagen nunca se queda pegada a la guía
  mientras arrastras.
- El modo es `move` en todos los gestos táctiles, igual que en PC. `scale` (encajar el borde
  cambiando solo el tamaño) no se usa en este paso. Ver «A decidir».
- El doble toque (`reset`) y el ajuste fino **no** pasan por el imán: un paso de 1 px no puede
  volver a saltar a la guía. Igual que `nudgeBy` en PC.

### 2. Guías (Skia, dentro de `OverlayCanvas`)
- Un componente nuevo, `MagnetGuides.tsx` (un componente por archivo), que recibe `activeGuides`
  como shared value y el tamaño del lienzo. Dibuja cada guía con doble trazo (funda `guideCase` y
  núcleo `guide`) y marcas cada `magnetGuide.tickSpacing`, igual que `MagnetGuide.tsx` de PC pero
  con `Path` de Skia.
- La guía aparece con el muelle `snappy` (un pequeño rebote en opacidad y grosor) y se desvanece
  al soltar. Con «reducir movimiento», fundido de 120 ms (`resolveMotion`).
- Va **encima** de la imagen y **debajo** de los controles.

### 3. Vibración y señal visual
- La regla es la de PC: vibra cuando `activeGuides` pasa de vacío a no vacío. Un
  `useAnimatedReaction` sobre la longitud compara el valor anterior y el nuevo y llama a
  `scheduleOnRN(playHaptic, "guideSnap")`, una vez por encaje y nunca por frame.
- En iOS el Taptic Engine no vibra con la cámara activa (DESIGN.md). Por eso la señal principal
  es la visual: el rebote de la guía.
- La comparación «vacío → no vacío» va a core como función pura con tests:
  `guideSnapped(prevCount, nextCount): boolean` (worklet), que también comprueba
  `worklet.test.ts`.

### 4. Interruptor
- Un `IconButton` `magnet` con `pressed` en la fila de controles de la cámara
  (`CameraOverlayScreen`, `extraControls`), que se oculta con el candado como el resto. Cuando
  llegue la tarea «Menú flotante en píldora», se moverá a la píldora.
- El estado vive en un `SharedValue<boolean>` (lo lee el derivado del hilo de UI) y se refleja en
  React solo al pulsar (`pressed`, accesibilidad).
- Al cambiarlo se muestra el aviso «Imán activado / desactivado» (i18n ya existe). Reutiliza el
  patrón de `LockedToast`, generalizándolo a un `CameraStatusToast`, o lo hace un componente
  nuevo. Ver «A decidir».
- Accesibilidad: objetivo de 48 px, `accessibilityRole="switch"` y `accessibilityState.checked`.

### 5. Persistencia
- Por defecto: **activado**, como en PC. Ver «A decidir» sobre si se recuerda.

## Archivos
- `packages/core/src/transform.ts` (o un `magnet.ts` nuevo): `guideSnapped` y sus tests.
- `apps/mobile/src/camera/useOverlayGestures.ts`: separa bruto y mostrado, `magnet` como opción
  y `activeGuides` en lo que devuelve.
- `apps/mobile/src/camera/OverlayCanvas.tsx`: usa la transformada mostrada y dibuja
  `MagnetGuides`.
- `apps/mobile/src/camera/MagnetGuides.tsx`: nuevo.
- `apps/mobile/src/camera/CameraOverlayScreen.tsx`: el interruptor y el aviso.
- `docs/ARCHITECTURE.md`: sección «Imán en la cámara». Tarea marcada en `docs/ROADMAP.md`.

## Riesgos
- **Rendimiento:** `snapTransform` corre en cada frame del gesto, pero son unas pocas operaciones
  sobre la caja envolvente. Se mide con el `FpsMeter` de `/dev/camera` (issue #20) con la foto de
  4096 px.
- **Saltos al soltar:** la mostrada se convierte en bruto en el `onEnd` de **cada** gesto. Con
  pan, pinch y rotate simultáneos, el primero en terminar no debe fijar el valor si otro dedo
  sigue moviendo. Se fija cuando ya no queda ningún gesto activo (contador en un shared value).

## Verificación
- `pnpm typecheck && pnpm test && pnpm lint` (tests de `guideSnapped` y `worklet.test.ts`).
- En el móvil:
  1. Arrastrar hacia el centro y los bordes: encaja a menos de 8 px y sale la guía.
  2. Girar cerca de 0°, 45° y 90°: encaja.
  3. Soltar encajado, salir y volver: se ha guardado el valor imantado.
  4. Con el imán apagado no encaja.
  5. Vibra una vez por encaje (en Android).
  6. Con «reducir movimiento», fundido sin rebote.
  7. 60 fps con la foto de 4096 px (`FpsMeter`).

## A decidir
1. **¿Se recuerda el interruptor?** Opciones: por proyecto (nueva columna, migración), como
   preferencia global del dispositivo, o no recordarlo (siempre activado al abrir). Propuesta:
   preferencia global, porque es una forma de trabajar y no un dato del dibujo.
2. **Modo `scale`:** ¿imantar también el tamaño al pellizcar (que un borde caiga en una guía sin
   mover la imagen)? Propuesta: no en esta tarea; solo `move` + rotación, como en PC.
3. **Umbrales configurables** (el PRD dice «configurables»): ¿aquí o en la tarea «Ajustes»?
   Propuesta: en Ajustes. Aquí se usan las constantes de `DEFAULT_SNAP_OPTIONS`.
4. **Aviso de estado:** ¿generalizar `LockedToast` a un aviso de cámara reutilizable (imán, candado)
   o hacer otro componente? Propuesta: generalizarlo.
