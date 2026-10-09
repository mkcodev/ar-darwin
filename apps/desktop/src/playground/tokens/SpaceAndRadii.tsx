import { radius, space } from "@ar-darwin/ui";
import { t } from "../../i18n";

/** Base-4 spacing as bars and the radius hierarchy as boxes. */
export function SpaceAndRadii() {
  return (
    <div className="token-block token-grid-2">
      <div>
        <h3 className="token-title">{t("tokens.space.title")}</h3>
        <ul className="space-list">
          {Object.entries(space).map(([k, v]) => (
            <li key={k}>
              <span className="value-text space-name">
                {t("tokens.space.item", { key: k, px: v })}
              </span>
              <span className="space-bar" style={{ width: v }} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="token-title">{t("tokens.radius.title")}</h3>
        <ul className="radius-list">
          {Object.entries(radius)
            .filter(([k]) => k !== "none")
            .map(([k, v]) => (
              <li key={k}>
                <span className="radius-box" style={{ borderRadius: v }} />
                <span className="value-text">{t("tokens.radius.item", { key: k, px: v })}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
