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
- [ ] Moodboard y dirección visual con `frontend-design` y `ui-ux-pro-max`
- [ ] Maquetar en Figma: inicio/biblioteca, cámara con menú, divisor, Retos, onboarding
- [ ] Comprobar disponibilidad del nombre (tiendas, dominio, redes)

## 1 · Base del repo

- [x] `docs/` con PRD, arquitectura, diseño, roadmap y prompts
- [x] CLAUDE.md en la raíz
- [x] Monorepo con pnpm + Turborepo, Biome y TypeScript estricto (Prompt 1)
- [ ] `packages/ui` con los tokens y `packages/i18n` con es/en
- [ ] `packages/core`: `computeTiles` y tests (Prompt 2)
- [ ] `packages/core`: `snapTransform`, `nudge` y tests (Prompt 3)
- [x] GitHub Actions: tipos, lint y tests en cada PR y en main

## 2 · Spike de cámara

- [ ] Expo con development build en el móvil
- [ ] Vista de cámara a pantalla completa con imagen superpuesta en Skia
- [ ] Opacidad, pellizcar, arrastrar y rotar con Reanimated
- [ ] Bloqueo de toques y pantalla siempre encendida
- [ ] Probarlo dibujando de verdad durante 10 minutos

**Puerta:** fluido en móvil real (también en un Android modesto) y la imagen no se mueve al bloquear.

## 3 · MVP móvil

- [ ] Sistema de diseño en código (Prompt 5)
- [ ] Biblioteca e importación de imágenes, guardado local
- [ ] Modo imán con guías y vibración
- [ ] Botones de ajuste fino con dos velocidades, pulsación larga, reset y candado
- [ ] Pantalla del divisor con vista previa en vivo (Prompt 6)
- [ ] Minimapa y botón Siguiente trozo en la cámara
- [ ] Onboarding, permisos y textos en español e inglés
- [ ] Pasada de `impeccable` y `web-design-guidelines` sobre cada pantalla (Prompt 7)

**Puerta:** terminas un dibujo real de 4 trozos solo con la app.

## 4 · Beta y lanzamiento

- [ ] Beta cerrada (TestFlight y prueba interna de Google Play)
- [ ] Landing con vídeo de demo
- [ ] Capturas y fichas de las tiendas
- [ ] Publicar y anunciarlo en LinkedIn y GitHub como pieza de portfolio

**Puerta:** publicada en las tiendas.

## 5 · Fase 2

Versión PC, foto a boceto, time-lapse, Retos, envío por QR, divisor por tamaño de papel y exportación. Se desglosa en tareas al llegar.

## 6 · Fase 3

Marcadores en el papel, cuenta y sincronización, modo por pasos, webcam cenital. Se desglosa en tareas al llegar.

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
- [ ] Paleta y tipografía definitivas tras ver las alternativas del Prompt 5
- [ ] Nombre definitivo y dominio
- [ ] Monetización futura: pago único o funciones premium (sin anuncios en ningún caso)
