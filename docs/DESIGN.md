# Diseño · AR-Darwin

Objetivo: una app moderna, con animaciones leves y muy original. Si una pantalla podría ser de cualquier otra app, no vale.

## Concepto: «Grafito y luz»

La app se siente como un cuaderno de dibujo de noche: fondo grafito, texto color papel y dos tintas con significado propio. La idea de Darwin (evolución) se traduce en un gesto de firma: trazos que se dibujan solos y pasan de boceto a línea final.

**Por qué dos tintas.** El acento bermellón marca lo activo y las acciones principales. El azul no-foto es el lápiz que usan los ilustradores para bocetar; aquí pinta las guías del imán, la cuadrícula y las zonas extendidas del divisor. Los dos contrastan sobre papel blanco y sobre grafito, que es justo donde se van a ver.

> Esta paleta es el punto de partida, no un dogma. Ver "Proceso".

## Color

| Token | Valor | Uso |
| --- | --- | --- |
| graphite-950 | #0F0F0E | Fondo principal (modo oscuro por defecto) |
| graphite-900 | #1A1A18 | Superficies, hojas inferiores |
| graphite-700 | #3A3A36 | Bordes y separadores |
| paper | #F3EEE4 | Texto principal; fondo en modo claro |
| ink-vermilion | #FF5A1F | Acento: botón principal, estado activo, racha de retos |
| ink-nonphoto | #7FD3F7 | Guías del imán, cuadrícula, zonas extendidas del divisor |

Contraste mínimo AA en todo el texto. Comprobar el bermellón sobre `paper` en modo claro.

## Tipografía

- **Titulares:** Instrument Serif, cursiva (editorial, nada genérica).
- **Interfaz:** Geist.
- **Medidas y valores:** Geist Mono (112 %, 15 px, A1).

Las tres son gratuitas.

## Forma

- Controles flotantes en píldora sobre la cámara.
- Hojas inferiores con esquinas de 24 px.
- Objetivos táctiles de 48 px como mínimo: se usan con un lápiz en la mano.
- Espaciado en base 4.
- Sombras mínimas o ninguna; la profundidad viene del contraste de superficies.
- El menú de la cámara se oculta solo tras unos segundos sin tocar.

## Movimiento

Leve y con muelle (Reanimated en móvil, Motion en web).

| Tipo | Duración |
| --- | --- |
| Microinteracciones (pulsar, toggle) | 120–180 ms |
| Transiciones de pantalla y hojas | 220–320 ms |

Momentos de firma:

- Trazo que se dibuja: logo, iconos al activarse y estados vacíos.
- Guía del imán: aparece con un pequeño rebote y vibración ligera al encajar.
- Divisor: los trozos se separan escalonados (unos 40 ms entre cada uno).
- Racha de Retos: el contador avanza con muelle.

Todo respeta la opción del sistema de reducir movimiento (sustituir por fundidos cortos o nada).

## Qué evitamos

- Glassmorphism.
- Degradados morados de plantilla.
- Iconos rellenos de stock.
- Pantallas tipo dashboard.

## Pantallas clave (Figma)

1. Inicio / biblioteca de proyectos
2. Cámara con menú (imán, ajuste fino, opacidad, bloqueo, minimapa)
3. Divisor de imagen
4. Retos
5. Onboarding (3 pantallas + permiso de cámara)

## Proceso

1. `frontend-design` fija la dirección.
2. `ui-ux-pro-max` propone 2–3 alternativas de paleta y tipografía para comparar.
3. `playground` para probar tokens, curvas de muelle y animaciones con controles.
4. Las 5 pantallas clave se maquetan en Figma.
5. Cada pantalla ya programada pasa por `impeccable` (crítica) y `web-design-guidelines` (accesibilidad).
