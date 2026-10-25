import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { t } from "../i18n";

type SplitterHeaderProps = {
  /**
   * Where the «Manual | Folios» selector goes, on the right of the title. Nothing yet: the splitter
   * by sheet size (task «Divisor: tamaño real») fills it in.
   */
  modeSwitcher?: ReactNode;
};

/** The splitter's native header: its title and the (still empty) place for the mode selector. */
export function SplitterHeader({ modeSwitcher }: SplitterHeaderProps) {
  return (
    <Stack.Screen
      options={{
        title: t("splitter.title"),
        headerRight: modeSwitcher === undefined ? undefined : () => modeSwitcher,
      }}
    />
  );
}
