import {
  type Category,
  DEFAULT_CATEGORY_IDS,
  type DefaultCategoryId,
  defaultCategoryKey,
} from "@ar-darwin/core";
import { t } from "../i18n";

function isDefaultCategoryId(id: string): id is DefaultCategoryId {
  return (DEFAULT_CATEGORY_IDS as readonly string[]).includes(id);
}

/**
 * Name to show for a category. Built-in ones are translated: `t(defaultCategoryKey(id))` only
 * typechecks while packages/i18n has a `categories.<id>` key for every DEFAULT_CATEGORY_IDS entry,
 * so a seeded category can never show a raw key.
 */
export function categoryLabel(category: Category): string {
  if (category.name !== undefined) return category.name;
  if (isDefaultCategoryId(category.id)) return t(defaultCategoryKey(category.id));
  return category.key ?? category.id;
}
