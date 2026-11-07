# Recursos gráficos de la ficha

Qué hay que preparar para Play, con los tamaños comprobados en la ayuda de Google el 2026-11-07
([Recursos de la ficha](https://support.google.com/googleplay/android-developer/answer/9866151)).
Aún no se hace ninguno: esperan al nombre definitivo y a que el MVP pase la puerta de la fase 3.

Todo sale con los colores, tipografías y radios de `packages/ui` (dirección «Grafito y luz»,
docs/DESIGN.md). Nada de marcos de móvil genéricos, degradados de plantilla ni glassmorphism.

## Obligatorios

| Recurso | Tamaño | Formato | Depende de |
| --- | --- | --- | --- |
| Icono de la app | 512 × 512 px | PNG de 32 bits con alfa, máx. 1 MB | `[NOMBRE]` si el icono cambia con él |
| Gráfico de funciones | 1024 × 500 px | JPEG o PNG de 24 bits, **sin alfa** | `[NOMBRE]` (lleva el nombre) |
| Capturas de teléfono | mín. 2, máx. 8 | JPEG o PNG de 24 bits, sin alfa | Textos en es y en |

### Icono

- Partir del `logoMark` de `packages/ui`, el mismo que genera `apps/mobile/assets/images/icon.png`
  (1024 × 1024, versión de producción con fondo graphite 950).
- Exportarlo a 512 × 512. Play aplica la máscara y la sombra: entregarlo cuadrado, sin esquinas
  redondeadas ni sombra propia.

### Gráfico de funciones

- Aparece arriba de la ficha y cuando Play destaca la app. Puede recortarse en algunos sitios:
  nombre y mensaje dentro del centro, nada importante en los bordes.
- Idea: la cámara calcando un trozo sobre papel real, con el nombre y una frase («Calca cualquier
  imagen. Sin anuncios.»). Una versión por idioma.

### Capturas de teléfono

Para que Play pueda recomendar la app hacen falta **al menos 4 capturas en vertical 9:16 de
1080 × 1920 px o más**. Plan: **6 capturas a 1080 × 1920**, en es y en (12 archivos), con un titular
corto encima de cada una.

| # | Pantalla | Titular (es) | Titular (en) |
| --- | --- | --- | --- |
| 1 | Cámara calcando sobre papel real, imagen a media opacidad | Calca cualquier imagen | Trace any image |
| 2 | Divisor en modo Folios: A4, ancho en cm, «Mural de X × Y cm · N folios» | Dibujos grandes, folio a folio | Big drawings, sheet by sheet |
| 3 | Cámara con el dock del trozo, progreso y minimapa | Sigue tu progreso por trozos | Track your progress tile by tile |
| 4 | Imán en acción: guía de eje visible | La imagen encaja sola | The image snaps into place |
| 5 | Biblioteca con «Seguir calcando», categorías y filtros | Tus proyectos, ordenados | Your projects, organised |
| 6 | Ajustes de imagen (contraste, invertir) o espejo | Ajusta la imagen a tu gusto | Tune the image your way |

Opcional: una 7.ª con la hoja «¡Dibujo terminado!» y una 8.ª con el candado («Sin toques
accidentales»).

Cómo hacerlas: en un móvil real (la cámara no sale en el emulador), con el development build o un
build `preview`, sin la barra de depuración y con la barra de estado limpia (hora fija, batería
llena). Mismo dibujo de ejemplo en todas para que la serie se lea como una historia. La imagen de
ejemplo debe ser propia o con licencia que permita usarla.

## Opcionales

| Recurso | Requisito | Decisión |
| --- | --- | --- |
| Capturas de tablet (7" y 10") / Chromebook | mín. 4, de 1080 a 7680 px, 16:9 o 9:16 | No por ahora: la app es solo vertical y está pensada para el móvil. Sin ellas la app sigue disponible en tablets, pero Play no la marca como diseñada para pantallas grandes |
| Vídeo promocional | URL de YouTube | Cuando exista la demo de la landing (issue #12) |

## Fuera de la ficha, pero pendiente

- Splash: `app.config.ts` aún usa el fondo `#208AEF` y la imagen de la plantilla de Expo. Cambiarlo
  es la tarea «Nombre, icono y splash definitivos en la config» del roadmap (visual, con el móvil).
