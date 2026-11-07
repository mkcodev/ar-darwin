import { describe, expect, it } from "vitest";
import { normalizeLicense, sortLicenses, UNKNOWN_LICENSE } from "./licenses";

describe("normalizeLicense", () => {
  it("reads an SPDX string", () => {
    expect(normalizeLicense("MIT")).toBe("MIT");
    expect(normalizeLicense(" (MIT OR Apache-2.0) ")).toBe("(MIT OR Apache-2.0)");
  });

  it("reads the old { type } object", () => {
    expect(normalizeLicense({ type: "BSD-3-Clause", url: "https://example.com" })).toBe(
      "BSD-3-Clause",
    );
  });

  it("joins the older licenses array", () => {
    expect(normalizeLicense(undefined, [{ type: "MIT" }])).toBe("MIT");
    expect(normalizeLicense(undefined, [{ type: "MIT" }, { type: "Apache-2.0" }])).toBe(
      "(MIT OR Apache-2.0)",
    );
    expect(normalizeLicense(["ISC", "MIT"])).toBe("(ISC OR MIT)");
  });

  it.each([undefined, null, "", "  ", 1, {}, { type: 2 }, []])("is unknown for %j", (raw) => {
    expect(normalizeLicense(raw, raw)).toBe(UNKNOWN_LICENSE);
  });
});

describe("sortLicenses", () => {
  it("drops repeats and sorts by name, then version", () => {
    expect(
      sortLicenses([
        { name: "zod", version: "4.0.0", license: "MIT" },
        { name: "@expo/ui", version: "57.0.22", license: "MIT" },
        { name: "react", version: "19.2.3", license: "MIT" },
        { name: "react", version: "18.3.1", license: "MIT" },
        { name: "zod", version: "4.0.0", license: "MIT" },
      ]).map((entry) => `${entry.name}@${entry.version}`),
    ).toEqual(["@expo/ui@57.0.22", "react@18.3.1", "react@19.2.3", "zod@4.0.0"]);
  });
});
