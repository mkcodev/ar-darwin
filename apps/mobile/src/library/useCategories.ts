import type { Category } from "@ar-darwin/core";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { listCategories } from "../storage/projectRepository";

/**
 * The categories, in their order, read once per mount: the library only assigns them (creating
 * your own is a later task), so they do not change while it is open. Empty until loaded or if the
 * read fails; the cards then show no category and the filter offers none.
 */
export function useCategories(): readonly Category[] {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<readonly Category[]>([]);
  useEffect(() => {
    let alive = true;
    listCategories(db)
      .then((list) => {
        if (alive) setCategories(list);
      })
      .catch((error: unknown) => console.warn("useCategories: could not list categories", error));
    return () => {
      alive = false;
    };
  }, [db]);
  return categories;
}
