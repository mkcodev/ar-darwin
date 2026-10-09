import type { IconName } from "@ar-darwin/ui";
import { type ButtonHTMLAttributes, useState } from "react";
import { Icon } from "./Icon";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: IconName;
  /** Accessible name: icon buttons have no visible text. */
  label: string;
  /** Toggle buttons pass their state; the icon redraws itself each time it turns on. */
  pressed?: boolean;
  /** Mirrors the glyph (e.g. rotate counter-clockwise from the clockwise arrow). */
  flipGlyph?: boolean;
  /** Draws on the dark camera pill instead of the theme surface. */
  tone?: "theme" | "camera";
};

/** 48 px icon button. Active toggles take the accent and redraw their icon («trazo vivo»). */
export function IconButton({
  icon,
  label,
  pressed,
  flipGlyph,
  tone = "theme",
  className,
  onClick,
  type = "button",
  ...rest
}: IconButtonProps) {
  const [drawKey, setDrawKey] = useState(0);
  return (
    <button
      type={type}
      className={`icon-btn icon-btn-${tone}${className ? ` ${className}` : ""}`}
      aria-label={label}
      aria-pressed={pressed}
      onClick={(e) => {
        if (pressed === false) setDrawKey((k) => k + 1);
        onClick?.(e);
      }}
      {...rest}
    >
      <span className={flipGlyph ? "glyph-flip" : undefined}>
        <Icon name={icon} drawKey={drawKey} />
      </span>
    </button>
  );
}
