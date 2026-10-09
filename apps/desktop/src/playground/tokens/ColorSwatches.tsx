import { contrastRatio, MIN_CONTRAST, parseColor, type Theme } from "@ar-darwin/ui";
import { t } from "../../i18n";

type ColorSwatchesProps = { theme: Theme };

type Swatch = { name: string; value: string; ratio?: number; min?: number };

const fmt = (r: number) => t("common.ratio", { value: r.toFixed(1) });

/** Semantic colours of the active theme, with the contrast each one must reach. */
export function ColorSwatches({ theme }: ColorSwatchesProps) {
  const c = theme.color;
  const canvas = c.bg.canvas;
  const ui: Swatch[] = [
    { name: "bg.canvas", value: c.bg.canvas },
    { name: "bg.surface", value: c.bg.surface },
    { name: "bg.raised", value: c.bg.raised },
    { name: "bg.overlay", value: c.bg.overlay },
    { name: "border.subtle", value: c.border.subtle },
    { name: "border.strong", value: c.border.strong },
    {
      name: "text.primary",
      value: c.text.primary,
      ratio: contrastRatio(c.text.primary, canvas),
      min: MIN_CONTRAST.text,
    },
    {
      name: "text.muted",
      value: c.text.muted,
      ratio: contrastRatio(c.text.muted, canvas),
      min: MIN_CONTRAST.text,
    },
    {
      name: "accent",
      value: c.accent.default,
      ratio: contrastRatio(c.accent.default, canvas),
      min: MIN_CONTRAST.nonText,
    },
    {
      name: "accent.pressed",
      value: c.accent.pressed,
      ratio: contrastRatio(c.accent.pressed, canvas),
      min: MIN_CONTRAST.nonText,
    },
    {
      name: "text.onAccent",
      value: c.text.onAccent,
      ratio: contrastRatio(c.text.onAccent, c.accent.default),
      min: MIN_CONTRAST.text,
    },
    {
      name: "guide",
      value: c.guide.default,
      ratio: contrastRatio(c.guide.default, canvas),
      min: MIN_CONTRAST.nonText,
    },
    { name: "guide.tint", value: c.guide.tint },
    {
      name: "danger",
      value: c.danger,
      ratio: contrastRatio(c.danger, canvas),
      min: MIN_CONTRAST.text,
    },
    {
      name: "focus",
      value: c.focus,
      ratio: contrastRatio(c.focus, canvas),
      min: MIN_CONTRAST.nonText,
    },
  ];
  const camera: Swatch[] = Object.entries(c.camera).map(([k, v]) => ({
    name: `camera.${k}`,
    value: v,
  }));

  const render = (s: Swatch) => {
    const translucent = parseColor(s.value).a < 1;
    const pass = s.ratio !== undefined && s.min !== undefined ? s.ratio >= s.min : undefined;
    return (
      <li key={s.name} className="swatch">
        <span className={`swatch-chip${translucent ? " swatch-chip-checker" : ""}`}>
          <i style={{ background: s.value }} />
        </span>
        <code className="swatch-name">{s.name}</code>
        <span className="value-text swatch-value">{s.value}</span>
        {s.ratio !== undefined && (
          <span className="value-text swatch-ratio" data-pass={pass}>
            {fmt(s.ratio)}
            {pass === false && ` · ${t("tokens.color.fail")}`}
          </span>
        )}
      </li>
    );
  };

  return (
    <div className="token-block">
      <h3 className="token-title">{t("tokens.color.ui")}</h3>
      <ul className="swatches">{ui.map(render)}</ul>
      <h3 className="token-title">{t("tokens.color.camera")}</h3>
      <p className="pg-note">{t("tokens.color.cameraNote")}</p>
      <ul className="swatches swatches-camera">{camera.map(render)}</ul>
    </div>
  );
}
