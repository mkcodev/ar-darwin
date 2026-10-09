import { en, es } from "@ar-darwin/i18n";
import type { ConfigContext, ExpoConfig } from "expo/config";

/** Set by eas.json's "development" build profile; anything else is production. */
const isDev = process.env.APP_VARIANT === "development";

/** vermilion[500] (packages/ui/src/primitives.ts): accent color, used here to flag the dev build's icon. */
const DEV_ICON_BACKGROUND = "#FF5A1F";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isDev ? "AR-Darwin Dev" : "AR-Darwin",
  slug: "ar-darwin",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
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
      backgroundColor: isDev ? DEV_ICON_BACKGROUND : "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
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
      // Set by `eas init`.
      projectId: config.extra?.eas?.projectId,
    },
  },
});
