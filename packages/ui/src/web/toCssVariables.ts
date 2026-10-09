import { icon } from "../icons";
import { opacity, radius, space, touchTarget, zIndex } from "../layout";
import { duration, easing, toCssEasing } from "../motion";
import type { ColorTokens, Theme } from "../themes";
import { fonts, typography } from "../typography";

export type CssVariables = Record<`--${string}`, string>;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

function flatten(node: unknown, prefix: string, out: CssVariables): void {
  if (typeof node === "string") {
    out[`--${prefix}`] = node;
    return;
  }
  if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      // "default" is the bare token: accent.default -> --color-accent
      const name = key === "default" ? prefix : `${prefix}-${kebab(key)}`;
      flatten(value, name, out);
    }
  }
}

/**
 * Theme colours as CSS custom properties: `bg.canvas` -> `--color-bg-canvas`,
 * `accent.default` -> `--color-accent`, `camera.pillEdge` -> `--color-camera-pill-edge`.
 */
export function toCssVariables(theme: Theme): CssVariables {
  const out: CssVariables = {};
  flatten(theme.color satisfies ColorTokens, "color", out);
  return out;
}

/**
 * Theme-independent tokens as CSS custom properties: `--space-4`, `--radius-pill`,
 * `--duration-micro`, `--easing-draw`, `--font-ui`, `--type-value-size`, `--z-sheet`…
 */
export function toCssTokenVariables(): CssVariables {
  const out: CssVariables = {};
  for (const [k, v] of Object.entries(space)) out[`--space-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(radius)) out[`--radius-${kebab(k)}`] = `${v}px`;
  for (const [k, v] of Object.entries(duration)) out[`--duration-${k}`] = `${v.ms}ms`;
  for (const [k, v] of Object.entries(easing)) out[`--easing-${k}`] = toCssEasing(v);
  for (const [k, v] of Object.entries(zIndex)) out[`--z-${k}`] = String(v);
  for (const [k, v] of Object.entries(opacity)) out[`--opacity-${kebab(k)}`] = String(v);
  for (const [k, v] of Object.entries(fonts)) out[`--font-${k}`] = v.web;
  for (const [k, role] of Object.entries(typography)) {
    out[`--type-${k}-family`] = fonts[role.font].web;
    out[`--type-${k}-style`] = fonts[role.font].italic ? "italic" : "normal";
    out[`--type-${k}-weight`] = String(role.weight);
    out[`--type-${k}-size`] = `${role.size}px`;
    out[`--type-${k}-line`] = `${role.lineHeight}px`;
    out[`--type-${k}-tracking`] = `${role.letterSpacing}px`;
    out[`--type-${k}-numeric`] = role.tabularNums ? "tabular-nums" : "normal";
  }
  out["--touch-target"] = `${touchTarget}px`;
  out["--icon-stroke"] = String(icon.stroke);
  return out;
}
