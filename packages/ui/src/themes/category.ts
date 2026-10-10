import { categoryInk } from "../primitives";
import type { ColorTokens } from "./types";

/** The category palette of one theme: the `onDark` or `onLight` value of every ink. */
export function categoryPalette(side: "onDark" | "onLight"): ColorTokens["category"] {
  return {
    ochre: categoryInk.ochre[side],
    lichen: categoryInk.lichen[side],
    moss: categoryInk.moss[side],
    pine: categoryInk.pine[side],
    indigo: categoryInk.indigo[side],
    plum: categoryInk.plum[side],
    sepia: categoryInk.sepia[side],
    slate: categoryInk.slate[side],
  };
}
