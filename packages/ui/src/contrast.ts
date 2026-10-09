export type Rgba = { r: number; g: number; b: number; a: number };

/** Parses "#RRGGBB" or "rgba(r, g, b, a)" / "rgb(r, g, b)". Throws on anything else. */
export function parseColor(color: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex?.[1]) {
    const h = hex[1];
    return {
      r: Number.parseInt(h.slice(0, 2), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      b: Number.parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(color);
  if (fn?.[1]) {
    const parts = fn[1].split(",").map((p) => Number(p.trim()));
    const [r, g, b, a = 1] = parts;
    if (parts.length >= 3 && [r, g, b, a].every((n) => Number.isFinite(n))) {
      return { r: r ?? 0, g: g ?? 0, b: b ?? 0, a };
    }
  }
  throw new Error(`parseColor: unsupported colour "${color}"`);
}

const toRgba = (c: string | Rgba): Rgba => (typeof c === "string" ? parseColor(c) : c);

/** Composites a (possibly translucent) colour over an opaque background. */
export function blendOver(fg: string | Rgba, bg: string | Rgba): Rgba {
  const f = toRgba(fg);
  const b = toRgba(bg);
  const a = f.a;
  return {
    r: f.r * a + b.r * (1 - a),
    g: f.g * a + b.g * (1 - a),
    b: f.b * a + b.b * (1 - a),
    a: 1,
  };
}

/** WCAG 2 relative luminance of an opaque colour. */
export function relativeLuminance(color: string | Rgba): number {
  const c = toRgba(color);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/**
 * WCAG contrast ratio (1..21). A translucent background is first composited over black; a
 * translucent foreground is composited over the background.
 */
export function contrastRatio(fg: string | Rgba, bg: string | Rgba): number {
  const base = blendOver(bg, { r: 0, g: 0, b: 0, a: 1 });
  const top = blendOver(fg, base);
  const l1 = relativeLuminance(top);
  const l2 = relativeLuminance(base);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** WCAG thresholds used across the design system. */
export const MIN_CONTRAST = {
  /** Body text and labels. */
  text: 4.5,
  /** Large text (≥ 24 px, or ≥ 18.66 px bold), icons, guides, focus rings and control edges. */
  nonText: 3,
} as const;
