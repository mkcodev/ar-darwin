import { type TypeRoleName, toWebTextStyle, typography } from "@ar-darwin/ui";
import { t } from "../../i18n";

const roles = Object.keys(typography) as TypeRoleName[];

/** The five type roles with real samples; `value` shows tabular figures lining up. */
export function TypeScale() {
  return (
    <div className="token-block">
      <ul className="type-scale">
        {roles.map((role) => {
          const r = typography[role];
          return (
            <li key={role} className="type-row">
              <span className="value-text type-meta">
                {t("tokens.type.meta", {
                  role,
                  size: r.size,
                  line: r.lineHeight,
                  weight: r.weight,
                })}
              </span>
              <span style={toWebTextStyle(r)}>{t(`tokens.type.sample.${role}`)}</span>
            </li>
          );
        })}
      </ul>
      <div className="tabular-demo" style={toWebTextStyle(typography.value)}>
        {[
          t("common.px", { value: 111 }),
          t("common.percent", { value: 11 }),
          t("common.px", { value: 808 }),
          t("common.percent", { value: 88 }),
        ].map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>
    </div>
  );
}
