import {
  DEFAULT_MAGNET_ENABLED,
  parseBooleanSetting,
  parseChoiceSetting,
  SETTING_KEYS,
  serializeBoolean,
} from "@ar-darwin/core";
import { DEFAULT_HANDEDNESS, type Handedness } from "@ar-darwin/ui";
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
import { useHandedness } from "../theme/HandednessProvider";

const HANDS = ["right", "left"] as const satisfies readonly Handedness[];

type AppSettings = {
  /** The camera's magnet (guides and haptics). On until the stored value says otherwise. */
  magnetEnabled: boolean;
  setMagnetEnabled: (enabled: boolean) => void;
  /** Saves the hand that holds the pencil and applies it (`useHandedness`) at once. */
  setDrawingHand: (hand: Handedness) => void;
};

const AppSettingsContext = createContext<AppSettings | null>(null);

type AppSettingsProviderProps = { children: ReactNode };

/**
 * Preferences stored in SQLite. Inside `SQLiteProvider`, which has already migrated the database.
 *
 * The magnet does not wait for its read: the default applies right away and the stored value lands
 * when it arrives, so the camera never opens late. A change made by the person before the read
 * finishes wins (`touched`): the late read must not put the old value back. A failed read or write
 * keeps the value in memory and never throws into the UI.
 *
 * The drawing hand does wait: `children` (the whole stack, camera included) are not rendered until
 * its read is over, and the stored hand is applied in that same step, so the first frame already
 * has the camera menu on the right side and it never jumps when the app opens. It is a local
 * SQLite read; if it fails the default hand stays and the app opens anyway.
 */
export function AppSettingsProvider({ children }: AppSettingsProviderProps) {
  const db = useSQLiteContext();
  const { setHand } = useHandedness();
  const setHandRef = useRef(setHand);
  setHandRef.current = setHand;
  const [magnetEnabled, setMagnetState] = useState(DEFAULT_MAGNET_ENABLED);
  const [handReady, setHandReady] = useState(false);
  const touched = useRef(false);
  const handTouched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let hand: Handedness | null = null;
      try {
        const raw = await getSetting(db, SETTING_KEYS.drawingHand);
        hand = parseChoiceSetting(raw, HANDS, DEFAULT_HANDEDNESS);
      } catch (error: unknown) {
        if (__DEV__) console.warn("[settings] read failed", error);
      }
      if (cancelled) return;
      // Both updates in one step: the first render of the children already has the right hand.
      if (hand !== null && !handTouched.current) setHandRef.current(hand);
      setHandReady(true);
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
      setDrawingHand: (hand) => {
        handTouched.current = true;
        setHandRef.current(hand);
        setSetting(db, SETTING_KEYS.drawingHand, hand).catch((error: unknown) => {
          if (__DEV__) console.warn("[settings] write failed", error);
        });
      },
    }),
    [db, magnetEnabled],
  );

  // Nothing mounts before the stored hand is known (the root view behind already paints the canvas).
  if (!handReady) return null;
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettings {
  const settings = useContext(AppSettingsContext);
  if (!settings) throw new Error("useAppSettings must be used inside AppSettingsProvider");
  return settings;
}
