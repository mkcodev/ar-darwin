import {
  CAMERA_BACKDROP_RECIPES,
  type CameraBackdropName,
  type CameraBackdropRecipe,
} from "@ar-darwin/ui";
import { FINCH, svgUrl } from "./demoArtwork";

/**
 * A photographed sheet on a desk, generated in SVG: paper texture (feTurbulence), the light's
 * colour cast, vignette and sensor grain, plus a half-finished pencil sketch. Same generator
 * as docs/design/directions.html, where the contrast extremes in packages/ui were measured.
 */
function backdropSvg(b: CameraBackdropRecipe): string {
  const v = b.vignette;
  const sketch = `<g transform="translate(50 260) scale(1.3)" fill="none" stroke="${b.pencil}" stroke-width="1.25" stroke-linecap="round" opacity=".85" filter="url(#pen)">
      <path d="${FINCH[0]}" pathLength="1" stroke-dasharray=".58 1"/><path d="${FINCH[5]}"/><circle cx="116" cy="80" r="20" opacity=".35"/>
      <path d="M60 30L170 170M60 170L170 30" opacity=".12"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="780" viewBox="0 0 360 780" preserveAspectRatio="xMidYMid slice">
    <defs>
      <filter id="pen" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="4"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="9" stitchTiles="stitch"/><feColorMatrix values="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 ${b.grain}"/></filter>
      <filter id="mottle"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="2"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .07"/></filter>
      <radialGradient id="vig" cx="${v.cx}" cy="${v.cy}" r="${v.r}"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="${v.edge}"/></radialGradient>
    </defs>
    <rect width="360" height="780" fill="${b.desk}"/>
    <polygon points="-20,70 380,24 380,800 -20,800" fill="${b.paper}"/>
    <rect width="360" height="780" filter="url(#mottle)"/>
    ${sketch}
    <rect width="360" height="780" fill="${b.tint}" opacity="${b.tintOpacity}" style="mix-blend-mode:multiply"/>
    <rect width="360" height="780" fill="url(#vig)"/>
    <rect width="360" height="780" filter="url(#grain)" style="mix-blend-mode:overlay"/>
  </svg>`;
}

/** Data URLs of the three photographed backdrops, built once. */
export const BACKDROP_URLS = Object.fromEntries(
  Object.entries(CAMERA_BACKDROP_RECIPES).map(([name, recipe]) => [
    name,
    svgUrl(backdropSvg(recipe)),
  ]),
) as Record<CameraBackdropName, string>;
