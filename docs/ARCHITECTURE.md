# Arquitectura · AR-Darwin

Monorepo en TypeScript con dos apps y la lógica en paquetes compartidos: el divisor y el imán se escriben una vez y funcionan igual en móvil y en PC. Todo es local en el MVP; no hay servidor hasta la fase 3.

```
apps/mobile (Expo)          apps/desktop (Vite PWA)
        \                        /
         ▼                      ▼
   packages/core · packages/ui · packages/i18n
         |                      :
         ▼                      ▼ (fase 3)
   Datos locales           Supabase
   (SQLite / IndexedDB)    (cuenta y sync)
```

## Stack

| Capa | Elección | Para qué |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo | Compartir código y cachear builds |
| Lenguaje | TypeScript en modo estricto | Un solo lenguaje en todo el repo |
| Móvil | Expo con development build y Expo Router | App nativa con React; no sirve Expo Go por la cámara |
| Cámara | react-native-vision-camera | Vista de cámara rápida y capturas para el time-lapse |
| Dibujo del overlay | @shopify/react-native-skia | Imagen, guías y filtros a 60 fps; shaders para el boceto |
| Gestos y animación | Reanimated + Gesture Handler | Pellizcar, arrastrar, rotar y muelles en el hilo de UI |
| Extras nativos | expo-haptics, expo-keep-awake, expo-image-picker, expo-sqlite | Vibración del imán, pantalla encendida, importar, guardar |
| PC | Vite + React como PWA; Tauri si se quiere instalable | La app no necesita servidor ni SEO, así que Vite basta |
| Animación web | Motion | Muelles equivalentes a los del móvil |
| Validación | Zod | Modelos y datos importados seguros |
| Tests | Vitest (core), Playwright (PC), Maestro (móvil) | La lógica pura se testea desde el día 1 |
| Calidad | Biome + GitHub Actions | Lint, formato, tipos y tests en cada push |
| Backend (fase 3) | Supabase | Cuenta, almacenamiento y sincronización |

La landing (dominio por decidir) va aparte, con Astro o Next.js, porque ahí sí importa el SEO.

## Estructura del repo

```
ar-darwin/
├─ apps/
│  ├─ mobile/          # Expo: cámara, biblioteca, divisor, retos
│  └─ desktop/         # Vite PWA: mesa de luz, preparación, QR
├─ packages/
│  ├─ core/            # lógica pura: split, snap, nudge, modelos
│  ├─ ui/              # tokens: color, tipo, espaciado, movimiento
│  └─ i18n/            # es.json, en.json
├─ docs/
├─ .claude/settings.json
├─ CLAUDE.md
└─ turbo.json
```

## Modelo de datos (packages/core)

```typescript
type Rect = { x: number; y: number; width: number; height: number };

type Transform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;   // grados
  flipX: boolean;
  flipY: boolean;
};

type SplitConfig = {
  rows: number;            // 1..10
  cols: number;            // 1..10
  overlapPx: number;       // 0 = corte al ras
  showOverlapTint: boolean;
};

type Tile = {
  id: string;              // "A1", "A2", "B1"...
  row: number;
  col: number;
  rect: Rect;              // recorte final, con bordes extendidos solo hacia dentro
  coreRect: Rect;          // recorte al ras, sin solapamiento
};

type Project = {
  id: string;
  name: string;
  sourceUri: string;
  transform: Transform;
  opacity: number;         // 0..1
  split?: SplitConfig;
  currentTileId?: string;
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
};
```

## Funciones de core

Todas puras, sin dependencias de React ni de la plataforma, y con tests.

### `computeTiles(image, config): Tile[]`

- Divide la imagen en `rows × cols`. Los `coreRect` cubren la imagen entera sin huecos ni solapes; los límites se redondean con `Math.round(i * width / cols)`.
- `overlapPx = 0` → `rect === coreRect`.
- `overlapPx > 0` → cada trozo se extiende `overlapPx` solo por sus bordes interiores.
- `overlapPx` se limita a la mitad del lado más corto de un trozo.
- Orden por filas, de izquierda a derecha. ids: fila en letra, columna en número.

### `snapTransform(transform, imageSize, viewport, options): { transform, activeGuides }`

- Guías: centro horizontal y vertical del viewport y sus 4 bordes.
- Encaja si el centro o un borde de la imagen transformada queda a menos de `options.threshold` px.
- Rotación: encaja en múltiplos de 45° si está a menos de `options.rotationThreshold` grados.
- Debe poder ejecutarse dentro de un worklet de Reanimated (sin closures sobre objetos no serializables).

### `nudge(transform, action, step): Transform`

- Acciones: `scaleUp`, `scaleDown`, `moveUp`, `moveDown`, `moveLeft`, `moveRight`, `rotateCw`, `rotateCcw`, `reset`.
- `step`: `'fine' | 'coarse'`, con valores en `NUDGE_STEPS` (mover 1/10 px, escala 1 %/5 %, rotar 1°/5°).
- La escala nunca baja de 0.05.

## Almacenamiento

- MVP: SQLite (expo-sqlite) en móvil e IndexedDB en PC. Las imágenes se copian al almacenamiento de la app.
- Fase 3: Supabase para cuenta, almacenamiento de imágenes y sincronización.
