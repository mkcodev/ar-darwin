import { duration, easing, spring, stagger } from "@ar-darwin/ui";
import { t } from "../../i18n";
import { EasingCard } from "./EasingCard";
import { SpringCard } from "./SpringCard";

const maxMs = Math.max(...Object.values(duration).map((d) => d.ms));

/** Durations, easings and springs of packages/ui, each with its reduced-motion equivalent. */
export function MotionTokens() {
  return (
    <div className="token-block">
      <h3 className="token-title">{t("tokens.motion.durations")}</h3>
      <ul className="duration-list">
        {Object.entries(duration).map(([name, d]) => (
          <li key={name}>
            <code>{name}</code>
            <span className="duration-bar" style={{ width: `${(d.ms / maxMs) * 100}%` }} />
            <span className="value-text">
              {t("tokens.motion.durationItem", { ms: d.ms })} ·{" "}
              {t(`tokens.motion.reduced.${d.reduced.kind}`)}
            </span>
          </li>
        ))}
      </ul>
      <p className="pg-note">{t("tokens.motion.stagger", { ms: stagger })}</p>
      <h3 className="token-title">{t("tokens.motion.springs")}</h3>
      <div className="curve-grid">
        {Object.entries(spring).map(([name, token]) => (
          <SpringCard key={name} name={name} token={token} />
        ))}
      </div>
      <h3 className="token-title">{t("tokens.motion.easings")}</h3>
      <div className="curve-grid">
        {Object.entries(easing).map(([name, e]) => (
          <EasingCard key={name} name={name} easing={e} />
        ))}
      </div>
    </div>
  );
}
