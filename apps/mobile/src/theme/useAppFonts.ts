import { fonts } from "@ar-darwin/ui";
import { useFonts } from "expo-font";

/** OFL font files from packages/ui, registered under the names in `fonts.*.native`. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    [fonts.display
      .native[400]]: require("@ar-darwin/ui/assets/fonts/InstrumentSerif/InstrumentSerif-Italic.ttf"),
    [fonts.ui.native[400]]: require("@ar-darwin/ui/assets/fonts/Geist/Geist-Regular.ttf"),
    [fonts.ui.native[500]]: require("@ar-darwin/ui/assets/fonts/Geist/Geist-Medium.ttf"),
    [fonts.ui.native[600]]: require("@ar-darwin/ui/assets/fonts/Geist/Geist-SemiBold.ttf"),
    [fonts.value
      .native[400]]: require("@ar-darwin/ui/assets/fonts/GeistMono/GeistMono-Regular.ttf"),
    [fonts.value.native[500]]: require("@ar-darwin/ui/assets/fonts/GeistMono/GeistMono-Medium.ttf"),
  });
  // On error the system fonts stay; the screen must still render.
  return loaded || error !== null;
}
