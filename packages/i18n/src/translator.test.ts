import { describe, expect, expectTypeOf, it } from "vitest";
import { en } from "./en";
import { es } from "./es";
import {
  createTranslator,
  createTranslatorFrom,
  FALLBACK_LOCALE,
  LOCALES,
  resolveLocale,
} from "./translator";
import type { KeyOf, MessageKey, Params, ParamsOf, Shape } from "./types";

// Fixture with nested keys and params, so the machinery is covered while es/en are still tiny.
const source = {
  greeting: "Hola",
  camera: {
    tile: "Trozo {id}",
    progress: "{done} de {total} ({done})",
  },
} as const;

const target = {
  greeting: "Hello",
  camera: {
    tile: "Tile {id}",
    progress: "{done} of {total} ({done})",
  },
} as const satisfies Shape<typeof source>;

function acceptsShape(_dictionary: Shape<typeof source>): void {}

describe("createTranslatorFrom", () => {
  const t = createTranslatorFrom<typeof source>(target);

  it("looks up nested keys", () => {
    expect(t("greeting")).toBe("Hello");
  });

  it("interpolates one, several, repeated and numeric params", () => {
    expect(t("camera.tile", { id: "A1" })).toBe("Tile A1");
    expect(t("camera.progress", { done: 3, total: 4 })).toBe("3 of 4 (3)");
  });

  it("leaves a placeholder as is if its value is missing at runtime", () => {
    const loose = createTranslatorFrom<{ readonly a: "x {b}" }>({ a: "x {b}" });
    expect(loose("a", {} as { b: string })).toBe("x {b}");
  });

  it("returns the key if it is missing at runtime", () => {
    const empty = createTranslatorFrom<typeof source>({} as Shape<typeof source>);
    expect(empty("camera.tile", { id: "A1" })).toBe("camera.tile");
  });
});

describe("createTranslator", () => {
  it("translates the real dictionaries", () => {
    expect(createTranslator("es")("app.name")).toBe("AR-Darwin");
    expect(createTranslator("en")("app.name")).toBe("AR-Darwin");
  });
});

describe("resolveLocale", () => {
  it.each([
    [["es-ES"], "es"],
    [["es-MX", "en-US"], "es"],
    [["ES"], "es"],
    [["es_AR"], "es"],
    [["en-US"], "en"],
    [["fr-FR", "es-ES"], "es"],
    [["fr-FR", "de-DE"], "en"],
    [[], "en"],
  ] as const)("resolves %j to %s", (tags, locale) => {
    expect(resolveLocale(tags)).toBe(locale);
  });

  it("falls back to English", () => {
    expect(FALLBACK_LOCALE).toBe("en");
    expect(LOCALES).toEqual(["es", "en"]);
  });
});

describe("types", () => {
  it("extracts params from the message text", () => {
    expectTypeOf<Params<"Trozo {id}">>().toEqualTypeOf<"id">();
    expectTypeOf<Params<"{done} de {total} ({done})">>().toEqualTypeOf<"done" | "total">();
    expectTypeOf<Params<"Hola">>().toEqualTypeOf<never>();
  });

  it("lists every dotted key", () => {
    expectTypeOf<KeyOf<typeof source>>().toEqualTypeOf<
      "greeting" | "camera.tile" | "camera.progress"
    >();
    expectTypeOf<MessageKey>().toEqualTypeOf<KeyOf<typeof es>>();
  });

  it("keeps the same params per key in en and es", () => {
    expectTypeOf<ParamsOf<typeof en>>().toEqualTypeOf<ParamsOf<typeof es>>();
    expectTypeOf<ParamsOf<typeof target>>().toEqualTypeOf<ParamsOf<typeof source>>();
    expectTypeOf<ParamsOf<{ a: "x {b}" }>>().not.toEqualTypeOf<ParamsOf<{ a: "x {c}" }>>();
  });

  it("rejects a dictionary with a missing or extra key", () => {
    acceptsShape({ greeting: "Hi", camera: { tile: "{id}", progress: "{done}/{total}" } });
    // @ts-expect-error missing camera.progress
    acceptsShape({ greeting: "Hi", camera: { tile: "{id}" } });
    // @ts-expect-error extra camera.zoom
    acceptsShape({ greeting: "Hi", camera: { tile: "{id}", progress: "{done}", zoom: "z" } });
  });

  it("types the arguments of t", () => {
    const t = createTranslatorFrom<typeof source>(target);
    expectTypeOf(t("camera.tile", { id: 1 })).toEqualTypeOf<string>();
    // @ts-expect-error params are required when the text has {id}
    t("camera.tile");
    // @ts-expect-error wrong param name
    t("camera.tile", { tile: "A1" });
    // @ts-expect-error missing param
    t("camera.progress", { done: 1 });
    // @ts-expect-error no params allowed when the text has none
    t("greeting", { id: 1 });
    // @ts-expect-error unknown key
    t("camera.tyle", { id: 1 });
  });
});
