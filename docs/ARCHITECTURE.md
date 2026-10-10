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
| Extras nativos | expo-haptics, expo-keep-awake, expo-image-picker, expo-sqlite, expo-file-system, expo-localization | Vibración del imán, pantalla encendida, importar, guardar, archivos de proyectos, idioma del sistema |
| PC | Vite + React como PWA; Tauri si se quiere instalable | La app no necesita servidor ni SEO, así que Vite basta |
| Animación web | Motion | Muelles equivalentes a los del móvil |
| Validación | Zod | Modelos y datos importados seguros |
| Tests | Vitest (core, ui, i18n), Playwright (PC), Maestro (móvil) | La lógica pura se testea desde el día 1 |
| Calidad | Biome + GitHub Actions | Lint, formato, tipos y tests en cada PR y en main |
| Backend (fase 3) | Supabase | Cuenta, almacenamiento y sincronización |

La landing (dominio por decidir) va aparte, con Astro o Next.js, porque ahí sí importa el SEO.

## Monorepo (pnpm)

`pnpm-workspace.yaml` fija `nodeLinker: hoisted` (no el aislado por defecto de pnpm): con el
aislado, `apps/mobile` depende a la vez de `react-native-vision-camera` y de
`react-native-nitro-image`, y `vision-camera` tiene `nitro-image` como peer dependency no opcional;
esa dependencia cruzada hacía que pnpm creara dos copias físicas de cada paquete (mismo contenido,
distinto hash de peers) y Metro las empaquetaba las dos, registrando dos veces las vistas nativas
(`PreviewView`, `SkiaPictureView`...). Es el fix que recomienda la propia guía de Expo para
monorepos con pnpm (docs.expo.dev/guides/monorepos). Ver issue #25.

## Development build (apps/mobile)

- `app.config.ts` sustituye a `app.json`: variantes por `APP_VARIANT` (lo fija `eas.json`). `development` →
  `com.mkcodev.ardarwin.dev`, nombre «AR-Darwin Dev», icono adaptativo bermellón. Cualquier otro valor
  (producción) → `com.mkcodev.ardarwin`, «AR-Darwin», icono normal.
- `eas.json`: perfil `development` (`developmentClient`, `distribution: internal`, APK) y perfil
  `preview` (release, `distribution: internal`, APK; issue #20): `APP_VARIANT=preview` da el
  paquete, nombre e icono de producción, y `EXPO_PUBLIC_SPIKES=1` deja accesible el spike de cámara
  (`apps/mobile/src/spikes.ts`: `__DEV__ ||` esa variable, que Metro inlinea al empaquetar). Sirve
  para medir rendimiento en código release. `production` se añade en la fase 4.
- Permisos de cámara y galería (`NSCameraUsageDescription`, `expo-image-picker`) desde
  `packages/i18n` (`permissions.camera`/`permissions.photos`, es/en), nunca a mano en el config.
- `packages/i18n` expone `es`/`en` como valores (no solo tipos) para que `app.config.ts` los lea en
  tiempo de build; sus imports relativos usan extensión `.ts` explícita (`allowImportingTsExtensions`
  en `tsconfig.base.json`) porque el loader de `expo config` corre en Node ESM puro, que exige
  extensión en paquetes `"type": "module"`. `packages/ui` no se importa desde `app.config.ts`: su
  barrel reexporta todo el paquete y arrastra el mismo problema; los colores de iconos nativos van
  literales en el config, igual que ya hacía `app.json`.
- Icono (provisional, issue #22): `android-icon-foreground(-dev).png`, `android-icon-monochrome.png`
  e `icon(-dev).png` se generan desde el `logoMark` de `packages/ui/src/icons.ts` (el árbol de Darwin)
  con `resvg-cli`, no son arte final. Sin `backgroundImage` en `adaptiveIcon`: pisaba `backgroundColor`
  y por eso el primer build no mostraba el bermellón de desarrollo.

## Spike de cámara (apps/mobile, issue #17)

- `<Camera device="back" isActive={isFocused} constraints={[{ fps: 30 }]} />` (vision-camera 5):
  sin `constraints`, la preview negocia solo por `ResolutionBiasConstraint` y prefiere cualquier
  formato «al menos tan grande como la pantalla», ignorando aspecto — ya suele quedar lejos de la
  resolución máxima del sensor. Fijar `fps: 30` acota además el formato a uno que la soporte.
  Se mide en la puerta de la fase 2 (issue #20): protocolo y resultados en docs/spikes/camera.md.
- **Contador de fps (issue #20):** `FpsMeter`, activable con la píldora «fps». UI: `useFrameCallback`
  de Reanimated pasa cada intervalo de vsync a `addFrame` (`packages/core/src/frameStats.ts`,
  worklets) en el hilo de UI. JS: bucle de `requestAnimationFrame` con el mismo acumulador. Una vez
  por segundo un `setInterval` resume y reinicia las dos ventanas con un solo `setState` (nunca por
  frame). Tirón = intervalo > 1,5 × el presupuesto de la pantalla, que `frameBudgetMs` deduce del
  intervalo más corto visto, redondeado a 60/90/120/144 Hz (React Native no expone la frecuencia).
  Solo se monta visible: `useFrameCallback` pide un frame en cada vsync y añade carga.
- El `<Canvas>` de Skia va encima de `<Camera>` sin ser `opaque`, así que en Android usa
  `TextureView` (el valor por defecto): compone como una vista normal de React Native, respetando
  el orden de apilado con la cámara, a costa de una copia de textura extra. Alternativa a probar en
  el #20 si hay tirones: `android={{ surfaceType: "SurfaceView", zOrderOnTop: true }}`, más rápido
  pero sin recortes ni transformaciones del padre.
- Imágenes de prueba en `apps/mobile/assets/images/test/` (no se usan en producción): una
  cuadrícula generada sin dependencias (`apps/mobile/scripts/generate-calibration.mjs`) a 4096 px,
  el máximo que la app aceptará al importar una foto, y el boceto «I think» de Darwin (dominio
  público). Ver `SOURCES.md` en esa carpeta.
- **Bloqueo de toques y errores de cámara (issue #19):** `locked` es un `SharedValue<boolean>`
  compartido entre `LockButton` (lo escribe tras 1 s de pulsación larga) y `useOverlayGestures`
  (cada `onChange`/`reset` sale si `locked.value`, en el hilo de UI: un arrastre que ya estaba en
  curso al bloquear se para en seco). El slider de opacidad sigue activo con el candado. Salir hacia atrás
  se bloquea con `usePreventRemove` (expo-router/react-navigation), no con `BackHandler`: un
  listener de `BackHandler` no paraba el gesto atrás de Android. `onError` de `<Camera>` solo salta con los errores CRITICAL de
  CameraX (desactivada por política, retirada, fatal); una cámara ya abierta por otra app es
  RECOVERABLE y CameraX la reporta como `onInterruptionStarted`/`onInterruptionEnded`, no como
  error — por eso `CameraSpikeScreen` escucha las dos cosas. `classifyCameraIssue` (packages/core)
  traduce el `message` en texto plano de `onError` a `"disabled" | "inUse" | "unknown"`.

## Componentes base del móvil (issue #30)

- `apps/mobile/src/components/`: Button, IconButton, FloatingPill, BottomSheet, Slider, Toggle,
  SegmentedControl, Stepper, Icon/SkiaIcon y LockButton, con los mismos nombres, variantes y
  estados que `apps/desktop/src/components/`. Diferencias: el `Slider` recibe un `SharedValue`
  (el valor vive en el hilo de UI y `format` es un worklet, p. ej. `percentFormat` de
  `src/format.ts`); el `SegmentedControl` usa segmentos de igual ancho para que el indicador solo
  se desplace; `Button` recibe `icon` como `IconName`.
- `apps/mobile/src/theme/`: `ThemeProvider`, `HandednessProvider` y `ReduceMotionProvider` se montan
  en `app/_layout.tsx`. Aceptan `initial` y `onChange` para que la tarea de Ajustes cargue y guarde
  la preferencia sin tocarlos. `ReduceMotionProvider` sigue el ajuste del sistema en vivo
  (`AccessibilityInfo`) y admite una anulación (la usa `/dev/design`).
- Fuentes: `useAppFonts` en el layout raíz; el splash nativo (`SplashScreen` de expo-router) sigue
  visible hasta que cargan o fallan, así nunca se pinta un frame con las fuentes del sistema.
- Movimiento: `theme/motion.ts` resuelve los tokens de `packages/ui` en planes (`full`/`fade`/`none`,
  el mismo contrato que `transitions.ts` en web) y los worklets `animateMove`/`animateFade` los
  ejecutan. Son el único helper del hilo de UI fuera de `packages/core`, porque envuelven Reanimated;
  pasan `ReduceMotion.Never` porque el plan ya aplicó la preferencia (con el valor por defecto,
  `System`, Reanimated saltaría el muelle aunque `/dev/design` pida movimiento completo).
- La matemática que corre en el hilo de UI (pista del slider, límites del stepper, soltar la hoja,
  opacidad del velo, tamaño de la tinta, retirada de la píldora, trazos escalonados) está en
  `packages/core/src/controls.ts`, con tests y en `worklet.test.ts`.
- Iconos: `SkiaIcon` es un elemento Skia (va dentro de un `<Canvas>`), un `Path` por trazo para
  recortar cada uno con `end` en el «trazo vivo»; `Icon` lo envuelve en su propio `<Canvas>`.

## Navegación (Expo Router, issue #34)

- Un solo navegador: el native-stack raíz (`src/navigation/AppStack.tsx`, montado por
  `app/_layout.tsx` dentro de los providers de tema, mano y movimiento). Sin pestañas: la cámara va a
  pantalla completa y Ajustes se abre desde un icono de la Biblioteca. Si los Retos (fase 2) piden
  pestañas, se decide entonces.
- `AppStack` también monta `SQLiteProvider` sobre una vista con `bg.canvas`, la barra de estado del
  tema y el `ThemeProvider` de React Navigation con los colores de `packages/ui`: ningún fotograma en
  blanco entre la splash, las migraciones y la primera pantalla.
- Rutas hoy: `/` Biblioteca, `/settings` Ajustes, `/dev/design` y `/dev/camera` (solo desarrollo o
  `spikesEnabled`). Cada tarea añade la suya (ficha del proyecto, cámara, divisor, onboarding).
  Typed routes activas (`experiments.typedRoutes`): `router.push` y `href` comprueban la ruta.
- Cabeceras:
  - Principales (Biblioteca; Retos más adelante): `headerShown: false`, `LargeTitle` (titular en
    Instrument Serif dentro del scroll) y `LargeTitleHeader` (barra fija con título compacto y
    acciones). El scroll lleva `paddingTop` y `scrollIndicatorInsets.top` = alto de la barra
    (`useLargeTitleBarHeight`: inset superior + 56 px). La matemática (`largeTitleCollapse`,
    `largeTitleOverscrollScale`) está en `packages/core/src/controls.ts`; las escalas, en
    `signature` de `packages/ui`.
  - Secundarias (Ajustes; luego ficha, divisor…): header nativo con las opciones de
    `useStackScreenOptions` (fondo `bg.canvas`, título con el rol `title`, sin sombra, atrás solo
    con flecha). Con «reducir movimiento», las transiciones pasan a fundido.
  - Cámara y rutas dev: sin header.

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

type ProjectStatus = "pending" | "in_progress" | "done";

type Project = {
  id: string;              // UUID v4 (createProjectId), válido tal cual para Supabase
  name: string;
  sourceUri: string;       // ruta guardada: relativa a documentos o asset (ver «Rutas de archivo»)
  transform: Transform;    // último ajuste de cámara
  opacity: number;         // 0..1
  split?: SplitConfig;
  currentTileId?: string;
  status: ProjectStatus;
  resultPhotoUri?: string; // foto del dibujo terminado, ruta guardada
  resultTransform?: Transform;
  completedAt?: string;    // ISO
  notes?: string;
  difficulty?: number;     // entero 1..5
  timeSpentMs: number;     // entero ≥ 0
  categoryIds: string[];   // N:M con Category, en el orden de las categorías
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
};

type Category = {
  id: string;              // las de serie: "animals", "people", "landscapes", "manga", "objects", "lettering"
  key?: string;            // clave i18n ("categories.animals"): solo las de serie
  name?: string;           // nombre escrito por la persona: solo las suyas (exactamente uno de key/name)
  isDefault: boolean;
  color?: string;          // clave de token de packages/ui, nunca hex (paleta pendiente, ver roadmap)
  icon?: string;           // nombre de icono de packages/ui (iconos pendientes)
  order: number;           // posición, entero ≥ 0
};
```

`ProjectSchema` y `CategorySchema` (Zod) validan todo lo que sale de la base de datos.
`createProject({ id, name, sourceUri, opacity, now })` crea un proyecto `pending` en
`IDENTITY_TRANSFORM` (la cámara encaja la imagen al abrirlo); la opacidad inicial la pasa la app
desde `opacity.overlayImage` de packages/ui, para no duplicar el token en core.

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

Todas las funciones de `transform.ts` (`snapTransform`, `nudge`, `fitTransform`, `applyGesture`, `rotationDeadZone`, `radiansToDegrees`, `normalizeRotation` y los helpers internos) empiezan con la directiva `"worklet"` para poder llamarse desde Reanimated: solo matemáticas sobre objetos planos, sin Zod ni excepciones, y sin constantes externas en valores por defecto de parámetros (el plugin de worklets no las captura). `worklet.test.ts` lo comprueba en CI (también para `frameStats.ts`), porque Vitest ejecuta JS normal y esos fallos solo aparecen en el móvil.

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

### `applyGesture(transform, step): Transform`

- `step`: un fotograma de arrastrar/pellizcar/rotar, relativo al fotograma anterior (no al inicio del gesto): `changeX/Y` en px, `scaleChange` como ratio (1 = sin cambio), `rotationChange` en grados, y `focalX/Y` (foco del pellizco o ancla de la rotación), irrelevante si `scaleChange` es 1 y `rotationChange` es 0.
- Escala y rota alrededor de `focalX/Y`: el punto bajo los dedos no se mueve. Pensada para una llamada por tipo de gesto y fotograma (arrastrar solo con `changeX/Y`, pellizcar solo con `scaleChange`, rotar solo con `rotationChange`), cada una aplicando su propia contribución sobre la misma transformada — ver `useOverlayGestures` en apps/mobile.
- Por qué por fotograma y no acumulado desde el inicio: `translationX/Y`, `scale` y `rotation` de react-native-gesture-handler se acumulan desde que cada gesto por separado empieza a estar activo, y eso no encaja cuando arrastrar sigue mientras entra un segundo dedo (pellizcar y rotar sí se reinician). `onChange` da en cambio `changeX/Y`, `scaleChange` y `rotationChange` ya relativos al fotograma anterior, así que cada gesto puede escribir directamente sobre `x`/`y`/`scale`/`rotation` sin tener que volver a basar nada.
- Nunca baja de `MIN_SCALE` (mismo límite que `nudge`/`fitTransform`); los espejos pasan intactos.
- Imán (fase 3, pendiente): se mostrará `snapTransform` sobre el resultado mientras el gesto está activo, y solo se guardará el resultado sin imantar como base del siguiente fotograma — mismo contrato que `snapTransform` hoy.

### `rotationDeadZone(accumulatedDegrees, zoneDegrees?): number`

- `zoneDegrees` por defecto `ROTATION_DEAD_ZONE_DEGREES` (4). El valor por defecto se resuelve dentro del cuerpo, no en la firma: el plugin de worklets no captura constantes externas usadas en valores por defecto de parámetros, y en el hilo de UI serían `undefined`.

- Convierte la rotación bruta acumulada del gesto (dos dedos, desde que empieza) en la que realmente se aplica: 0 dentro de la zona, continua en el borde (sin salto al cruzarla). Evita que un pellizco que no sale perfectamente recto tuerza la imagen.
- Quien llama acumula el `rotationChange` bruto de cada fotograma por su cuenta y resta dos llamadas consecutivas (`rotationDeadZone(acumulado)`) para obtener el incremento ya amortiguado que le pasa a `applyGesture`.

## Textos (packages/i18n)

Sin librerías: unas 60 líneas de TypeScript que funcionan igual en Expo (Hermes) y en Vite.

- `es.ts` es la fuente de verdad (`as const`). `en.ts` lleva `satisfies Messages`: si falta o sobra una clave, falla `pnpm typecheck`. Un test de tipos comprueba que cada clave tiene los mismos `{param}` en los dos idiomas.
- `createTranslator(locale)` devuelve `t(key, params?)`. Las claves son rutas con punto (`"app.name"`) y los parámetros se infieren del texto: con `"Trozo {id}"`, `t("camera.tile", { id })` es obligatorio; sin `{…}`, no admite parámetros.
- `resolveLocale(tags)` elige el primer idioma soportado de la lista (`"es-MX"` → `es`) y, si no hay ninguno, `en`. Cada app le pasa los idiomas del sistema: `getLocales()` de expo-localization en móvil y `navigator.languages` en PC.
- Pendiente: plurales con `Intl.PluralRules` (ej. claves con forma `{ one, other }`) cuando llegue Retos; la API de `t` debe admitirlo sin romper llamadas.

## Almacenamiento

- MVP: SQLite (expo-sqlite) en móvil e IndexedDB en PC. Las imágenes se copian al almacenamiento de la app.
- Fase 3: Supabase para cuenta, almacenamiento de imágenes y sincronización.

### SQLite en el móvil (issue #32)

Reparto: el SQL, las migraciones y la conversión fila ↔ `Project` son código puro de
`packages/core/src/storage/` (`migrations.ts`, `queries.ts`, `rows.ts`), probado en Vitest contra el
SQLite de Node (`node:sqlite`, Node ≥ 26) con el mismo SQL que corre en el móvil. `apps/mobile/src/storage/`
solo lo ejecuta con expo-sqlite: `database.ts` (migraciones), `projectRepository.ts`
(`listProjects`, `getProject`, `saveProject`, `deleteProject`, `listCategories`) y `files.ts`
(expo-file-system). Las queries usan solo parámetros posicionales `?`, que los dos drivers aceptan igual.

Tablas (base `ar-darwin.db`):

- `projects`: una columna por campo en snake_case; `transform`, `split` y `result_transform` van
  como JSON en TEXT. CHECK en `opacity` (0..1), `status`, `difficulty` (1..5) y `time_spent_ms`.
  Índice por `updated_at DESC` (la biblioteca lista los más recientes primero).
- `categories`: `sort_order` en lugar de `order` (palabra reservada); CHECK de exactamente uno de
  `key`/`name`.
- `project_categories`: N:M con PK compuesta y `ON DELETE CASCADE` a los dos lados.
  `PRAGMA foreign_keys = ON` se activa en cada apertura (es por conexión).

Migraciones: `MIGRATIONS` es una lista numerada desde 1; la versión de la base vive en
`PRAGMA user_version` (0 al crearla). `SQLiteProvider` (en `navigation/AppStack.tsx`) llama a
`migrateDbIfNeeded` en `onInit`, antes de pintar ninguna pantalla: activa WAL y claves foráneas, y
ejecuta cada migración pendiente (`pendingMigrations(version)`) junto con su `PRAGMA user_version = N`
en una sola transacción, así que un cierre a medias deja la base en la versión anterior. Si la base es
más nueva que la app, `pendingMigrations` lanza. Para cambiar el esquema: añadir una migración nueva
al final, nunca editar una publicada, y ampliar `storage.test.ts`. La v1 crea las tres tablas y
siembra las 6 categorías de serie con su clave i18n (`categories.<id>`); `categoryLabel`
(apps/mobile) traduce con `t(defaultCategoryKey(id))`, que no compila si falta alguna clave en
packages/i18n.

### Rutas de archivo

`sourceUri` y `resultPhotoUri` nunca guardan una URI `file://` absoluta: en iOS la ruta del
contenedor de la app cambia con cada actualización y una ruta absoluta guardada por la versión
anterior ya no apunta a nada. Se guarda (`packages/core/src/filePath.ts`):

- una ruta relativa al directorio de documentos (`projects/<id>/source.jpg`): archivos de la app;
- o un asset empaquetado con prefijo `asset:`, tal cual (la app lo resuelve por su cuenta).

`toStoredUri(uri, documentDir)` convierte al guardar (lanza si el archivo no está dentro del
directorio de documentos: antes hay que copiarlo allí) y `resolveStoredUri(stored, documentDir)`
reconstruye la URI al leer, con `Paths.document.uri` del momento. Se rechazan `..`, rutas absolutas y
esquemas (`ProjectSchema` lo valida).

### Borrado

`deleteProject` borra primero la fila (sus enlaces a categorías caen en cascada) y después los
archivos que son de la app (`isAppOwnedFile`: rutas relativas, nunca assets): la imagen original y la
foto del resultado. Si falla el borrado de un archivo, el proyecto queda borrado igual y se registra
con `console.warn`: un archivo huérfano solo ocupa sitio; un proyecto que apunta a un archivo que no
existe rompe la biblioteca.

### Ids

`createProjectId()` genera un UUID v4 estándar (bits de versión y variante correctos) con
`Math.random`: Hermes no tiene `crypto.randomUUID`, y los ids solo tienen que ser únicos en el
dispositivo hasta que llegue la sincronización, que podrá usarlos tal cual como clave en Supabase.

### Tipos de Node solo en tests

`packages/core/tsconfig.json` excluye `*.test.ts` y fija `types: []`: si el código de core usa una
API de Node por error, `pnpm typecheck` falla. `tsconfig.test.json` comprueba los tests con
`types: ["node"]` (para `node:sqlite`); el script `typecheck` de core ejecuta las dos.
