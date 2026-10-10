# Diseño · AR-Darwin

Objetivo: una app moderna, con animaciones leves y muy original. Si una pantalla podría ser de cualquier otra app, no vale.

## Concepto: «Grafito y luz»

La app se siente como un cuaderno de dibujo de noche: fondo grafito, texto color papel y dos tintas con significado propio. La idea de Darwin (evolución) se traduce en un gesto de firma: trazos que se dibujan solos y pasan de boceto a línea final.

**Por qué dos tintas.** El acento bermellón marca lo activo y las acciones principales. El azul no-foto es el lápiz que usan los ilustradores para bocetar; aquí pinta las guías del imán, la cuadrícula y las zonas extendidas del divisor. Los dos contrastan sobre papel blanco y sobre grafito, que es justo donde se van a ver.

> Paleta y tipografía decididas en la fase 1 (issue #4). Si cambia un color, los tests de contraste de `packages/ui` dicen si sigue valiendo.

## Decisión (fase 1, issue #4)

Elegida «Grafito y luz» entre tres direcciones (registro en `docs/design/directions.html`; se conserva como base de la landing, issue #12), con dos préstamos:

- De «Cianotipo»: marcas de medida en la guía del imán (cada 20 px, mayor cada 5).
- De «Cuaderno de campo»: el logotipo es el árbol «I think» del cuaderno de Darwin de 1837, con el origen «1» en bermellón; y los avisos de estado (imán activado, posición bloqueada) llegan como etiquetas que se enderezan con muelle.

Dos temas diseñados por separado, con la misma forma tipada (`packages/ui/src/themes`): **oscuro** (por defecto de la identidad) y **claro** (versión papel). El selector es Sistema / Claro / Oscuro y por defecto sigue al sistema.

## Color

Los valores viven solo en `packages/ui`. Resumen de los semánticos:

| Token | Oscuro | Claro | Uso |
| --- | --- | --- | --- |
| bg.canvas | #161614 | #E8E9E1 | Fondo |
| bg.surface | #201F1C | #F4F4EE | Superficies, hojas |
| bg.raised | #2C2B27 | #FFFFFB | Elementos sobre superficie |
| text.primary | #F1ECE1 | #1E2229 | Texto |
| text.muted | #ADA799 | #545954 | Texto secundario |
| accent | #FF5A1F | #C93A0A | Acción y estado activo |
| text.onAccent | #170A03 | #FFF9F2 | Texto sobre el acento |
| guide | #7FD3F7 | #1F7FB8 | Guías y cuadrícula sobre la interfaz |
| camera.guide / guideCase | #7FD3F7 / #0E1418 | igual | Guía del imán sobre la cámara |

### Hallazgos de contraste

Medidos sobre tres fotos de folio (flexo de noche, luz de día, poca luz; extremos oscuro y claro de cada una), gris medio y papel blanco. Están en tests (`packages/ui/src/themes/contrast.test.ts`): si un color cambia y rompe el contraste, falla `pnpm test`.

- **Guía con doble trazo.** El azul no-foto solo no llega a 3:1 sobre ningún folio, ni sobre blanco (1,7:1). La guía se dibuja con núcleo azul sobre una funda casi negra; el conjunto da ≥ 3,8:1 en todos los fondos.
- **Texto grafito sobre bermellón.** El blanco sobre #FF5A1F da 3,2:1; el grafito #170A03 da 6,2:1. El bermellón pulsado sube a #E54A12 (un tono más oscuro baja de 4,5:1 con texto grafito).
- **Filo de papel en las píldoras.** Una píldora grafito sobre la mesa a oscuras da 1,6:1. Con un filo de papel al 46 % el borde llega a 3,5:1.
- **Bermellón en claro.** #FF5A1F no llega a 3:1 sobre papel; el tema claro usa #C93A0A (mismo tono, más oscuro), con texto papel encima.
- **Guía en claro.** El azul de lápiz de «Cuaderno» daba 2,4:1 sobre papel; #1F7FB8 da ≥ 3:1.
- El bermellón nunca va directamente sobre la foto (1,3:1 sobre gris medio): siempre sobre una píldora o superficie.

### La cámara es siempre oscura

En los dos temas, la cámara usa las mismas píldoras grafito (`cameraColors`); el tema claro se aplica a biblioteca, divisor, ajustes y hojas.

Las píldoras claras pasaban el contraste gracias a su borde de tinta, pero son una fuente de luz junto al dibujo. Comparando la luminancia de la píldora con la del papel más iluminado de cada foto de prueba:

| Fondo | Píldora papel | Píldora grafito |
| --- | --- | --- |
| Flexo de noche | 1,44 × más brillante que el folio | 0,02 × |
| Luz de día | 1,27 × | 0,02 × |
| Poca luz | 4,25 × | 0,05 × |

Con poca luz, la píldora clara sería lo más brillante de la pantalla y apartaría la vista del trazo. Es el mismo criterio de las apps de cámara del sistema, que son oscuras con cualquier tema.

- **Entrada a la cámara en tema claro:** fundido a grafito (`cameraBackdropColor`) con el muelle `screen` (sin rebote) antes de que aparezca la imagen en vivo; nunca un salto de papel a negro. Con «reducir movimiento», fundido corto de 120 ms.
- **Barra de estado:** contenido claro dentro de la cámara en los dos temas (`theme.statusBar.camera`); fuera de ella sigue al tema.
- **Hápticos en iOS:** según la documentación de expo-haptics (SDK 57), el Taptic Engine no vibra mientras la cámara del sistema está activa. El encaje del imán no puede depender solo de la vibración: la guía con rebote y el pulso visual son la señal principal. Comprobarlo en el spike de cámara (fase 2).

## Playground

`pnpm dev:desktop:lan` sirve la web en la red local; `/playground` muestra los tokens, los componentes base y cada movimiento de firma con su versión de «reducir movimiento», usando `packages/core` de verdad (imán, ajuste fino, divisor). En el móvil, `/dev/design` (solo en desarrollo) cambia tema, mano que dibuja y «reducir movimiento» para toda la app, y muestra los componentes base en todos sus estados, los controles de cámara sobre grafito, la hoja inferior, los iconos Skia con su trazo vivo, fuentes, muelles de Reanimated, hápticos y la entrada a la cámara.

## Tipografía

- **Titulares:** Instrument Serif, cursiva (editorial, nada genérica).
- **Interfaz:** Geist.
- **Medidas y valores:** Geist Mono (112 %, 15 px, A1).

Las tres tienen licencia OFL; los archivos y sus licencias van en `packages/ui/assets/fonts`.

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

Tokens (`packages/ui/src/motion.ts`); cada uno lleva su versión reducida:

| Muelle | Rigidez / amortiguación | Uso | Con «reducir movimiento» |
| --- | --- | --- | --- |
| snappy | 420 / 31 (ζ 0,76) | Guía del imán, interruptores | Fundido 120 ms |
| gentle | 170 / 24 (ζ 0,92) | Trozos del divisor, píldoras que vuelven | Fundido 120 ms |
| sheet | 260 / 30 (ζ 0,93) | Hojas inferiores | Fundido 120 ms |
| screen | 220 / 30 (ζ 1,01) | Transiciones de pantalla, entrada a la cámara (sin rebote) | Fundido 120 ms |
| playful | 300 / 17 (ζ 0,49) | Racha, etiquetas de estado | Sin animación |

Momentos de firma:

- Trazo que se dibuja: logo, iconos al activarse y estados vacíos.
- Guía del imán: aparece con un pequeño rebote y vibración ligera al encajar.
- Divisor: los trozos se separan escalonados (unos 40 ms entre cada uno).
- Racha de Retos: el contador avanza con muelle.
- Pulsación «tinta que empapa» en los botones (≤ 180 ms).
- Etiquetas de estado que llegan torcidas 6° y se enderezan.
- Menú de la cámara que se retira 8 px y se desvanece tras 3 s sin tocar; sigue siendo alcanzable con teclado (el foco lo despierta).

## Cabeceras

- Pantallas principales (Biblioteca; Retos más adelante): titular grande en Instrument Serif que
  se desliza bajo una barra fija; al pasar, aparece el título compacto (Geist) y una línea fina.
  Con movimiento completo el titular encoge un poco al irse (0,96) y, si se tira más allá del
  borde superior, crece hasta 1,05 desde la izquierda (solo iOS: Android estira en vez de
  desplazar). Con «reducir movimiento», solo el fundido cruzado.
- Pantallas secundarias (Ajustes, ficha, divisor): header nativo sobre el lienzo, sin sombra.
- Cámara: sin cabecera.

## Hápticos

Semánticos en `packages/ui/src/haptics.ts`; la app los traduce a expo-haptics:

| Evento | Háptico |
| --- | --- |
| La imagen encaja en una guía del imán | Impacto ligero |
| Bloquear o desbloquear | Impacto medio |
| Siguiente trozo / elegir trozo | Selección |
| Un paso de ajuste fino (no en la repetición) | Selección |
| Un valor llega a su límite | Aviso |

## Iconos

Set propio en `packages/ui/src/icons.ts` (20 iconos, retícula 24, trazo 1,75, extremos redondeados, sin rellenos). Web los pinta en SVG; móvil, con Skia (sin react-native-svg). Al activarse, el icono se vuelve a dibujar como un trazo, cada uno 60 ms después del anterior (`icon.drawStaggerMs`).

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
