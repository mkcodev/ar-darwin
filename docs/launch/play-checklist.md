# Checklist para publicar en Google Play

Lo que falta, en orden. Comprobado contra la ayuda de Google y la documentación de EAS el
2026-11-07. `[NOMBRE]` y `[DOMINIO]` marcan lo que espera a esas decisiones.

Partida: no hay cuenta de desarrollador todavía. Será una **cuenta personal**, así que Google exige
una prueba cerrada antes de producción (paso 5).

## 0. Antes de empezar

- [ ] MVP con la puerta de la fase 3 pasada («terminas un dibujo real de 4 trozos solo con la app»)
      y las PR abiertas (#102, #104, #108, #110) mergeadas.
- [ ] `[NOMBRE]` Nombre definitivo decidido (roadmap, «Decisiones pendientes»).
- [ ] `[EMAIL]` Email de contacto público creado (p. ej. en `[DOMINIO]` o en mkcodev.com).

## 1. Cuenta de desarrollador

- [ ] Crear la cuenta en [Play Console](https://play.google.com/console/signup) como **personal**.
      Pago único de 25 USD.
- [ ] Verificar la identidad (documento oficial) y el email y teléfono de contacto.
- [ ] Verificar el acceso a un dispositivo Android con la app Play Console (lo pide a las cuentas
      nuevas).
- [ ] Nombre de desarrollador público: `mkcodev` (coincide con «Acerca de» en Ajustes).

## 2. Política de privacidad alojada

- [ ] Publicar [privacy-policy.es.md](privacy-policy.es.md) en `https://mkcodev.com/ar-darwin/privacidad`
      y [privacy-policy.en.md](privacy-policy.en.md) en `https://mkcodev.com/ar-darwin/privacy`.
      Quitar el comentario de cabecera, rellenar `[NOMBRE]` y `[EMAIL]`, poner la fecha real y borrar
      lo marcado «(si llega al lanzamiento)» que no llegue.
- [ ] Comprobar que las URL abren sin inicio de sesión, en el móvil, y no son un PDF.

Alternativa si mkcodev.com no está listo: GitHub Pages del repo (Settings › Pages, rama `main`,
carpeta `/docs`). La URL sería `https://mkcodev.github.io/ar-darwin/launch/privacy-policy.es` (Jekyll
convierte el Markdown). Ojo: así se publica todo `docs/`, no solo la política (el repo ya es
público, así que no expone nada nuevo). Pega luego la URL definitiva en Play cuando mkcodev.com esté listo.

## 3. Perfil `production` en EAS

Propuesta para `apps/mobile/eas.json` (no aplicada todavía; va en su propia PR):

```json
{
  "cli": {
    "appVersionSource": "remote"
  },
  "build": {
    "development": { "...": "sin cambios" },
    "preview": { "...": "sin cambios" },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "APP_VARIANT": "production"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "internal",
        "releaseStatus": "draft"
      }
    }
  }
}
```

- [ ] `buildType: app-bundle`: Play solo acepta AAB, no APK.
- [ ] Sin `EXPO_PUBLIC_SPIKES`: las rutas de spike y `/dev/design` quedan fuera del bundle de
      producción (`__DEV__` y `EXPO_PUBLIC_SPIKES`, ver `apps/mobile/src/app/dev/`).
- [ ] `APP_VARIANT=production`: cualquier valor distinto de `development` da el nombre y el
      identificador de producción (`app.config.ts`); ponerlo explícito evita sorpresas.
- [ ] `submit.production` sin `serviceAccountKeyPath`: la clave de la cuenta de servicio de Google
      se sube a EAS con `eas credentials --platform android` y **nunca se commitea**.

## 4. Firma y versionado

- [ ] **Play App Signing** (obligatorio para AAB): Google guarda la clave de firma de la app. La
      keystore que genera EAS en el primer build de producción queda como **clave de subida**. EAS la
      guarda en sus servidores; descarga una copia de seguridad con `eas credentials` y guárdala
      fuera del repo.
- [ ] `version` en `app.config.ts` (hoy `1.0.0`) es el `versionName` visible. Se sube a mano en cada
      versión publicada (semver: 1.0.1 arreglos, 1.1.0 funciones).
- [ ] `versionCode` lo lleva EAS (`appVersionSource: remote` ya está en `eas.json`) y sube solo con
      `autoIncrement`. No poner `android.versionCode` en `app.config.ts`. Si alguna vez se sube un
      build hecho fuera de EAS, sincroniza con `eas build:version:set`.
- [ ] Target API: Play exige **API 36 (Android 16)** a apps nuevas y actualizaciones desde el
      31-08-2026. Comprobar en el AAB que `targetSdkVersion` es 36 o más
      (`bundletool dump manifest --bundle app.aab`).
- [ ] Páginas de memoria de 16 KB (exigidas para apps con target 35 o más): Play Console avisa en
      «Explorador de app bundles» si alguna librería nativa no las cumple. Revisarlo con el primer AAB.

## 5. Crear la app y prueba cerrada (obligatoria en cuentas personales)

- [ ] `[NOMBRE]` Crear la app en Play Console: nombre, idioma predeterminado español (España), app,
      gratis. **Gratis no se puede cambiar a de pago después.**
- [ ] Rellenar «Contenido de la app» con [data-safety.md](data-safety.md): política de privacidad,
      anuncios, acceso a la app, público objetivo 13+, clasificación IARC, Seguridad de los datos y el
      resto de declaraciones.
- [ ] Rellenar la ficha con [store-listing.md](store-listing.md) y los recursos de
      [store-assets.md](store-assets.md). Añadir la traducción al inglés.
- [ ] Primer build: `eas build --platform android --profile production`.
- [ ] Primera subida: `eas submit --platform android --profile production` (crea la versión en el
      track interno como borrador). Prueba interna para ti antes de abrir la cerrada.
- [ ] Prueba cerrada: crear el track, subir el mismo build y añadir **al menos 12 testers** (lista de
      emails o un grupo de Google). Tienen que aceptar la invitación y seguir dentro **14 días
      seguidos**: quien se sale y vuelve reinicia su cuenta.
- [ ] Reunir a los 12 con margen (14–15 personas) por si alguien se sale.
- [ ] Atender lo que salga en la prueba con builds nuevos (cada uno sube el `versionCode` solo).
- [ ] Pasados los 14 días: Panel › **Solicitar acceso a producción**. Google pregunta cómo fue la
      prueba; la revisión suele tardar hasta 7 días.

## 6. Producción

- [ ] Versión de producción con el build probado, notas de la versión en es y en.
- [ ] Países: todos, o empezar por España y países de habla inglesa.
- [ ] Lanzamiento escalonado opcional (p. ej. 20 % y luego 100 %).
- [ ] Revisión de Google: de horas a varios días en la primera publicación.
- [ ] Marcar en docs/ROADMAP.md las tareas de la fase 4 y anunciarlo (LinkedIn, GitHub).

## Fuera de esta lista

- Tareas visuales que el roadmap pide antes del lanzamiento: nombre, icono y splash definitivos
  (`expo-splash-screen` aún con el `#208AEF` de la plantilla), capturas, landing (issue #12).
- iOS / TestFlight: decisión pendiente en el roadmap. Si se decide, hace falta otra checklist (cuenta
  de Apple con cuota anual, App Privacy, share extension).
