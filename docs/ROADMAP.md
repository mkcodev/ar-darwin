# Roadmap · AR-Darwin

La regla: publicar el MVP móvil antes de abrir la fase 2. Cada **puerta** es una prueba que hay que pasar antes de seguir; si no se pasa, se arregla antes de añadir nada nuevo.

```
0 Descubrimiento y diseño
1 Base del repo
2 Spike de cámara
   ◆ Puerta: fluido en móvil real y la imagen no se mueve al bloquear
3 MVP móvil
   ◆ Puerta: terminas un dibujo real de 4 trozos solo con la app
4 Beta y lanzamiento
   ◆ Puerta: publicada en las tiendas
5 Fase 2: PC, foto a boceto, time-lapse, Retos, QR
6 Fase 3: marcadores, cuenta y sync, modo por pasos
```

## 0 · Descubrimiento y diseño

- [ ] Probar las 5 apps de AR drawing más descargadas y anotar qué falla
- [ ] Leer reseñas de 1–3 estrellas y agrupar las quejas
- [x] Moodboard y dirección visual con `frontend-design` y `ui-ux-pro-max` (issue #4: «Grafito y luz»)
- [ ] Maquetar en Figma: inicio/biblioteca, cámara con menú, divisor, Retos, onboarding
- [ ] Comprobar disponibilidad del nombre (tiendas, dominio, redes)

## 1 · Base del repo

- [x] `docs/` con PRD, arquitectura, diseño, roadmap y prompts
- [x] CLAUDE.md en la raíz
- [x] Monorepo con pnpm + Turborepo, Biome y TypeScript estricto (Prompt 1)
- [x] `packages/ui` con los tokens (temas claro y oscuro, movimiento, hápticos, iconos; playground en `/playground`)
- [x] `packages/i18n` con es/en y claves tipadas
- [x] `packages/core`: `computeTiles` y tests (Prompt 2)
- [x] `packages/core`: `snapTransform`, `nudge`, `fitTransform` y tests (Prompt 3)
- [x] GitHub Actions: tipos, lint y tests en cada PR y en main

## 2 · Spike de cámara

- [ ] Development build de Android en el móvil (EAS) con las nativas del spike y del MVP
- [ ] Cámara trasera a pantalla completa (vision-camera) con imagen de prueba en Canvas de Skia
- [ ] Gestos simultáneos (arrastrar, pellizcar, rotar) y slider de opacidad en el hilo de UI
- [ ] Bloqueo de toques (pulsación larga de 1 s en el candado) y pantalla siempre encendida
- [ ] Prueba real de 10 min dibujando: medir fps (también en un Android modesto) y anotar resultados

**Puerta:** fluido en móvil real (también en un Android modesto) y la imagen no se mueve al bloquear.

## 3 · MVP móvil

- [ ] Componentes base nativos desde `packages/ui` (botón, píldora, hoja, slider, toggle) e iconos en Skia
- [ ] Modelo `Project` y guardado local con expo-sqlite
- [ ] Navegación y estructura de pantallas (Expo Router)
- [ ] Biblioteca: importar desde galería, cámara o archivos; reducir a 4096 px; lista de proyectos
- [ ] Cámara del proyecto: abrir, restaurar y guardar el último ajuste
- [ ] Espejo H/V, linterna y ajustes de imagen (contraste, brillo, invertir) con Skia
- [ ] Modo imán con guías y vibración (`snapTransform`)
- [ ] Ajuste fino: dos velocidades, pulsación larga, reset y candado (`nudge`)
- [ ] Menú flotante en píldora que se oculta solo
- [ ] Pantalla del divisor con vista previa en vivo (Prompt 6)
- [ ] Minimapa y botón Siguiente trozo en la cámara
- [ ] Ajustes: tema Sistema/Claro/Oscuro, mano que dibuja, reducir movimiento, idioma
- [ ] Onboarding de 3 pantallas y permiso de cámara explicado (es/en)
- [ ] Pasada de `impeccable` y `web-design-guidelines` sobre cada pantalla (Prompt 7)
- [ ] Flujo principal con Maestro (importar, dividir, calcar un trozo)

**Puerta:** terminas un dibujo real de 4 trozos solo con la app.

## 4 · Beta y lanzamiento

- [ ] Nombre, icono y splash definitivos en la config
- [ ] Perfiles `preview`/`production` en eas.json, firma y versión
- [ ] Política de privacidad (la exigen las tiendas por el permiso de cámara)
- [ ] Prueba interna de Google Play (y TestFlight si se decide iOS)
- [ ] Landing con vídeo de demo (issue #12)
- [ ] Capturas y fichas de las tiendas
- [ ] Publicar y anunciarlo en LinkedIn y GitHub como pieza de portfolio

**Puerta:** publicada en las tiendas.

## 5 · Fase 2

Versión PC, foto a boceto, time-lapse, Retos, envío por QR, divisor por tamaño de papel y exportación.

- [ ] PC: estructura de la app (rutas, tema, i18n) y biblioteca en IndexedDB
- [ ] PC: preparar imagen (recortar, rotar, ajustes)
- [ ] Spike: cómo viaja la imagen PC → móvil sin servidor (decisión documentada)
- [ ] PC → móvil: envío por código QR
- [ ] PC: modo mesa de luz
- [ ] Core: divisor por tamaño de papel (cm, A4, A3) y grosor en mm, con tests
- [ ] Divisor por tamaño de papel en la UI
- [ ] Exportar trozos a imágenes y PDF
- [ ] Foto a boceto con niveles de detalle (shader Skia)
- [ ] Cuadrícula para aprender a dibujar sin calcar
- [ ] Time-lapse: capturar fotogramas mientras se dibuja
- [ ] Time-lapse: montar el vídeo (móvil o PC, ver riesgo)
- [ ] Retos: reto diario y semanal, racha con contador animado (plurales en i18n)
- [ ] Retos: historial con foto y time-lapse
- [ ] Compartir resultado y time-lapse en redes

## 6 · Fase 3

Marcadores en el papel, cuenta y sincronización, modo por pasos, webcam cenital.

- [ ] Spike: detección de marcadores en las esquinas del papel
- [ ] Anclaje del overlay a los marcadores e imán a los bordes del folio
- [ ] Cuenta e inicio de sesión con Supabase
- [ ] Sincronización de proyectos e imágenes móvil ↔ PC
- [ ] Modo por pasos: contornos, detalles, sombras
- [ ] PC: modo webcam cenital

## Riesgos

| Riesgo | Qué puede pasar | Plan B |
| --- | --- | --- |
| Alcance | AR-Darwin se queda a medias junto a otros proyectos abiertos | Respetar las puertas; nada de fase 2 sin MVP publicado |
| Rendimiento | Cámara + overlay a tirones en Android de gama baja | Probar el spike en un Android modesto; bajar la resolución de la vista previa |
| Time-lapse | Codificar vídeo en el móvil exige un módulo nativo | Guardar fotogramas y montar el vídeo en la versión PC |
| Marcadores | Detección poco fiable con mala luz | Mantener overlay + candado como modo principal |
| Nombre | "Darwin" es un nombre muy usado, también en software | Comprobar tiendas, dominio y marcas en la fase 0 |
| Permisos | El usuario rechaza el permiso de cámara | Pantalla que explica por qué y cómo activarlo |
| Tiendas | Cuentas de desarrollador de Apple (cuota anual) y Google (pago único) | Empezar por la plataforma de tu móvil |

## Decisiones pendientes

- [ ] ¿iOS primero, Android primero o las dos a la vez?
- [x] Paleta y tipografía definitivas: «Grafito y luz», Instrument Serif + Geist + Geist Mono (issue #4)
- [ ] Nombre definitivo y dominio
- [ ] Monetización futura: pago único o funciones premium (sin anuncios en ningún caso)
