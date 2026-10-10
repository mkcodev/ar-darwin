import { describe, expect, it } from "vitest";
import { isAppOwnedFile, isStoredUri, resolveStoredUri, toStoredUri } from "./filePath";

const DOC = "file:///data/user/0/com.mkcodev.ardarwin/files/";

describe("toStoredUri / resolveStoredUri", () => {
  it("round-trips a file inside the document directory", () => {
    const uri = `${DOC}projects/abc/source.jpg`;
    const stored = toStoredUri(uri, DOC);
    expect(stored).toBe("projects/abc/source.jpg");
    expect(resolveStoredUri(stored, DOC)).toBe(uri);
  });

  it("accepts the document directory with or without a trailing slash", () => {
    const dir = DOC.slice(0, -1);
    expect(toStoredUri(`${DOC}a.jpg`, dir)).toBe("a.jpg");
    expect(resolveStoredUri("a.jpg", dir)).toBe(`${DOC}a.jpg`);
  });

  it("matches paths with and without the file:// scheme", () => {
    expect(toStoredUri("/data/user/0/com.mkcodev.ardarwin/files/a.jpg", DOC)).toBe("a.jpg");
    expect(toStoredUri(`${DOC}a.jpg`, "/data/user/0/com.mkcodev.ardarwin/files")).toBe("a.jpg");
  });

  it("survives a container move: the same stored value resolves under the new directory", () => {
    const stored = toStoredUri(
      "file:///var/mobile/Containers/Data/Application/OLD/Documents/p/a.jpg",
      "file:///var/mobile/Containers/Data/Application/OLD/Documents/",
    );
    expect(
      resolveStoredUri(stored, "file:///var/mobile/Containers/Data/Application/NEW/Documents/"),
    ).toBe("file:///var/mobile/Containers/Data/Application/NEW/Documents/p/a.jpg");
  });

  it("keeps bundled assets verbatim", () => {
    expect(toStoredUri("asset:calibration", DOC)).toBe("asset:calibration");
    expect(resolveStoredUri("asset:calibration", DOC)).toBe("asset:calibration");
  });

  it("throws for a file outside the document directory", () => {
    expect(() => toStoredUri("file:///sdcard/DCIM/photo.jpg", DOC)).toThrow(/^toStoredUri:/);
    expect(() => toStoredUri("content://media/external/images/1", DOC)).toThrow(/^toStoredUri:/);
    expect(() => toStoredUri(DOC, DOC)).toThrow(/^toStoredUri:/);
  });

  it("throws for an escape with ..", () => {
    expect(() => toStoredUri(`${DOC}../shared_prefs/x.xml`, DOC)).toThrow(/^toStoredUri:/);
    expect(() => resolveStoredUri("../x.jpg", DOC)).toThrow(/^resolveStoredUri:/);
  });
});

describe("isStoredUri", () => {
  it.each([
    ["projects/a/source.jpg", true],
    ["a.jpg", true],
    ["asset:calibration", true],
    ["", false],
    ["asset:", false],
    ["/abs/a.jpg", false],
    ["file:///a.jpg", false],
    ["content://media/1", false],
    ["../a.jpg", false],
    ["a/../b.jpg", false],
    ["a/./b.jpg", false],
    ["a//b.jpg", false],
    ["a\\b.jpg", false],
  ] as const)("%s → %s", (value, expected) => {
    expect(isStoredUri(value)).toBe(expected);
  });
});

describe("isAppOwnedFile", () => {
  it("owns relative paths, never bundled assets", () => {
    expect(isAppOwnedFile("projects/a/source.jpg")).toBe(true);
    expect(isAppOwnedFile("asset:calibration")).toBe(false);
  });
});
