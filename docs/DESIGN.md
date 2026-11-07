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

### Categorías (issue #38)

Paleta propia de 8 tintas (`categoryInk` en primitivas, `theme.color.category[clave]` en los temas). La categoría guarda la **clave** (`"ochre"`), nunca un hex: el color sigue al tema activo. Las 6 de serie usan 6; `pine` y `lichen` quedan para las categorías propias.

| Clave | Oscuro | Claro | Categoría de serie |
| --- | --- | --- | --- |
| ochre | #D5B276 | #7A5B01 | Animales |
| plum | #DFABD2 | #883679 | Personas |
| moss | #6E9D6F | #1C5C23 | Paisajes |
| indigo | #9499D3 | #4642A2 | Manga y anime |
| sepia | #B2856E | #623A1D | Objetos |
| slate | #737D93 | #3A4567 | Letras |
| pine | #81C1A8 | #197E61 | — |
| lichen | #B6DBA0 | #718109 | — |

- **El color de categoría nunca va solo; siempre con icono o nombre.** Hay personas que no distinguen ciertos pares de tintas, y el color no debe ser la única pista.
- **Pigmento, no neón.** Sobre grafito el croma (OKLCH) no pasa de 0,09 (`MAX_CATEGORY_CHROMA_DARK`): se lee como tiza o pigmento, igual de terroso que en papel. El bermellón es el único color cálido y vivo de la interfaz; el ocre tira a amarillo apagado.
- Se usa como trazo de icono o punto, no como fondo de texto: ≥ 3:1 sobre lienzo, superficie y elevado en los dos temas (el peor da 3,4:1, `slate` en oscuro).
- **Distinción perceptiva:** ΔE en OKLab ≥ 0,10 entre cada par de claves y frente a guía y peligro, ≥ 0,15 frente al acento y ≥ 0,12 frente a `text.primary` (que ningún color parezca un icono neutro) y ≥ 0,08 frente a `text.muted` (que ningún icono parezca desactivado), en los dos temas (`MIN_CATEGORY_DELTA_E`, `MIN_CATEGORY_ACCENT_DELTA_E`, `MIN_CATEGORY_TEXT_DELTA_E`, `MIN_CATEGORY_MUTED_DELTA_E`). El más cercano es lichen en oscuro (0,123), y por eso es más verde y algo más oscuro que un liquen claro. Con la misma luminosidad, 8 tintas quedaban a 0,04: por eso la luminosidad varía por clave.
- Tonos lejos del bermellón (acción), del azul no-foto (guías) y del rosa de peligro, para que una categoría nunca parezca un estado.
- El icono de manga son viñetas con cortes en diagonal, no un ojo (se confundiría con mostrar/ocultar).

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

- **Titulares:** Instrument Serif, cursiva (editorial, nada genérica). También el nombre del
  proyecto de «Seguir calcando» (rol `headline`, 26/30), y en ningún otro sitio de la Biblioteca.
- **Interfaz:** Geist.
- **Medidas y valores:** Geist Mono (112 %, 15 px, A1).

Las tres tienen licencia OFL; los archivos y sus licencias van en `packages/ui/assets/fonts`.

## Forma

- Controles flotantes sobre la cámara: el raíl de herramientas y la cruz en píldora; el menú de abajo,
  un **dock de una sola superficie** (`cameraDock`, radio 28): un único contorno de papel y, dentro, zonas
  que se separan por tono (`camera.well`, un grafito algo más claro) y por espacio, nunca por bordes
  anidados. Los radios interiores son concéntricos (28 − 8 de relleno = 20). Una sola acción principal en
  bermellón; el resto, secundario.
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
- Guía del imán: aparece con un pequeño rebote y vibración ligera al encajar (solo al encajar moviendo; no al soltar ni al tocar una imagen ya encajada). En el móvil es fina y de baja opacidad (`magnetGuide.quiet`) y se desvanece sola a los 400 ms aunque siga encajada. La guía del pin es discontinua, con una cruz en su centro, para no confundirla con un eje.
- Divisor: los trozos se separan escalonados (unos 40 ms entre cada uno).
- Racha de Retos: el contador avanza con muelle.
- Pulsación «tinta que empapa» en los botones (≤ 180 ms).
- Etiquetas de estado que llegan torcidas 6° y se enderezan.
- Menú de la cámara que se retira 8 px y se desvanece tras 3 s sin tocar; sigue siendo alcanzable con teclado (el foco lo despierta). En el móvil lo despierta solo un toque quieto (no un arrastre, pellizco o giro de la imagen), no se oculta con el lector de pantalla activo, y arrastra consigo la cruz de ajuste fino; el candado no se retira.
- Candado: al mantenerlo pulsado, un anillo de 72 dp (más ancho que la yema) se rellena en sentido horario sobre una pista grafito, para que se vea alrededor del dedo cuánto falta.

## Cabeceras

- Pantallas principales (Biblioteca; Retos más adelante): titular grande en Instrument Serif que
  se desliza bajo una barra fija; al pasar, aparece el título compacto (Geist) y una línea fina.
  Con movimiento completo el titular encoge un poco al irse (0,96) y, si se tira más allá del
  borde superior, crece hasta 1,05 desde la izquierda (solo iOS: Android estira en vez de
  desplazar). Con «reducir movimiento», solo el fundido cruzado.
- Pantallas secundarias (Ajustes, ficha, divisor): header nativo sobre el lienzo, sin sombra.
- Ajustes: una lista vertical por secciones, sin tarjetas ni divisores. Cada sección lleva su título
  en `title` (cabecera para el lector de pantalla); las secciones van a `space[8]` y los ajustes de
  dentro a `space[6]`. Las elecciones son `SegmentedControl` (radiogrupo, 48 dp, la selección desliza
  con `snappy`) y los sí/no, `Toggle`; cada uno con su nota atenuada debajo cuando hace falta.
  - **Apariencia:** Tema (Sistema | Claro | Oscuro), que se ve al instante en la propia pantalla, e
    Idioma (Sistema | Español | English), con la nota de reabrir solo si el elegido no es el activo.
  - **Cámara:** «¿Con qué mano dibujas?» (Derecha | Izquierda), Imán y Vibración (al activarla suena
    un toque, para notarla).
  - **Proyectos nuevos:** opacidad de la imagen (40 % | 62 % | 80 %, de `opacity.overlayChoices`; el
    62 % es el de siempre), Papel (A4 | A3 | Carta) y Orientación (Vertical | Horizontal) de «Folios»,
    con una sola nota: solo se aplica a lo que se importe después.
  - **Accesibilidad:** Reducir movimiento (Sistema | Sí | No), con la nota de qué tiene el móvil, que
    cambia en vivo. Se respeta en toda la app, transiciones del stack incluidas.
  - **Acerca de:** «Versión X» y «Hecha por mkcodev» en `body` (la autoría atenuada); «Código en
    GitHub» y «Licencias» en una fila de botones secundarios; «Enviar comentarios» (abre un issue con
    la versión y el móvil escritos) y «Ver la introducción», cada uno con su nota.
- Licencias: header nativo, una frase atenuada y la lista generada, una fila de 48 dp por paquete:
  el nombre en `body` y «versión · licencia» en `value` (Geist Mono) atenuado. Sin buscador ni
  enlaces: es una lista de consulta.

## Onboarding

- Tres pantallas sobre `bg.canvas`: cabecera con atrás (desde la 2.ª), «1/3» en Geist Mono atenuado y
  «Saltar» (no en la 3.ª); un dibujo, el titular en Instrument Serif, el texto en `body` atenuado, y
  abajo el indicador de tres segmentos (el actual en `accent`, el resto `border.strong`) y la acción
  principal en bermellón.
- Dibujos de trazo vivo, los mismos gestos de firma: el árbol del logo sobre un folio (calcar), la
  rejilla 3 × 3 en el azul no-foto con el trozo actual en bermellón y dos con marca (dividir) y el
  icono de cámara (permiso). Con «reducir movimiento» se funden; sin movimiento, aparecen.
- El dibujo se encoge antes de que el texto se corte (fuente grande, 360 × 640); si ni así cabe, la
  página se desplaza. Las páginas entran con `screen` (220–320 ms) desde el lado al que se avanza.
- La 1.ª pregunta «¿Con qué mano dibujas?» con el mismo selector de Ajustes; el swipe no se engancha
  sobre él.
- Se repasa desde Ajustes, «Ver la introducción».

## Biblioteca

Biblioteca 2 (issue #105). Lo memorable está en un solo sitio, el mapa de trozos de «Seguir
calcando»; el resto es sobrio.

- **Vacía:** el dibujo del onboarding (el árbol calcado sobre un folio, con trazo vivo), una frase
  de qué hace la app (`library.emptyIntro`) y las fuentes de `IMPORT_SOURCES` como botones a todo
  lo ancho, la primera primaria («Elegir de la galería», «Hacer una foto»; «Archivos» se suma sola
  tras el rebuild). Sin «Importar» en la barra.
- **Barra:** «Importar» como píldora con texto (botón secundario compacto con «+»), no un «+»
  suelto, y el icono de Ajustes.
- **Resumen:** una línea `body` atenuada bajo el titular, «3 en curso. Llevas 14 h calcando.»; se
  omite la parte que vale cero.
- **«Seguir calcando»** (`ContinueCard`, unos 190 dp): el proyecto no terminado con el `updatedAt`
  más reciente. Renombrar o cambiar categorías no cambia la fecha (la tarjeta sigue al trabajo en
  la cámara, no al archivo); terminar, reabrir, duplicar e importar sí. `bg.surface` con línea fina y radio `lg` (las miniaturas llevan `md`: la jerarquía
  también está en la forma), sin sombra.
  - Miniatura 72 × 96 (`library.continueThumb*`), nombre en Instrument Serif (`headline`, 26/30,
    dos líneas), «Trozo B2» o «Sin dividir» en Geist Mono, y «4/9 trozos» y el tiempo en mono
    atenuado, en elementos separados (nunca unidos con «·»).
  - A la derecha, el **mapa de trozos** (`TileMap`, Skia, lado largo `library.tileMapSide` 56):
    celdas en azul no-foto (`guide.default`), las hechas con tinte `guide.tint` y una marca fina, y
    el trozo actual relleno de bermellón (con su marca en `text.onAccent` si ya está hecho: «2/6»
    enseña dos marcas). Solo aparece, sin animación. Sin dividir: botón «Dividir».
  - Botón primario a todo lo ancho con la cámara: «Seguir calcando», o «Empezar a calcar» si no se
    empezó. Abre la cámara en el trozo guardado.
  - Si todo está terminado, no hay tarjeta. Al buscar o filtrar se oculta.
- **Búsqueda y filtros** (desde `LIBRARY_TOOLBAR_MIN_PROJECTS` = 5 proyectos, o mientras haya un
  filtro): campo de búsqueda en píldora (`SearchField`, cursor y selección en bermellón) y botón
  «Filtrar», que con filtros activos pasa al acento y muestra cuántos. Debajo, un chip quitable por
  filtro activo (fila con scroll lateral).
- **Hoja «Filtrar y ordenar»:** estado (uno: Todos, Sin empezar, En curso, Completado), categorías
  (varias; basta una), orden con el `SegmentedControl` (Recientes, Nombre, Progreso). Los cambios
  son un borrador hasta «Ver resultados (N)», con la cuenta en vivo; «Restablecer» no toca la
  búsqueda.
- **Sección:** «Otros proyectos» (o «Resultados» al filtrar) en `title`, el total en mono atenuado
  y el orden actual a la derecha con el icono `sort` (abre la hoja). Sin resultados: «Ningún
  proyecto coincide.» y «Quitar filtros» («Borrar búsqueda» si solo hay búsqueda). Con un solo proyecto, una pista atenuada de la pulsación larga.
- **Rejilla:** 2 columnas; deja fuera el destacado salvo al filtrar. Tarjeta: miniatura 3:4 sobre
  `bg.surface` con línea fina y radio `md`, sin sombra; píldora «⋯» (`bg.surface`, línea
  `border.strong`, que se ve también sobre una miniatura blanca en el tema claro; hit slop
  `library.cardMenuHitSlop`) arriba a la derecha sobre la miniatura. Debajo:
  - en proyectos divididos, la barra fina de 4 dp (`library.progressHeight`) sobre el lienzo, no
    sobre la miniatura (se lee igual con una imagen blanca o negra); sin barra, el hueco se
    reserva igual, así los nombres de una fila quedan alineados;
  - nombre (`label`);
  - estado en `label` atenuado y «4/9» en mono atenuado (el mono es para valores: las palabras en
    mono parecen código); los completados, con una marca;
  - la primera categoría como icono en su tinta + nombre, y «+N» si hay más.
- **Acciones** (pulsación larga o «⋯»): hoja con filas de 56 dp (`SheetRow`): Renombrar, Categorías
  (con las actuales a la derecha, en `body`), Dividir o Volver a dividir (con «3 × 3» en mono), Duplicar, Marcar como
  terminado o Reabrir, y Eliminar en `danger`. Renombrar y Categorías son pasos dentro de la misma
  hoja (campo de texto con «Guardar», que no deja un nombre vacío y sube sobre el teclado; chips de selección múltiple
  con «Listo»). «Reabrir» solo aparece si el «terminado» se marcó a mano y algún trozo sigue
  pendiente.
- **Eliminar con deshacer:** sin confirmación. La tarjeta se funde y la rejilla cierra el hueco
  con `gentle` (con «reducir movimiento», solo el fundido), y sale un `Snackbar` abajo
  (`bg.raised`, línea fina, radio `lg`, sin sombra) con «Deshacer» en bermellón durante
  `library.undoMs` (5 s; `undoScreenReaderMs`, 10 s, con lector de pantalla). Se anuncia con
  `announceForAccessibility`. Duplicar confirma con el mismo snackbar, sin acción.
- **Lector de pantalla:** la tarjeta se lee «nombre, estado, 4 de 9 trozos hechos» y ofrece
  Renombrar, Duplicar y Eliminar como acciones propias; el mapa de trozos está oculto (la tarjeta ya
  dice «Trozo B2, 4/9 trozos»); el total de la sección es una región `polite`.
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
| Abrir las acciones de un proyecto (toque o pulsación larga) | Impacto ligero |
| Proyecto eliminado (al ocultarlo, con «Deshacer» a la vista) | Éxito |
| Falla importar, eliminar, guardar un cambio o duplicar | Error |

## Iconos

Set propio en `packages/ui/src/icons.ts` (45 iconos, retícula 24, trazo 1,75, extremos redondeados, sin rellenos; 6 son de las categorías de serie: `animal`, `person`, `landscape`, `manga`, `object`, `lettering`; los de la Biblioteca 2 son `search`, `filter`, `more`, `pencil`, `duplicate`, `close`, `tag`, `sort` y `file`, este para «Archivos» tras el rebuild). Web los pinta en SVG; móvil, con Skia (sin react-native-svg). Al activarse, el icono se vuelve a dibujar como un trazo, cada uno 60 ms después del anterior (`icon.drawStaggerMs`).

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
5. Onboarding (3 pantallas; la tercera, el permiso de cámara)

## Proceso

1. `frontend-design` fija la dirección.
2. `ui-ux-pro-max` propone 2–3 alternativas de paleta y tipografía para comparar.
3. `playground` para probar tokens, curvas de muelle y animaciones con controles.
4. Las 5 pantallas clave se maquetan en Figma.
5. Cada pantalla ya programada pasa por `impeccable` (crítica) y `web-design-guidelines` (accesibilidad).
