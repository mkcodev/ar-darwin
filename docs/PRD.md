# PRD · AR-Darwin

## Visión

AR-Darwin es una app para calcar dibujos con la cámara (móvil) y preparar y proyectar imágenes (PC), sin anuncios y con las herramientas que las apps actuales no tienen.

### El problema

Las apps de AR drawing populares viven de anuncios intrusivos, se desalinean al mínimo movimiento, no bloquean los toques accidentales y no ayudan con dibujos grandes que no caben en un folio.

### Para quién

- Personas que empiezan a dibujar y quieren resultados rápidos.
- Aficionados que hacen murales o láminas grandes.
- Creadores que comparten su proceso en redes.

### Qué nos diferencia

- Cero anuncios y una interfaz que no estorba mientras dibujas.
- Control preciso de la imagen: modo imán con guías inteligentes y botones de ajuste fino.
- Divisor de imagen con corte al ras o con bordes extendidos de grosor ajustable, para dibujos grandes por partes.
- Foto a boceto, time-lapse para redes y una sección de Retos para mantener la constancia.
- Ecosistema móvil + PC: preparas en el ordenador y dibujas con el móvil.

### Objetivo

Primero, una pieza de portfolio publicada en tiendas que demuestre producto, diseño e ingeniería. Después, si hay tracción, monetizar con pago único o funciones premium, nunca con anuncios.

---

## Funcionalidades

El MVP es la app móvil con la cámara completa, la biblioteca y el divisor. La versión PC, el boceto automático, el time-lapse y los Retos llegan en la fase 2; los marcadores y la sincronización, en la fase 3.

| Módulo | Funcionalidad | Fase |
| --- | --- | --- |
| Cámara | Imagen superpuesta con control de opacidad | MVP |
| Cámara | Bloqueo de toques y pantalla siempre encendida | MVP |
| Cámara | Zoom, mover y rotar con gestos; espejo horizontal y vertical | MVP |
| Cámara | Modo imán (ver detalle) | MVP |
| Cámara | Botones de ajuste fino (ver detalle) | MVP |
| Cámara | Linterna y ajustes de imagen (contraste, brillo, invertir) | MVP |
| Cámara | Minimapa del trozo actual y botón Siguiente trozo | MVP |
| Cámara | Grabación time-lapse del dibujo | Fase 2 |
| Cámara | Anclaje con marcadores en las esquinas del papel | Fase 3 |
| Biblioteca | Importar desde galería, cámara o archivos | MVP |
| Biblioteca | Proyectos guardados en local, con último ajuste de cámara | MVP |
| Divisor | Filas × columnas, corte al ras o bordes extendidos (ver detalle) | MVP |
| Divisor | Modo por tamaño de papel (cm, A4, A3) y exportación a imágenes o PDF | Fase 2 |
| Preparación | Foto a boceto con varios niveles de detalle | Fase 2 |
| Preparación | Cuadrícula para aprender a dibujar sin calcar | Fase 2 |
| Preparación | Modo por pasos: contornos, detalles, sombras | Fase 3 |
| Retos | Reto diario y semanal, racha de días e historial de dibujos | Fase 2 |
| Retos | Compartir resultado y time-lapse en redes | Fase 2 |
| PC | Preparar imágenes y enviarlas al móvil con un código QR | Fase 2 |
| PC | Modo mesa de luz para calcar sobre la pantalla | Fase 2 |
| PC | Modo webcam cenital | Fase 3 |
| Cuenta | Inicio de sesión y sincronización móvil ↔ PC | Fase 3 |
| Transversal | Español e inglés desde el primer día | MVP |
| Transversal | Onboarding de 3 pantallas y permiso de cámara bien explicado | MVP |

---

## Detalle: menú de la cámara

### Modo imán

Al mover, escalar o rotar la imagen, se alinea sola, como las guías inteligentes de Photoshop.

- Encaja con el centro horizontal y vertical de la pantalla y con sus 4 bordes. En fase 3, también con los bordes del folio detectado.
- Las guías se dibujan (azul no-foto) solo mientras está encajada.
- Vibración ligera (haptic) en el momento en que encaja.
- Imán de rotación en múltiplos de 45° (0°, 45°, 90°…).
- Interruptor para activarlo o desactivarlo.
- Umbral de encaje por defecto: 8 px en pantalla y 3° en rotación (configurables).

### Botones de ajuste fino

Para colocar la imagen con precisión sin pellizcar.

- Agrandar (+), reducir (−), mover arriba, abajo, izquierda y derecha, rotar ±1°.
- Dos velocidades (toggle): fino y grande.
  - Mover: 1 px / 10 px.
  - Escala: 1 % / 5 %.
  - Rotación: 1° / 5°.
- Pulsación larga = repetición continua.
- Botón de resetear posición.
- Candado que bloquea posición, tamaño y rotación.

### Bloqueo de pantalla

- Ignora todos los toques salvo una pulsación larga de 1 s sobre el candado.
- La pantalla no se apaga mientras la cámara está abierta.

### Menú

- Controles flotantes en píldora; el menú se oculta solo tras unos segundos sin tocar.

---

## Detalle: divisor de imagen

Divide la imagen en partes para dibujar por trozos un dibujo que no cabe en un folio. Está en el menú principal (fuera de la cámara).

- Elegir filas y columnas (1–10 cada una).
- **Corte al ras:** los trozos se cortan exactamente por la línea; no se solapan.
- **Bordes extendidos:** cada trozo incluye una franja del trozo vecino por los lados donde hay corte, para que al pasar de un trozo a otro sea fácil empalmar. Ejemplo: dividida en 2 por la mitad, el trozo izquierdo lleva un poco del derecho y el derecho un poco del izquierdo.
  - Solo se extiende por los bordes interiores (donde hay vecino), nunca por el borde exterior de la imagen.
  - Control de grosor del borde extendido: slider + botones +/−.
  - El grosor nunca supera la mitad del lado más corto de un trozo.
- Zona extendida tintada en azul no-foto (activable), para saber qué parte "ya está dibujada" en el folio de al lado.
- Línea de corte original visible como línea discontinua.
- Cada trozo se nombra: fila en letra y columna en número (A1, A2… B1).
- Vista previa en vivo al cambiar cualquier valor.
- Tocar un trozo lo abre en la cámara.
- En la cámara: minimapa con el trozo actual y botón **Siguiente trozo** que mantiene zoom y opacidad.
- Fase 2: modo por tamaño de papel ("quiero el dibujo de 60×40 cm en A4" → la app calcula filas y columnas), grosor en mm y exportación a imágenes o PDF.

---

## Detalle: Retos (fase 2)

- Reto diario y semanal ("dibuja tu mascota", "solo líneas", "15 minutos").
- Racha de días consecutivos con contador animado.
- Historial con la foto del resultado y el time-lapse.
- Compartir en redes.

---

## Fuera de alcance

- Anuncios, en cualquier fase.
- AR con detección de planos (ARKit/ARCore) en el MVP.
- Red social propia dentro de la app.
