import { DEMO_ARTWORK } from "@ar-darwin/ui";

/** Darwin's finch, as line art. Shared by the camera overlay, the paper sketch and the splitter. */
export const FINCH = [
  "M100 60C120 58 132 70 134 80L152 86L134 94C132 110 124 124 108 132C96 138 84 138 74 134L40 156L36 148L66 124C64 104 72 72 100 60Z",
  "M76 100C90 96 104 104 110 118",
  "M80 110C92 108 100 114 104 122",
  "M96 136L94 150",
  "M104 134L106 150",
  "M20 152C70 148 130 152 182 146",
  "M150 149L166 136",
] as const;

/** Natural size of the demo image, in image px (it is drawn from a 200 viewBox). */
export const ARTWORK_SIZE = { width: 1000, height: 1000 } as const;

export const svgUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function artworkSvg(withPaper: boolean): string {
  const paper = withPaper ? `<rect width="200" height="200" fill="${DEMO_ARTWORK.paper}"/>` : "";
  const strokes = FINCH.map((d) => `<path d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="1000" height="1000">${paper}<g fill="none" stroke="${DEMO_ARTWORK.ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${strokes}</g><circle cx="118" cy="78" r="3" fill="${DEMO_ARTWORK.ink}"/></svg>`;
}

/** Transparent line art, as the camera overlays it. */
export const ARTWORK_URL = svgUrl(artworkSvg(false));
/** The same image on its paper, as the splitter shows the original. */
export const ARTWORK_ON_PAPER_URL = svgUrl(artworkSvg(true));
