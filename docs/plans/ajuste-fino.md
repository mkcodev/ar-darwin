# Plan · Botones de ajuste fino (fase 3)

> Borrador para revisar. Tarea del roadmap: «Ajuste fino: dos velocidades, pulsación larga, reset
> y candado (`nudge`)». No hay código todavía. Lo que aparece como «A decidir» espera tu respuesta
> antes de empezar.

## Contexto

PRD → «Detalle: menú de la cámara · Botones de ajuste fino», para colocar la imagen con precisión
sin pellizcar:
- Agrandar y reducir, mover en las 4 direcciones y rotar ±1°.
- Dos velocidades: fino y grande (1 px / 10 px, 1 % / 5 %, 1° / 5°).
- Una pulsación larga repite.
- Botón de resetear la posición.
- Candado que bloquea posición, tamaño y rotación.

La lógica está hecha y probada en core (`nudge`, `NUDGE_STEPS`). La pulsación larga ya existe en el
móvil (`useHoldRepeat`) y el playground de PC tiene el panel completo como referencia
(`NudgePad.tsx`, `NudgeButton.tsx`).

## Lo que ya existe (se reutiliza)

| Pieza | Dónde | Para qué |
| --- | --- | --- |
| `nudge(t, action, step, { base })` | `packages/core/src/transform.ts` (worklet) | Un paso; `reset` vuelve a `base` y conserva los espejos |
| `NUDGE_STEPS` | ídem | 1/10 px, 1 %/5 %, 1°/5° (lo del PRD) |
| `fitTransform` | ídem | `base` del reset (igual que el doble toque actual) |
| `useHoldRepeat` + `holdRepeat` (retraso y cadencia) | `apps/mobile/src/components/`, `packages/ui` | Pulsación larga = repetición; `fn` devuelve `false` para parar en un límite |
| `IconButton`, iconos `arrowUp/Down/Left/Right`, `plus`, `minus`, `rotateCw/Ccw`, `reset` | móvil y `packages/ui` | Botones |
| `FloatingPill` con `placement="freeHand"` + `useHandedness` | `apps/mobile/src/components/`, `theme/` | Panel en el lado de la mano libre |
| `haptics.nudgeStep` (selección, no en las repeticiones) y `haptics.limitReached` | `packages/ui/src/haptics.ts` | Vibración |
| i18n `camera.menu.nudge`, `camera.nudge.*` (8 acciones, reset, `stepFine`/`stepCoarse`) | `packages/i18n` | Etiquetas accesibles |
| `reset` animado con `spring.gentle` | `useOverlayGestures.ts` (doble toque) | Mismo reset para el botón |
| `NudgePad.tsx` (rejilla 3×3, el centro cambia la velocidad) | playground de PC | Referencia de distribución |

## Diseño

### 1. Acción de un paso (`useOverlayGestures` → `nudgeBy(action, step)`)
- Toma la transformada actual de los shared values, aplica `nudge` y escribe el resultado **sin
  animación**: la precisión exige que cada pulsación se vea al instante.
- **No pasa por el imán.** Si un paso de 1 px pasara por `snapTransform`, la imagen volvería a la
  guía y no se podría separar de ella. Con el imán (`iman.md`), el ajuste fino escribe en la
  transformada bruta y además se salta el derivado imantado hasta el siguiente gesto. Es lo mismo
  que hace `nudgeBy` en PC.
- `reset` reutiliza el reset del doble toque: `fitTransform` como base, muelle `gentle` y fundido
  con «reducir movimiento».
- Cada paso llama a `settle`. El guardado ya tiene un debounce de 1 s (`useProjectCameraSession`),
  así que una ráfaga de repeticiones se escribe una sola vez.
- No hace nada si la imagen aún no está colocada (`placed`) o si el candado está puesto.

### 2. Límites
- `nudge` nunca baja de `MIN_SCALE`. Si `scaleDown` devuelve la misma escala, se ha llegado al
  límite: vibración `limitReached`, el botón se deshabilita y la repetición se para (`useHoldRepeat`
  recibe `false`).
- Nueva función pura en core: `nudgeHitLimit(before, after, action): boolean` (worklet), con tests,
  para no comparar números a mano en la UI.

### 3. Panel (`NudgePad.tsx`, nuevo, un componente por archivo)
- Rejilla 3×3 como en PC: girar a la izquierda, subir, girar a la derecha / izquierda, **velocidad**,
  derecha / encoger, bajar, agrandar. Más el botón de reset.
- Cada botón es un `IconButton` `tone="camera"` de 48 px con `useHoldRepeat`.
  - El primer paso vibra con `nudgeStep`; las repeticiones no vibran (DESIGN.md).
- El botón central cambia entre fino y grande. Muestra el valor en Geist Mono (`camera.nudge.stepValue`)
  y su etiqueta accesible es `stepFine`/`stepCoarse`.
- Va dentro de un `FloatingPill` en el lado de la mano libre, que abre y cierra un botón «Ajuste fino»
  en la fila de controles. Cuando llegue la tarea «Menú flotante en píldora», se integrará allí.
- Se oculta con el candado, como el resto de `extraControls`.
- Accesibilidad: cada botón con su etiqueta de i18n. El panel se anuncia como grupo
  (`camera.menu.nudge`).

### 4. Candado
- El PRD incluye un «candado que bloquea posición, tamaño y rotación». Hoy ya existe el bloqueo
  táctil (#19, pulsación larga de 1 s), que ignora gestos y deja solo la opacidad. Ver «A decidir».

## Archivos
- `packages/core/src/transform.ts`: `nudgeHitLimit` y sus tests (más `worklet.test.ts`).
- `apps/mobile/src/camera/useOverlayGestures.ts`: `nudgeBy` y `reset` expuestos.
- `apps/mobile/src/camera/NudgePad.tsx`: nuevo.
- `apps/mobile/src/camera/CameraOverlayScreen.tsx`: el botón que abre el panel y el panel.
- `docs/ARCHITECTURE.md`: sección «Ajuste fino en la cámara». Tarea marcada en `docs/ROADMAP.md`.
- `packages/i18n`: si falta algún texto (p. ej. la etiqueta del botón que abre el panel), se añade
  en es y en.

## Verificación
- `pnpm typecheck && pnpm test && pnpm lint` (tests de `nudgeHitLimit` y worklets).
- En el móvil:
  1. Cada flecha mueve 1 px en fino y 10 px en grande; ±1° / ±5°; ±1 % / ±5 %.
  2. La pulsación larga repite, y solo el primer paso vibra.
  3. Encoger hasta el mínimo: vibra el aviso, se para y el botón se deshabilita.
  4. El reset vuelve a encajar la imagen con muelle, y con «reducir movimiento» sin animación.
  5. Con el imán activado, un paso de 1 px junto a una guía **no** vuelve a la guía.
  6. Salir y volver: se conserva.
  7. Con el candado no se puede tocar.
  8. Zurdos: el panel aparece en el otro lado.
  9. TalkBack lee cada botón.

## A decidir
1. **Candado del PRD:** ¿basta el bloqueo táctil actual (#19) o hace falta otro candado que solo
   fije posición, tamaño y rotación y deje usar el resto del menú? Propuesta: basta el actual. El
   PRD se escribió antes de #19, que ya cubre ese caso (`camera.status.locked`: «Posición
   bloqueada»).
2. **¿Se recuerda la velocidad (fino/grande)?** Propuesta: no; siempre empieza en fino.
3. **Dónde vive el panel hasta que exista la píldora:** ¿una `FloatingPill` que se abre con un
   botón «Ajuste fino» (propuesta) o siempre visible?
4. **Orden con el imán:** propuesta: primero el imán y después el ajuste fino, para hacer y probar
   juntos el «saltarse el imán» del punto 1.
