import { type IconName, opacity, radius, touchTarget } from "@ar-darwin/ui";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "./Icon";

type IconButtonProps = {
  icon: IconName;
  /** Accessible name: icon buttons have no visible text. */
  label: string;
  /** Toggle buttons pass their state; the icon redraws itself each time it turns on. */
  pressed?: boolean;
  /** Mirrors the glyph (e.g. rotate counter-clockwise from the clockwise arrow). */
  flipGlyph?: boolean;
  /** Draws on the dark camera pill instead of the theme surface. */
  tone?: "theme" | "camera";
  disabled?: boolean;
  onPress?: () => void;
  /** Touch-down and release, for hold-to-repeat (Stepper). */
  onPressIn?: () => void;
  onPressOut?: () => void;
  accessibilityHint?: string;
};

/** 48 px icon button. Active toggles take the accent and redraw their icon («trazo vivo»). */
export function IconButton({
  icon,
  label,
  pressed,
  flipGlyph,
  tone = "theme",
  disabled = false,
  onPress,
  onPressIn,
  onPressOut,
  accessibilityHint,
}: IconButtonProps) {
  const { theme } = useTheme();
  const [drawKey, setDrawKey] = useState(0);
  const c = theme.color;
  const on = pressed === true;

  const ink = tone === "camera" ? c.camera.text : c.text.primary;
  const glyph =
    tone === "camera"
      ? on
        ? c.camera.accent
        : c.camera.text
      : on
        ? c.accent.default
        : c.text.primary;

  return (
    <Pressable
      accessibilityRole={pressed === undefined ? "button" : "togglebutton"}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, checked: pressed }}
      disabled={disabled}
      onPress={() => {
        if (pressed === false) setDrawKey((k) => k + 1);
        onPress?.();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.button, disabled && styles.disabled]}
    >
      {({ pressed: touching }) => (
        <>
          {on && tone === "theme" && (
            <View style={[styles.fill, { backgroundColor: c.accent.subtle }]} />
          )}
          {on && tone === "camera" && (
            <View
              style={[
                styles.fill,
                { backgroundColor: c.camera.accent, opacity: opacity.pressFill },
              ]}
            />
          )}
          {touching && !on && (
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: ink,
                  opacity: tone === "camera" ? opacity.pressFill : opacity.ink,
                },
              ]}
            />
          )}
          <Icon name={icon} color={glyph} drawKey={drawKey} flip={flipGlyph} />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, borderRadius: radius.pill },
  disabled: { opacity: opacity.disabled },
});
