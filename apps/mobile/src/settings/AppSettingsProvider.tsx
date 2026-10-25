import {
  DEFAULT_MAGNET_ENABLED,
  parseBooleanSetting,
  SETTING_KEYS,
  serializeBoolean,
} from "@ar-darwin/core";
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
import { getSetting, setSetting } from "../storage/settingsRepository";

type AppSettings = {
  /** The camera's magnet (guides and haptics). On until the stored value says otherwise. */
  magnetEnabled: boolean;
  setMagnetEnabled: (enabled: boolean) => void;
};

const AppSettingsContext = createContext<AppSettings | null>(null);

type AppSettingsProviderProps = { children: ReactNode };

/**
 * Preferences stored in SQLite. Inside `SQLiteProvider`, which has already migrated the database.
 *
 * Nothing waits for the read: the defaults apply right away and the stored values land when they
 * arrive, so the camera never opens late. A change made by the person before the read finishes
 * wins (`touched`): the late read must not put the old value back. A failed read or write keeps
 * the value in memory and never throws into the UI.
 */
export function AppSettingsProvider({ children }: AppSettingsProviderProps) {
  const db = useSQLiteContext();
  const [magnetEnabled, setMagnetState] = useState(DEFAULT_MAGNET_ENABLED);
  const touched = useRef(false);

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

  const value = useMemo<AppSettings>(
    () => ({
      magnetEnabled,
      setMagnetEnabled: (enabled) => {
        touched.current = true;
        setMagnetState(enabled);
        setSetting(db, SETTING_KEYS.magnetEnabled, serializeBoolean(enabled)).catch(
          (error: unknown) => {
            if (__DEV__) console.warn("[settings] write failed", error);
          },
        );
      },
    }),
    [db, magnetEnabled],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettings {
  const settings = useContext(AppSettingsContext);
  if (!settings) throw new Error("useAppSettings must be used inside AppSettingsProvider");
  return settings;
}
