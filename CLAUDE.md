# AR-Darwin

App para calcar dibujos con la cámara (móvil) y preparar/proyectar imágenes (PC).
Sin anuncios. Prioridad: precisión, fluidez y un diseño propio.
Contexto en docs/PRD.md, docs/ARCHITECTURE.md, docs/DESIGN.md y docs/ROADMAP.md: léelos cuando la tarea lo necesite.
Prompts por fase: docs/PROMPTS.md. Flujo de git (issue, rama, PR, squash): docs/FLUJO.md.

## Estructura
- apps/mobile   Expo (development build, Expo Router), vision-camera, Skia, Reanimated
- apps/desktop  Vite + React PWA, Motion
- packages/core lógica pura en TypeScript (split, snap, nudge, modelos con Zod)
- packages/ui   design tokens (color, tipografía, espaciado, movimiento)
- packages/i18n textos es/en

## Comandos
- pnpm install
- pnpm dev:mobile  /  pnpm dev:desktop
- pnpm test        (Vitest)
- pnpm typecheck
- pnpm lint        (Biome)

## Reglas de código
- TypeScript estricto. Prohibido `any`; usa `unknown` y estrecha.
- Código, nombres y commits en inglés. Textos visibles SIEMPRE desde packages/i18n, nunca a mano.
- La lógica que no dependa de la plataforma va en packages/core, como funciones puras con tests.
- Componentes pequeños; un componente por archivo.
- Gestos y animaciones con Reanimated en el hilo de UI (worklets). Nada de setState en cada frame.
- Dibujo de la cámara (imagen, guías, tintes) con Skia, no con Views apiladas.
- No añadas dependencias sin proponerlas antes y explicar por qué.
- Antes de usar una API de Expo, vision-camera, Skia o Reanimated, consulta la documentación
  actual (Expo MCP / context7): las versiones cambian rápido.
- En tareas de Expo, carga primero la skill expo-overview del plugin de Expo.

## Diseño
- Colores, tipografías, radios y tiempos SOLO desde packages/ui. Nada de valores sueltos.
- Modo oscuro por defecto. Acento bermellón = activo/acción. Azul no-foto = guías, cuadrícula y zonas extendidas.
- Movimiento leve con muelles: 120–180 ms micro, 220–320 ms transiciones.
- Respetar "reducir movimiento" del sistema.
- Objetivos táctiles de 48 px mínimo. Accesible: contraste AA y etiquetas en botones de icono.
- Prohibido: glassmorphism, degradados de plantilla, aspecto genérico de dashboard.

## Cómo trabajar
- Una tarea del roadmap por sesión. Empieza en modo plan y espera mi OK.
- Lee los archivos implicados antes de cambiar nada.
- Al terminar: pnpm typecheck && pnpm test && pnpm lint deben pasar.
- Commits pequeños con Conventional Commits y scope por paquete (feat(core):, fix(mobile):...), según docs/FLUJO.md.
- Si algo de docs/ queda desactualizado por tu cambio, actualízalo en el mismo commit.
- Marca en docs/ROADMAP.md las tareas que completes.
- Si dudas entre dos enfoques, pregunta. No inventes requisitos.
