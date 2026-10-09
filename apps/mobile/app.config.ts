import { en, es } from "@ar-darwin/i18n";
import type { ConfigContext, ExpoConfig } from "expo/config";

/** Set by eas.json's "development" build profile; anything else is production. */
const isDev = process.env.APP_VARIANT === "development";

// Adaptive icon background colors, copied from packages/ui/src/primitives.ts (not imported:
// app.config.ts runs on plain Node, and that package's barrel needs a bundler to resolve its
// extensionless imports). The foreground mark's own color lives baked into each PNG instead
// (android-icon-foreground(-dev).png), generated from packages/ui's logoMark.
/** vermilion[500]: flags the dev build's icon. */
const DEV_ICON_BACKGROUND = "#FF5A1F";
/** graphite[950]: the app's actual dark theme, for the production icon. */
const PROD_ICON_BACKGROUND = "#161614";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isDev ? "AR-Darwin Dev" : "AR-Darwin",
  slug: "ar-darwin",
  version: "1.0.0",
  orientation: "portrait",
  icon: isDev ? "./assets/images/icon-dev.png" : "./assets/images/icon.png",
  scheme: "ardarwin",
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/expo.icon",
    bundleIdentifier: isDev ? "com.mkcodev.ardarwin.dev" : "com.mkcodev.ardarwin",
    infoPlist: {
      NSCameraUsageDescription: es.permissions.camera,
    },
  },
  locales: {
    es: { ios: { NSCameraUsageDescription: es.permissions.camera } },
    en: { ios: { NSCameraUsageDescription: en.permissions.camera } },
  },
  android: {
    package: isDev ? "com.mkcodev.ardarwin.dev" : "com.mkcodev.ardarwin",
    adaptiveIcon: {
      backgroundColor: isDev ? DEV_ICON_BACKGROUND : PROD_ICON_BACKGROUND,
      foregroundImage: isDev
        ? "./assets/images/android-icon-foreground-dev.png"
        : "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    permissions: ["android.permission.CAMERA"],
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
    "expo-localization",
    [
      "expo-image-picker",
      {
        photosPermission: es.permissions.photos,
        cameraPermission: es.permissions.camera,
        microphonePermission: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      // From `eas init`: https://expo.dev/accounts/mkcodev/projects/ar-darwin
      projectId: "ebd09f80-abcc-4262-98a0-1f78b853323f",
    },
  },
});
