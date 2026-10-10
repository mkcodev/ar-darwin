import { describe, expect, it } from "vitest";
import { CategorySchema, IDENTITY_TRANSFORM, type Project, ProjectSchema } from "./models";
import { createProject, createProjectId } from "./project";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const NOW = new Date("2026-10-10T12:00:00.000Z");

function project(overrides: Partial<Project> = {}): Project {
  return {
    ...createProject({
      id: createProjectId(),
      name: "Pinzón",
      sourceUri: "projects/x/source.jpg",
      opacity: 0.62,
      now: NOW,
    }),
    ...overrides,
  };
}

describe("createProjectId", () => {
  it("returns a UUID v4", () => {
    for (let i = 0; i < 200; i++) expect(createProjectId()).toMatch(UUID_V4);
  });

  it("keeps the version and variant bits with extreme random values", () => {
    expect(createProjectId(() => 0)).toBe("00000000-0000-4000-8000-000000000000");
    expect(createProjectId(() => 0.999999)).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
    expect(createProjectId(() => 1)).toMatch(UUID_V4);
  });

  it("is accepted by ProjectSchema", () => {
    expect(ProjectSchema.shape.id.safeParse(createProjectId()).success).toBe(true);
  });
});

describe("createProject", () => {
  it("creates a pending project at identity with no categories", () => {
    const p = project();
    expect(p).toMatchObject({
      name: "Pinzón",
      sourceUri: "projects/x/source.jpg",
      transform: IDENTITY_TRANSFORM,
      opacity: 0.62,
      status: "pending",
      timeSpentMs: 0,
      categoryIds: [],
      createdAt: "2026-10-10T12:00:00.000Z",
      updatedAt: "2026-10-10T12:00:00.000Z",
    });
    expect(p.split).toBeUndefined();
  });

  it("rejects an absolute source URI", () => {
    expect(() =>
      createProject({
        id: createProjectId(),
        name: "x",
        sourceUri: "file:///data/a.jpg",
        opacity: 0.5,
        now: NOW,
      }),
    ).toThrow();
  });
});

describe("ProjectSchema", () => {
  it("accepts a full project", () => {
    const full = project({
      status: "done",
      resultPhotoUri: "projects/x/result.jpg",
      resultTransform: IDENTITY_TRANSFORM,
      completedAt: "2026-10-11T08:30:00.000Z",
      notes: "Primer intento",
      difficulty: 3,
      timeSpentMs: 3_600_000,
      categoryIds: ["animals"],
      split: { rows: 2, cols: 2, overlapPx: 20, showOverlapTint: true },
      currentTileId: "B1",
    });
    expect(ProjectSchema.safeParse(full).success).toBe(true);
  });

  it.each([
    ["opacity above 1", { opacity: 1.01 }],
    ["negative opacity", { opacity: -0.1 }],
    ["difficulty 0", { difficulty: 0 }],
    ["difficulty 6", { difficulty: 6 }],
    ["fractional difficulty", { difficulty: 2.5 }],
    ["negative time", { timeSpentMs: -1 }],
    ["unknown status", { status: "abandoned" }],
    ["non-ISO date", { updatedAt: "10/10/2026" }],
    ["non-v4 id", { id: "a1" }],
    ["empty name", { name: "" }],
    ["absolute result photo", { resultPhotoUri: "/sdcard/a.jpg" }],
  ])("rejects %s", (_, overrides) => {
    expect(ProjectSchema.safeParse({ ...project(), ...overrides }).success).toBe(false);
  });
});

describe("CategorySchema", () => {
  const base = { id: "c1", isDefault: false, order: 0 };

  it("accepts a key or a name", () => {
    expect(CategorySchema.safeParse({ ...base, key: "categories.animals" }).success).toBe(true);
    expect(CategorySchema.safeParse({ ...base, name: "Pájaros" }).success).toBe(true);
  });

  it("rejects both or neither", () => {
    expect(CategorySchema.safeParse({ ...base, key: "k", name: "n" }).success).toBe(false);
    expect(CategorySchema.safeParse(base).success).toBe(false);
  });
});
