import {
  DEFAULT_MAGNET_ENABLED,
  DEFAULT_ONBOARDING_DONE,
  parseBooleanSetting,
  parseChoiceSetting,
  SETTING_KEYS,
  serializeBoolean,
} from "@ar-darwin/core";
import {
  DEFAULT_LANGUAGE_PREFERENCE,
  LANGUAGE_PREFERENCES,
  type LanguagePreference,
} from "@ar-darwin/i18n";
import {
  DEFAULT_HANDEDNESS,
  DEFAULT_THEME_PREFERENCE,
  type Handedness,
  type ThemePreference,
} from "@ar-darwin/ui";
import { SplashScreen } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { applyLocale, getLocale, localeFor } from "../i18n";
import { getSetting, setSetting } from "../storage/settingsRepository";
import { useHandedness } from "../theme/HandednessProvider";
import { useTheme } from "../theme/ThemeProvider";

const HANDS = ["right", "left"] as const satisfies readonly Handedness[];
const THEMES = ["system", "light", "dark"] as const satisfies readonly ThemePreference[];

type AppSettings = {
  /** The camera's magnet (guides and haptics). On until the stored value says otherwise. */
  magnetEnabled: boolean;
  setMagnetEnabled: (enabled: boolean) => void;
  /** The hand that holds the pencil. */
  drawingHand: Handedness;
  /** Saves the hand that holds the pencil and applies it (`useHandedness`) at once. */
  setDrawingHand: (hand: Handedness) => void;
  themePreference: ThemePreference;
  /** Saves the theme and applies it (`useTheme`) at once. */
  setThemePreference: (preference: ThemePreference) => void;
  languagePreference: LanguagePreference;
  /** Saves the language. It applies on the next start: see `languageNeedsRestart`. */
  setLanguagePreference: (preference: LanguagePreference) => void;
  /** The saved language is not the one this run uses. */
  languageNeedsRestart: boolean;
  /** The first-run introduction was finished or skipped. */
  onboardingDone: boolean;
  /** Saves that the introduction was seen: the Library stops redirecting to it. */
  finishOnboarding: () => void;
};

const AppSettingsContext = createContext<AppSettings | null>(null);

type AppSettingsProviderProps = { children: ReactNode };

type StoredSettings = {
  hand: Handedness;
  theme: ThemePreference;
  language: LanguagePreference;
  onboardingDone: boolean;
};

function logWriteFailed(error: unknown): void {
  if (__DEV__) console.warn("[settings] write failed", error);
}

/**
 * Preferences stored in SQLite. Inside `SQLiteProvider`, which has already migrated the database.
 *
 * The magnet does not wait for its read: the default applies right away and the stored value lands
 * when it arrives, so the camera never opens late. A change made by the person before the read
 * finishes wins (`touched`): the late read must not put the old value back. A failed read or write
 * keeps the value in memory and never throws into the UI.
 *
 * The drawing hand, the theme and the language do wait: `children` (the whole stack, camera
 * included) are not rendered until their read is over, and the three are applied in that same
 * step, so the first frame already has the camera menu on its side, the right theme and the right
 * texts, and nothing jumps when the app opens. The native splash stays until then (it is hidden
 * here, not in the root layout). It is a local SQLite read; if it fails the defaults stay and the
 * app opens anyway.
 *
 * The onboarding flag is read in the same step, so a fresh install goes to the introduction without
 * showing the Library first. The language is applied once (`applyLocale`): a change made in Settings is only saved, and takes
 * effect on the next start.
 */
export function AppSettingsProvider({ children }: AppSettingsProviderProps) {
  const db = useSQLiteContext();
  const { hand, setHand } = useHandedness();
  const { preference: themePreference, setPreference: setTheme } = useTheme();
  const setHandRef = useRef(setHand);
  setHandRef.current = setHand;
  const setThemeRef = useRef(setTheme);
  setThemeRef.current = setTheme;
  const [magnetEnabled, setMagnetState] = useState(DEFAULT_MAGNET_ENABLED);
  const [languagePreference, setLanguageState] = useState<LanguagePreference>(
    DEFAULT_LANGUAGE_PREFERENCE,
  );
  const [onboardingDone, setOnboardingDone] = useState(DEFAULT_ONBOARDING_DONE);
  const [ready, setReady] = useState(false);
  const touched = useRef(false);
  const handTouched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: StoredSettings | null = null;
      try {
        const [rawHand, rawTheme, rawLanguage, rawOnboarding] = await Promise.all([
          getSetting(db, SETTING_KEYS.drawingHand),
          getSetting(db, SETTING_KEYS.themePreference),
          getSetting(db, SETTING_KEYS.language),
          getSetting(db, SETTING_KEYS.onboardingDone),
        ]);
        stored = {
          hand: parseChoiceSetting(rawHand, HANDS, DEFAULT_HANDEDNESS),
          theme: parseChoiceSetting(rawTheme, THEMES, DEFAULT_THEME_PREFERENCE),
          language: parseChoiceSetting(
            rawLanguage,
            LANGUAGE_PREFERENCES,
            DEFAULT_LANGUAGE_PREFERENCE,
          ),
          onboardingDone: parseBooleanSetting(rawOnboarding, DEFAULT_ONBOARDING_DONE),
        };
      } catch (error: unknown) {
        if (__DEV__) console.warn("[settings] read failed", error);
      }
      if (cancelled) return;
      // All the updates in one step: the first render of the children already has them.
      if (stored !== null) {
        if (!handTouched.current) setHandRef.current(stored.hand);
        setThemeRef.current(stored.theme);
        applyLocale(stored.language);
        setLanguageState(stored.language);
        setOnboardingDone(stored.onboardingDone);
      } else {
        // The read failed: do not trap the person in an introduction that cannot be saved as seen.
        setOnboardingDone(true);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    getSetting(db, SETTING_KEYS.magnetEnabled)
      .then((raw) => {
        if (cancelled || touched.current) return;
        setMagnetState(parseBooleanSetting(raw, DEFAULT_MAGNET_ENABLED));
      })
      .catch((error: unknown) => {
        if (__DEV__) console.warn("[settings] read failed", error);
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

  // The stack is on screen from the next frame: the splash can go.
  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  const value = useMemo<AppSettings>(
    () => ({
      magnetEnabled,
      setMagnetEnabled: (enabled) => {
        touched.current = true;
        setMagnetState(enabled);
        setSetting(db, SETTING_KEYS.magnetEnabled, serializeBoolean(enabled)).catch(logWriteFailed);
      },
      drawingHand: hand,
      setDrawingHand: (next) => {
        handTouched.current = true;
        setHandRef.current(next);
        setSetting(db, SETTING_KEYS.drawingHand, next).catch(logWriteFailed);
      },
      themePreference,
      setThemePreference: (next) => {
        setThemeRef.current(next);
        setSetting(db, SETTING_KEYS.themePreference, next).catch(logWriteFailed);
      },
      languagePreference,
      setLanguagePreference: (next) => {
        setLanguageState(next);
        setSetting(db, SETTING_KEYS.language, next).catch(logWriteFailed);
      },
      languageNeedsRestart: localeFor(languagePreference) !== getLocale(),
      onboardingDone,
      finishOnboarding: () => {
        setOnboardingDone(true);
        setSetting(db, SETTING_KEYS.onboardingDone, serializeBoolean(true)).catch(logWriteFailed);
      },
    }),
    [db, magnetEnabled, hand, themePreference, languagePreference, onboardingDone],
  );

  // Nothing mounts before the stored settings are known (the splash covers the wait).
  if (!ready) return null;
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettings {
  const settings = useContext(AppSettingsContext);
  if (!settings) throw new Error("useAppSettings must be used inside AppSettingsProvider");
  return settings;
}
