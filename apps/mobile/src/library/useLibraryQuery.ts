import {
  EMPTY_LIBRARY_FILTER,
  type LibraryFilter,
  type LibrarySort,
  type LibraryView,
  libraryView,
  type Project,
} from "@ar-darwin/core";
import { useMemo, useState } from "react";
import { getLocale } from "../i18n";

export type LibraryQuery = {
  filter: LibraryFilter;
  sort: LibrarySort;
  setFilter: (filter: LibraryFilter) => void;
  setSort: (sort: LibrarySort) => void;
  /** The featured card and the grid for the current filter and order (see core `libraryView`). */
  view: LibraryView<Project>;
};

/**
 * Search, filters and order of the library, kept in memory for this run (they reset on the next
 * start). Names sort with the app language's collator: accents and case do not split «Árbol» from
 * «arce», and «Lámina 10» goes after «Lámina 9».
 */
export function useLibraryQuery(projects: readonly Project[]): LibraryQuery {
  const [filter, setFilter] = useState<LibraryFilter>(EMPTY_LIBRARY_FILTER);
  const [sort, setSort] = useState<LibrarySort>("recent");
  const compareNames = useMemo(
    () => new Intl.Collator(getLocale(), { sensitivity: "base", numeric: true }).compare,
    [],
  );
  const view = useMemo(
    () => libraryView(projects, filter, sort, compareNames),
    [projects, filter, sort, compareNames],
  );
  return { filter, sort, setFilter, setSort, view };
}
