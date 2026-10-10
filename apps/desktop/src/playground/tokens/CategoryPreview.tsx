import { DEFAULT_CATEGORY_IDS, DEFAULT_CATEGORY_STYLES, defaultCategoryKey } from "@ar-darwin/core";
import type { Theme } from "@ar-darwin/ui";
import { Icon } from "../../components/Icon";
import { t } from "../../i18n";

type CategoryPreviewProps = { theme: Theme };

/** The built-in categories as the app shows them: icon stroked in its colour, next to the name. */
export function CategoryPreview({ theme }: CategoryPreviewProps) {
  return (
    <ul className="category-preview">
      {DEFAULT_CATEGORY_IDS.map((id) => {
        const style = DEFAULT_CATEGORY_STYLES[id];
        return (
          <li key={id} className="category-chip">
            <span style={{ color: theme.color.category[style.color] }}>
              <Icon name={style.icon} />
            </span>
            <span>{t(defaultCategoryKey(id))}</span>
            <code className="value-text" translate="no">
              {style.color}
            </code>
          </li>
        );
      })}
    </ul>
  );
}
