# Prompts para Claude Code · AR-Darwin

Siete prompts para las fases 1 a 3, en orden. Cada uno es una sesión: abre `claude` en la raíz del proyecto, pega el prompt, revisa el plan que te proponga y aprueba antes de que escriba código. Entre prompts, limpia el contexto (`/clear`).

---

## Prompt 1 · Base del repo

```text
Lee CLAUDE.md y todo docs/: es el plan completo de AR-Darwin. Los docs ya existen; no los reescribas.

Tarea: montar la base del monorepo. Usa modo plan y espera mi OK.

1. Monorepo con pnpm workspaces + Turborepo: apps/mobile, apps/desktop, packages/core, packages/ui, packages/i18n.
2. TypeScript estricto compartido (tsconfig base), Biome para lint y formato, Vitest en packages/core.
3. Scripts raíz: dev:mobile, dev:desktop, test, typecheck, lint.
4. GitHub Actions que ejecute typecheck, lint y test en cada PR y en main.
5. .gitignore adecuado e inicializa git.

De momento apps/mobile y apps/desktop solo como esqueleto que arranca (Expo con development build y Vite + React).
Para Expo, carga la skill expo-overview y consulta la documentación actual. Si create-expo-app genera su propio
CLAUDE.md o AGENTS.md dentro de apps/mobile, déjalo, pero que no contradiga el CLAUDE.md de la raíz.
No añadas nada que no esté en el plan.
Al acabar, enséñame el árbol de carpetas, confirma que los 3 comandos de calidad pasan y marca las tareas en docs/ROADMAP.md.
```

---

## Prompt 2 · El divisor en core

```text
Tarea: implementar computeTiles en packages/core, con tests primero (TDD).
Especificación en docs/ARCHITECTURE.md y docs/PRD.md (Detalle: divisor de imagen).

Firma: computeTiles(image: { width: number; height: number }, config: SplitConfig): Tile[]

Reglas:
- Divide la imagen en rows × cols. Los trozos al ras (coreRect) cubren la imagen entera sin huecos ni solapes;
  reparte los píxeles sobrantes redondeando los límites (Math.round(i * width / cols)).
- overlapPx = 0 → corte al ras: rect === coreRect.
- overlapPx > 0 → cada trozo se extiende overlapPx SOLO por sus bordes interiores (donde hay vecino).
  Nunca por el borde exterior de la imagen.
- Limita overlapPx a la mitad del lado más corto de un trozo.
- ids: fila en letra y columna en número → A1, A2… B1. Orden: por filas, de izquierda a derecha.
- rows y cols entre 1 y 10; valida con Zod y lanza un error claro si no.

Tests mínimos: 1×1, 2×2 al ras, 2×2 con solape (comprueba cada borde), 3×1 con píxeles sobrantes,
límite de overlap, ids, y que la unión de coreRect sea exactamente la imagen.
```

---

## Prompt 3 · Imán y ajuste fino en core

```text
Tarea: implementar snapTransform y nudge en packages/core, con tests primero.
Especificación en docs/ARCHITECTURE.md y docs/PRD.md (Detalle: menú de la cámara).

snapTransform(transform, imageSize, viewport, options) → { transform, activeGuides }
- Guías: centro horizontal y vertical del viewport y sus 4 bordes.
- Si el centro o un borde de la imagen transformada queda a menos de options.threshold px de una guía, encaja exacto.
- Rotación: encaja en múltiplos de 45° si está a menos de options.rotationThreshold grados.
- Devuelve las guías activas para dibujarlas (la UI vibrará cuando pasen de 0 a alguna).
- Puro y sin dependencias de React: debe poder llamarse desde un worklet de Reanimated.

nudge(transform, action, step) → transform
- action: scaleUp, scaleDown, moveUp, moveDown, moveLeft, moveRight, rotateCw, rotateCcw, reset.
- step 'fine' y 'coarse' con valores por defecto en un objeto NUDGE_STEPS
  (mover 1 / 10 px, escala 1 % / 5 %, rotar 1° / 5°).
- La escala nunca baja de 0.05.

Tests para cada guía, cada acción, los umbrales y los límites.
```

---

## Prompt 4 · Spike de cámara

```text
Tarea: spike de la pantalla de cámara en apps/mobile. Objetivo: validar rendimiento, no diseño final.

1. Carga la skill expo-overview y consulta la configuración actual de react-native-vision-camera,
   @shopify/react-native-skia, react-native-reanimated y react-native-gesture-handler con Expo (development build).
2. Cámara trasera a pantalla completa. Encima, un Canvas de Skia con una imagen de prueba de assets/.
3. Gestos simultáneos: arrastrar, pellizcar y rotar con dos dedos, todo en el hilo de UI.
4. Slider de opacidad.
5. Botón de bloqueo: ignora todos los toques salvo una pulsación larga de 1 s sobre el candado.
6. Pantalla siempre encendida mientras está abierta.

Usa snapTransform y nudge de packages/core si ya existen. Explícame qué tengo que configurar en mi móvil
para probarlo y qué medir (fps y si la imagen se mueve al bloquear).
```

---

## Prompt 5 · Sistema de diseño

```text
Usa las skills frontend-design y ui-ux-pro-max (y expo-design-system para la parte móvil).

Lee docs/DESIGN.md (concepto «Grafito y luz»). Quiero una app moderna, con animaciones leves y muy original.
1. Propón 2 alternativas de paleta y pareja tipográfica además de la del documento, con su razonamiento.
   Espera a que elija.
2. Con la elegida, crea packages/ui: tokens de color (oscuro y claro), tipografía, espaciado (base 4),
   radios, sombras (mínimas) y movimiento (duraciones y configuraciones de muelle para Reanimated y Motion).
3. Crea en apps/desktop una página /playground que muestre todos los tokens y los componentes base
   (botón, píldora flotante, hoja inferior, slider, toggle) con sus animaciones.
4. Actualiza docs/DESIGN.md con la elección final.
Nada genérico: si un componente podría ser de cualquier app, rediséñalo.
```

---

## Prompt 6 · Pantalla del divisor

```text
Tarea: pantalla del divisor en apps/mobile. Lee docs/PRD.md (Detalle: divisor de imagen) y docs/DESIGN.md.

- Vista previa en vivo de la imagen con las líneas de corte y la zona extendida tintada en azul no-foto.
- Controles: filas y columnas (1–10), interruptor Al ras / Bordes extendidos, slider y botones +/− del grosor.
- Nombres A1, A2… sobre cada trozo; al cambiar la configuración los trozos se separan escalonados (~40 ms).
- Toca un trozo para abrirlo en la cámara; guarda SplitConfig y currentTileId en el proyecto.
- Toda la lógica viene de computeTiles; la pantalla solo dibuja. Textos desde packages/i18n.
- Usa la skill expo-animation para el movimiento.
Propón el plan y espera mi OK.
```

---

## Prompt 7 · Crítica y pulido (al terminar cada pantalla)

```text
Usa la skill impeccable sobre la pantalla <nombre>. Haz una crítica completa (jerarquía, espaciado,
tipografía, movimiento, estados vacíos y de error, accesibilidad) contra docs/DESIGN.md.
Dame la lista de problemas ordenada por impacto y espera a que elija cuáles arreglar.
Después pásale web-design-guidelines para accesibilidad.
```

---

## Reglas del flujo

1. Una tarea del roadmap por sesión; limpia el contexto entre tareas.
2. Siempre en modo plan: lees el plan, corriges y apruebas.
3. En `packages/core`, tests primero; Claude no da la tarea por hecha si no pasan.
4. Cita los documentos en el prompt (`@docs/PRD.md`) en vez de explicar de nuevo.
5. Una rama por tarea con commits pequeños; squash merge para dejar un commit por tarea en `main`, después de revisar el diff. Detalle en `docs/FLUJO.md`.
6. Pruebas en tu móvil real al final de cada tarea de cámara: el simulador no tiene cámara de verdad.
7. Si corriges a Claude dos veces por lo mismo, esa regla va al CLAUDE.md.
