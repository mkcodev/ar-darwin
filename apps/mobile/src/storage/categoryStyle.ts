import { type Category, DEFAULT_CATEGORY_STYLES, type DefaultCategoryId } from "@ar-darwin/core";
import {
  type CategoryColorKey,
  type IconName,
  isCategoryColorKey,
  isIconName,
  type Theme,
} from "@ar-darwin/ui";

// packages/core writes these keys with migration 2 but cannot import packages/ui: this line stops
// `pnpm typecheck` if the migration names a colour or icon that packages/ui does not have.
DEFAULT_CATEGORY_STYLES satisfies Record<
  DefaultCategoryId,
  { color: CategoryColorKey; icon: IconName }
>;

export type CategoryStyle = { color: string; icon: IconName };

/**
 * Colour (resolved for the active theme) and icon of a category. The stored values are keys,
 * never hex; anything unknown (an older or newer palette) falls back to muted text and `image`.
 * The colour never goes alone: draw it as the icon's stroke or next to the category's name.
 */
export function categoryStyle(category: Category, theme: Theme): CategoryStyle {
  const { color, icon } = category;
  return {
    color:
      color !== undefined && isCategoryColorKey(color)
        ? theme.color.category[color]
        : theme.color.text.muted,
    icon: icon !== undefined && isIconName(icon) ? icon : "image",
  };
}
