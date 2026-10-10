import { IDENTITY_TRANSFORM, type Project, ProjectSchema } from "./models";

/**
 * A standard UUID v4 (version nibble 4, variant 10xx), so local ids are valid as is when projects
 * sync to Supabase. Uses `random` instead of crypto: Hermes has no `crypto.randomUUID`, and these
 * ids only have to be unique on one device.
 */
export function createProjectId(random: () => number = Math.random): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(random() * 256) & 0xff);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type NewProject = {
  id: string;
  name: string;
  /** Stored URI of the imported image (see filePath.ts). */
  sourceUri: string;
  /** Starting overlay opacity; the app passes `opacity.overlayImage` from packages/ui. */
  opacity: number;
  now: Date;
};

/** A fresh, pending project. The camera fits the image on first open, so it starts at identity. */
export function createProject({ id, name, sourceUri, opacity, now }: NewProject): Project {
  const timestamp = now.toISOString();
  return ProjectSchema.parse({
    id,
    name,
    sourceUri,
    transform: IDENTITY_TRANSFORM,
    opacity,
    status: "pending",
    timeSpentMs: 0,
    categoryIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
