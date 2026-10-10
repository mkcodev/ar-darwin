import { DEFAULT_CATEGORY_IDS, DEFAULT_CATEGORY_STYLES, defaultCategoryKey } from "@ar-darwin/core";
import { themes } from "@ar-darwin/ui";
import { Icon } from "../../components/Icon";
import { t } from "../../i18n";

const SIZES = [48, 24] as const;

/**
 * The six built-in category icons at 48 and 24 px, in their colour, on both themes at once
 * (whatever the active one is), to judge the stroke at real size.
 */
export function CategoryIconSheet() {
  return (
    <div className="category-sheet">
      {Object.values(themes).map((theme) => (
        <section
          key={theme.name}
          className="category-sheet-theme"
          style={{ background: theme.color.bg.canvas, color: theme.color.text.muted }}
          aria-label={t(`playground.theme.${theme.name}`)}
        >
          <span className="category-sheet-title">{t(`playground.theme.${theme.name}`)}</span>
          {SIZES.map((size) => (
            <ul key={size} className="category-sheet-row">
              {DEFAULT_CATEGORY_IDS.map((id) => {
                const style = DEFAULT_CATEGORY_STYLES[id];
                return (
                  <li key={id} style={{ color: theme.color.category[style.color] }}>
                    <Icon name={style.icon} size={size} label={t(defaultCategoryKey(id))} />
                  </li>
                );
              })}
              <li className="value-text category-sheet-size">
                {t("playground.sections.categoryIconsSize", { size })}
              </li>
            </ul>
          ))}
        </section>
      ))}
    </div>
  );
}
