# Lanzamiento en Google Play

Todo lo que pide Google Play y no es código: textos legales, respuestas de formularios, ficha de la
tienda, recursos gráficos y la lista de pasos para subir la app. Primero Android; iOS sigue pendiente
de decidir (ver «Decisiones pendientes» en docs/ROADMAP.md).

| Archivo | Qué es |
| --- | --- |
| [privacy-policy.es.md](privacy-policy.es.md) | Política de privacidad en español |
| [privacy-policy.en.md](privacy-policy.en.md) | Política de privacidad en inglés |
| [data-safety.md](data-safety.md) | Respuestas del formulario «Seguridad de los datos» |
| [store-listing.md](store-listing.md) | Ficha de la tienda es/en: nombre, descripciones, categoría, etiquetas |
| [store-assets.md](store-assets.md) | Icono, gráfico de funciones y capturas que hay que preparar |
| [play-checklist.md](play-checklist.md) | Pasos pendientes para publicar: cuenta, prueba cerrada, firma, EAS, versionado |

## Decisiones tomadas (2026-11-07)

- **Gratis.** Una app gratuita en Play no puede pasar a ser de pago. Un premium futuro iría como compra
  dentro de la app, y entonces hay que revisar la política y «Seguridad de los datos».
- **Público de 13 años o más.** Queda fuera de la política de Familias de Google Play.
- **Sin anuncios, sin cuentas, sin analítica.** La app no envía datos fuera del móvil.
- **Política alojada en mkcodev.com**, independiente del nombre de la app:
  - Español: `https://mkcodev.com/ar-darwin/privacidad`
  - Inglés: `https://mkcodev.com/ar-darwin/privacy`

## Marcadores

Lo que depende de decisiones aún abiertas va marcado así en todos los archivos:

| Marcador | Depende de | Dónde aparece |
| --- | --- | --- |
| `[NOMBRE]` | Nombre definitivo de la app (hoy «AR-Darwin», provisional) | Ficha, política, recursos gráficos, checklist |
| `[DOMINIO]` | Dominio propio de la app, si lo hay | Web de la ficha, landing (issue #12) |
| `[EMAIL]` | Email de contacto público (se decide junto al nombre y el dominio) | Política, ficha |

Al cambiar el nombre, «AR-Darwin» aparece también en el código: `app.config.ts` (nombre de la app),
`packages/i18n` (textos de los permisos y de la app) y el identificador `com.mkcodev.ardarwin`.
**El identificador del paquete no se puede cambiar después de la primera subida a Play**: decídelo
antes (ver play-checklist.md).

## Qué depende de que se publique #104

La política, «Seguridad de los datos» y la ficha describen la app tal como saldrá. Varias funciones
dependen del rebuild nativo (#102 y #104) y de sus PR de JS, que aún no están en `main`:

- Guardar la foto del dibujo terminado en la galería (`expo-media-library`, solo escritura).
- Importar desde archivos (`expo-document-picker`).
- Recibir imágenes con «Compartir» desde otras apps (`expo-sharing`).
- Bloqueo de los permisos de lectura de la galería (`blockedPermissions` en `app.config.ts`).

Cada una va marcada con «(si llega al lanzamiento)» en el archivo que la menciona. Si alguna no llega,
borra su párrafo antes de publicar.

«Enviar comentarios» y la hoja «¡Dibujo terminado!» vienen de #108 y #110 (solo JS, pendientes de la
prueba en el móvil). Se dan por incluidas.
