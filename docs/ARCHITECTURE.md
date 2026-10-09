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
| Extras nativos | expo-haptics, expo-keep-awake, expo-image-picker, expo-sqlite, expo-localization | Vibración del imán, pantalla encendida, importar, guardar, idioma del sistema |
| PC | Vite + React como PWA; Tauri si se quiere instalable | La app no necesita servidor ni SEO, así que Vite basta |
| Animación web | Motion | Muelles equivalentes a los del móvil |
| Validación | Zod | Modelos y datos importados seguros |
| Tests | Vitest (core, ui, i18n), Playwright (PC), Maestro (móvil) | La lógica pura se testea desde el día 1 |
| Calidad | Biome + GitHub Actions | Lint, formato, tipos y tests en cada PR y en main |
| Backend (fase 3) | Supabase | Cuenta, almacenamiento y sincronización |

La landing (dominio por decidir) va aparte, con Astro o Next.js, porque ahí sí importa el SEO.

## Development build (apps/mobile)

- `app.config.ts` sustituye a `app.json`: variantes por `APP_VARIANT` (lo fija `eas.json`). `development` →
  `com.mkcodev.ardarwin.dev`, nombre «AR-Darwin Dev», icono adaptativo bermellón. Cualquier otro valor
  (producción) → `com.mkcodev.ardarwin`, «AR-Darwin», icono normal.
- `eas.json`: perfil `development` (`developmentClient`, `distribution: internal`, APK). Perfiles
  `preview`/`production` se añaden en la fase 4.
- Permisos de cámara y galería (`NSCameraUsageDescription`, `expo-image-picker`) desde
  `packages/i18n` (`permissions.camera`/`permissions.photos`, es/en), nunca a mano en el config.
- `packages/i18n` expone `es`/`en` como valores (no solo tipos) para que `app.config.ts` los lea en
  tiempo de build; sus imports relativos usan extensión `.ts` explícita (`allowImportingTsExtensions`
  en `tsconfig.base.json`) porque el loader de `expo config` corre en Node ESM puro, que exige
  extensión en paquetes `"type": "module"`. `packages/ui` no se importa desde `app.config.ts`: su
  barrel reexporta todo el paquete y arrastra el mismo problema; los colores de iconos nativos van
  literales en el config, igual que ya hacía `app.json`.

## Estructura del repo

```
ar-darwin/
├─ apps/
│  ├─ mobile/          # Expo: cámara, biblioteca, divisor, retos
│  └─ desktop/         # Vite PWA: mesa de luz, preparación, QR; /playground del sistema de diseño
├─ packages/
│  ├─ core/            # lógica pura: split, snap, nudge, modelos
│  ├─ ui/              # tokens: temas claro/oscuro, tipo, espaciado, movimiento, hápticos,
│  │                   #   iconos y contraste; datos planos sin dependencias (web y nativo)
│  └─ i18n/            # es.ts, en.ts y t() tipado, sin dependencias
├─ docs/
├─ .claude/settings.json
├─ CLAUDE.md
└─ turbo.json
```

## Modelo de datos (packages/core)

```typescript
type Rect = { x: number; y: number; width: number; height: number };

type Transform = {
  x: number;          // centro de la imagen, en px del viewport
  y: number;
  scale: number;      // relativo a los px naturales de la imagen; > 0 (MIN_SCALE = 0.05 limita los gestos, no fitTransform)
  rotation: number;   // grados, horario (eje y hacia abajo); las funciones de core lo dejan en (-180, 180]
  flipX: boolean;
  flipY: boolean;
};
// IDENTITY_TRANSFORM = { x: 0, y: 0, scale: 1, rotation: 0, flipX: false, flipY: false }

type SplitConfig = {
  rows: number;            // 1..10
  cols: number;            // 1..10
  overlapPx: number;       // entero ≥ 0; 0 = corte al ras
  showOverlapTint: boolean;
};

type Tile = {
  id: string;              // "A1", "A2", "B1"... (columna 1-based)
  row: number;             // 0-based
  col: number;             // 0-based
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
- `overlapPx = 0` → `rect` igual (por valor) a `coreRect`.
- `overlapPx > 0` → cada trozo se extiende `overlapPx` solo por sus bordes interiores.
- `overlapPx` se limita a `maxOverlapPx` (ver abajo).
- Orden por filas, de izquierda a derecha. `row` y `col` empiezan en 0; el id es la fila en letra y la columna empezando en 1 (`row 0, col 0` → `A1`).
- Valida con Zod: imagen con lados enteros > 0, `rows`/`cols` enteros 1..10, `overlapPx` entero ≥ 0, y `width ≥ cols`, `height ≥ rows`. Si no, lanza un `Error` que empieza por `computeTiles:`.

### `maxOverlapPx(image, rows, cols): number`

- Límite del solape, por eje con cortes: ancho mínimo de los `coreRect` si `cols > 1`, alto mínimo si `rows > 1`; devuelve `floor(menor / 2)`. Con 1×1, 0.
- Misma validación que `computeTiles`. La UI lo usa como máximo del slider del borde extendido.

`snapTransform`, `nudge`, `fitTransform` y `normalizeRotation` (en `transform.ts`) empiezan con la directiva `"worklet"` para poder llamarse desde Reanimated: solo matemáticas sobre objetos planos, sin Zod ni excepciones.

### `snapTransform(transform, imageSize, viewport, options?): { transform, activeGuides }`

- `options` parcial sobre `DEFAULT_SNAP_OPTIONS = { threshold: 8, rotationThreshold: 3, mode: 'move' }`.
- Guías (`activeGuides`): `left`, `centerX`, `right`, `top`, `centerY`, `bottom` del viewport.
- Primero la rotación: se normaliza a (-180, 180] y encaja en el múltiplo de 45° más cercano si está a menos de `rotationThreshold` grados (estricto).
- Después, la caja envolvente de la imagen rotada y escalada:
  - `mode: 'move'`: por eje, el rasgo (borde inicial, centro o borde final) más cercano a una guía, si está a menos de `threshold` px, desplaza `x`/`y` para encajar exacto.
  - `mode: 'scale'`: centro, posición y rotación fijos; solo cambia `scale` para que el borde más cercano (de cualquiera de los dos ejes) caiga exacto en una guía. Ignora encajes que exigirían una escala menor que `MIN_SCALE`.
- `activeGuides`: guías sobre las que queda un rasgo imantable tras encajar, en el orden de arriba. Vacío si no encaja nada (`threshold: 0` lo desactiva). La UI vibra cuando pasa de vacío a no vacío.
- Uso: se aplica a la transformada en bruto del gesto **solo para mostrar**. Nunca se guarda el resultado como base del gesto, o la imagen se queda pegada a la guía. El valor imantado se guarda solo al soltar.

### `nudge(transform, action, step, options?): Transform`

- Acciones: `scaleUp`, `scaleDown`, `moveUp`, `moveDown`, `moveLeft`, `moveRight`, `rotateCw`, `rotateCcw`, `reset`.
- `step`: `'fine' | 'coarse'`, con valores en `NUDGE_STEPS` (mover 1/10 px, escala 1 %/5 %, rotar 1°/5°).
- Escala multiplicativa y simétrica: `scaleUp` multiplica por `1 + p`, `scaleDown` divide. Nunca baja de `MIN_SCALE` (0.05), y `scaleDown` nunca agranda: si la escala ya es menor que `MIN_SCALE`, se queda igual.
- `rotateCw` suma grados; la rotación sale normalizada a (-180, 180].
- `reset`: toma `x`, `y`, `scale` y `rotation` de `options.base` (por defecto `IDENTITY_TRANSFORM`) y conserva `flipX`/`flipY` actuales.

### `fitTransform(imageSize, viewport): Transform`

- Centra la imagen en el viewport y la escala para que quepa entera (`min(W / w, H / h)`), sin rotación ni espejo. Siempre encaja, aunque la escala quede por debajo de `MIN_SCALE`. La UI la usa como `base` del `reset`.

## Textos (packages/i18n)

Sin librerías: unas 60 líneas de TypeScript que funcionan igual en Expo (Hermes) y en Vite.

- `es.ts` es la fuente de verdad (`as const`). `en.ts` lleva `satisfies Messages`: si falta o sobra una clave, falla `pnpm typecheck`. Un test de tipos comprueba que cada clave tiene los mismos `{param}` en los dos idiomas.
- `createTranslator(locale)` devuelve `t(key, params?)`. Las claves son rutas con punto (`"app.name"`) y los parámetros se infieren del texto: con `"Trozo {id}"`, `t("camera.tile", { id })` es obligatorio; sin `{…}`, no admite parámetros.
- `resolveLocale(tags)` elige el primer idioma soportado de la lista (`"es-MX"` → `es`) y, si no hay ninguno, `en`. Cada app le pasa los idiomas del sistema: `getLocales()` de expo-localization en móvil y `navigator.languages` en PC.
- Pendiente: plurales con `Intl.PluralRules` (ej. claves con forma `{ one, other }`) cuando llegue Retos; la API de `t` debe admitirlo sin romper llamadas.

## Almacenamiento

- MVP: SQLite (expo-sqlite) en móvil e IndexedDB en PC. Las imágenes se copian al almacenamiento de la app.
- Fase 3: Supabase para cuenta, almacenamiento de imágenes y sincronización.
