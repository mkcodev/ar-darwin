import { describe, expect, it } from "vitest";
import {
  fitWithinMaxSide,
  importFormat,
  MAX_IMAGE_SIDE,
  MAX_IMPORTED_NAME_LENGTH,
  projectNameFromFileName,
  projectSourcePath,
  projectThumbPath,
  THUMB_MAX_SIDE,
} from "./importImage";

describe("fitWithinMaxSide", () => {
  it("scales a landscape image so the width is the max side", () => {
    expect(fitWithinMaxSide({ width: 8000, height: 6000 })).toEqual({ width: 4096, height: 3072 });
  });

  it("scales a portrait image so the height is the max side", () => {
    expect(fitWithinMaxSide({ width: 3000, height: 9000 })).toEqual({ width: 1365, height: 4096 });
  });

  it("scales a square image to max × max", () => {
    expect(fitWithinMaxSide({ width: 5000, height: 5000 })).toEqual({ width: 4096, height: 4096 });
  });

  it("leaves an image exactly at the max side unchanged", () => {
    expect(fitWithinMaxSide({ width: MAX_IMAGE_SIDE, height: 100 })).toEqual({
      width: MAX_IMAGE_SIDE,
      height: 100,
    });
  });

  it("never scales a small image up", () => {
    expect(fitWithinMaxSide({ width: 640, height: 480 })).toEqual({ width: 640, height: 480 });
  });

  it("rounds the short side and keeps it at 1 px at least", () => {
    expect(fitWithinMaxSide({ width: 4097, height: 3 })).toEqual({ width: 4096, height: 3 });
    expect(fitWithinMaxSide({ width: 100_000, height: 1 })).toEqual({ width: 4096, height: 1 });
  });

  it("takes a custom max side for thumbnails", () => {
    expect(fitWithinMaxSide({ width: 4096, height: 3072 }, THUMB_MAX_SIDE)).toEqual({
      width: 512,
      height: 384,
    });
  });

  it("throws on empty sizes", () => {
    expect(() => fitWithinMaxSide({ width: 0, height: 10 })).toThrow(/^fitWithinMaxSide:/);
    expect(() => fitWithinMaxSide({ width: 10, height: 10 }, 0)).toThrow(/^fitWithinMaxSide:/);
  });
});

describe("importFormat", () => {
  it("keeps PNG", () => {
    expect(importFormat("image/png")).toBe("png");
    expect(importFormat("IMAGE/PNG")).toBe("png");
  });

  it("saves everything else as JPEG", () => {
    for (const mime of ["image/jpeg", "image/heic", "image/webp", undefined, null, ""]) {
      expect(importFormat(mime)).toBe("jpeg");
    }
  });
});

describe("project paths", () => {
  it("puts the source and the thumbnail in the project's folder", () => {
    expect(projectSourcePath("abc", "jpeg")).toBe("projects/abc/source.jpg");
    expect(projectSourcePath("abc", "png")).toBe("projects/abc/source.png");
    expect(projectThumbPath("abc")).toBe("projects/abc/thumb.jpg");
  });
});

describe("projectNameFromFileName", () => {
  it("drops the extension and tidies whitespace", () => {
    expect(projectNameFromFileName("Pinzón de Darwin.jpg")).toBe("Pinzón de Darwin");
    expect(projectNameFromFileName("  gato   naranja .PNG ")).toBe("gato naranja");
    expect(projectNameFromFileName("boceto")).toBe("boceto");
  });

  it("cuts long names", () => {
    const name = projectNameFromFileName(`${"dibujo".repeat(20)}.jpg`);
    expect(name).toHaveLength(MAX_IMPORTED_NAME_LENGTH);
  });

  it("returns null without a name", () => {
    expect(projectNameFromFileName(undefined)).toBeNull();
    expect(projectNameFromFileName(null)).toBeNull();
    expect(projectNameFromFileName("")).toBeNull();
    expect(projectNameFromFileName(".jpg")).toBeNull();
  });

  it.each([
    "IMG_1234.jpg",
    "img_20240101_120000",
    "IMG-20240101-WA0003.jpeg",
    "IMG1234.HEIC",
    "PXL_20241010_101010123.jpg",
    "pxl_1",
    "DSC_0042.JPG",
    "DSCN0042.jpg",
    "DSCF1234",
    "dsc01234.jpg",
    "Screenshot_20241010-101010.png",
    "Screenshot 2024-10-10 at 10.10.10.png",
    "screenshot.png",
    "3f2b8c1e-9a4d-4e2b-8f1a-0c9d8e7f6a5b.jpg",
    "3F2B8C1E-9A4D-4E2B-8F1A-0C9D8E7F6A5B",
    "a1b2c3d4e5f6a7b8c9d0.jpg",
    "20241010_101010.jpg",
    "1728555010123",
  ])("returns null for the generic name %s", (fileName) => {
    expect(projectNameFromFileName(fileName)).toBeNull();
  });

  it("keeps names that only start like a generic one", () => {
    expect(projectNameFromFileName("Imagine.jpg")).toBe("Imagine");
    expect(projectNameFromFileName("dscubierto.png")).toBe("dscubierto");
    expect(projectNameFromFileName("cafe.jpg")).toBe("cafe");
  });
});
