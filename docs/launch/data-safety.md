# Seguridad de los datos (Google Play)

Respuestas para Play Console › Contenido de la app › Seguridad de los datos. Comprobadas contra la
ayuda de Google el 2026-11-07 ([Seguridad de los datos](https://support.google.com/googleplay/android-developer/answer/10787469)).

## Por qué la respuesta es «no recoge datos»

Google define **recoger** como «transmitir datos desde tu app fuera del dispositivo del usuario». Lo que
solo se procesa en el móvil y no sale de él no se declara. **Compartir** es transferir datos a un
tercero. La app no hace ninguna de las dos cosas:

- No hay ninguna llamada de red en `apps/mobile/src` (ni `fetch`, ni SDK de analítica, anuncios,
  Firebase, Sentry o similares; comprobado con grep el 2026-11-07).
- No incluye `expo-updates` ni otro módulo que contacte con servidores en producción.
- Proyectos, imágenes y ajustes viven en SQLite y en el almacenamiento privado de la app.
- La cámara se procesa en el momento (vision-camera + Skia) y no se graba.
- Las imágenes llegan por el selector del sistema; la app no lee la galería.
- «Enviar comentarios» abre una URL de GitHub en el navegador. La app no transmite nada: es el usuario
  quien decide publicar el issue, fuera de la app.

## Respuestas, pregunta a pregunta

### 1. Recogida y seguridad de los datos

> ¿Tu app recoge o comparte alguno de los tipos de datos de usuario obligatorios?

**No.**

Con «No», Play no pregunta por el cifrado en tránsito, la eliminación de datos ni los tipos de datos
(esas preguntas solo salen con «Sí»). El formulario sigue siendo obligatorio y exige la URL de la
política de privacidad.

### 2. Política de privacidad

- Español: `https://mkcodev.com/ar-darwin/privacidad`
- Inglés: `https://mkcodev.com/ar-darwin/privacy`

Play pide una sola URL en el formulario: usa la española si el idioma predeterminado de la ficha es el
español, o una página con los dos idiomas.

### 3. Vista previa de la ficha

Lo que verá la gente en la tienda:

- «No se comparten datos con terceros»
- «No se recogen datos»

### Otras secciones de «Contenido de la app» relacionadas

Aunque no son parte de este formulario, se rellenan en la misma pantalla de Play Console:

| Sección | Respuesta |
| --- | --- |
| Anuncios | La app no contiene anuncios |
| Acceso a la app | Toda la funcionalidad está disponible sin restricciones (no hay inicio de sesión) |
| Público objetivo | 13 a 15, 16 a 17 y 18 o más. No atrae a niños |
| Clasificación de contenido | Cuestionario IARC: herramienta/utilidad sin violencia, sexo, lenguaje, drogas, apuestas ni compras. Sin interacción entre usuarios ni contenido generado compartido. Se espera «Para todos» / PEGI 3 |
| App de noticias | No |
| Apps gubernamentales | No |
| Funciones financieras | Ninguna |
| Salud | Ninguna |
| ID de publicidad | La app no usa el ID de publicidad (comprobar que el manifest final no incluye `com.google.android.gms.permission.AD_ID`) |

## Cuándo hay que revisar estas respuestas

Cualquiera de estos cambios obliga a actualizar el formulario **antes** de publicar la versión que lo
incluya (y la política de privacidad):

- Compras dentro de la app (premium): Play Billing procesa pagos. Revisar si aparece «Historial de
  compras» u otros datos.
- Informes de errores o analítica (Sentry, EAS Observe, Firebase...): aparecen «Registros de fallos»,
  «Diagnóstico» o «Interacciones con la app».
- Actualizaciones OTA (`expo-updates`): contactan con los servidores de EAS; revisar qué envían.
- Sync futura o cuentas (p. ej. con Supabase): fotos, nombre, email, identificadores.
- Envío de imágenes del PC al móvil, si pasa por un servidor.
- Cualquier SDK nuevo: revisar su propia sección de Seguridad de los datos.
