import geistMedium from "@ar-darwin/ui/assets/fonts/Geist/Geist-Medium.ttf";
import geistRegular from "@ar-darwin/ui/assets/fonts/Geist/Geist-Regular.ttf";
import geistSemiBold from "@ar-darwin/ui/assets/fonts/Geist/Geist-SemiBold.ttf";
import geistMonoMedium from "@ar-darwin/ui/assets/fonts/GeistMono/GeistMono-Medium.ttf";
import geistMonoRegular from "@ar-darwin/ui/assets/fonts/GeistMono/GeistMono-Regular.ttf";
import instrumentSerifItalic from "@ar-darwin/ui/assets/fonts/InstrumentSerif/InstrumentSerif-Italic.ttf";

// Family names must match `fonts.*.web` in packages/ui/src/typography.ts.
const faces: [family: string, url: string, descriptors: FontFaceDescriptors][] = [
  ["Geist", geistRegular, { weight: "400" }],
  ["Geist", geistMedium, { weight: "500" }],
  ["Geist", geistSemiBold, { weight: "600" }],
  ["Geist Mono", geistMonoRegular, { weight: "400" }],
  ["Geist Mono", geistMonoMedium, { weight: "500" }],
  ["Instrument Serif", instrumentSerifItalic, { weight: "400", style: "italic" }],
];

/** Registers the OFL fonts shipped in packages/ui. Text renders with fallbacks until they load. */
export function loadFonts(): void {
  for (const [family, url, descriptors] of faces) {
    const face = new FontFace(family, `url(${url})`, { display: "swap", ...descriptors });
    document.fonts.add(face);
    face.load().catch(() => {
      // Keep the fallback stack; a missing font must never break the page.
    });
  }
}
