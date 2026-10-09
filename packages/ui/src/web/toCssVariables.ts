import type { ColorTokens, Theme } from "../themes";

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
