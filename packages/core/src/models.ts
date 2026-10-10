import * as z from "zod";
import { isStoredUri } from "./filePath";

export const RectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export type Rect = z.infer<typeof RectSchema>;

export const ImageSizeSchema = z.object({
  width: z.int().positive(),
  height: z.int().positive(),
});
export type ImageSize = z.infer<typeof ImageSizeSchema>;

/** Width and height in px. Unlike ImageSize, not limited to integers (e.g. a viewport). */
export type Size = { width: number; height: number };

/** A laid-out viewport (e.g. the camera canvas), in px: both sides > 0, not necessarily integers. */
export const ViewportSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

/** Smallest scale a transform can reach (5 % of the image's natural size). */
export const MIN_SCALE = 0.05;

export const TransformSchema = z.object({
  /** Center of the image, in viewport px. */
  x: z.number(),
  y: z.number(),
  /** Relative to the image's natural px. Can be below MIN_SCALE only via fitTransform. */
  scale: z.number().positive(),
  /** Degrees, clockwise (y axis points down). Normalized to (-180, 180] by core functions. */
  rotation: z.number(),
  flipX: z.boolean(),
  flipY: z.boolean(),
});
export type Transform = z.infer<typeof TransformSchema>;

export const IDENTITY_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  flipX: false,
  flipY: false,
};

export const MAX_SPLIT = 10;

export const SplitConfigSchema = z.object({
  rows: z.int().min(1).max(MAX_SPLIT),
  cols: z.int().min(1).max(MAX_SPLIT),
  /** Extra pixels each tile takes from its neighbours. 0 = flush cut. */
  overlapPx: z.int().nonnegative(),
  showOverlapTint: z.boolean(),
});
export type SplitConfig = z.infer<typeof SplitConfigSchema>;

export type Tile = {
  /** Row letter + 1-based column number: "A1", "A2", "B1"... */
  id: string;
  /** 0-based row index. */
  row: number;
  /** 0-based column index. */
  col: number;
  /** Final crop: coreRect extended by the overlap on interior edges only. */
  rect: Rect;
  /** Flush crop, no overlap. All coreRects tile the image exactly. */
  coreRect: Rect;
};

/** A file path as stored: relative to the document directory or a bundled asset (see filePath.ts). */
const StoredUriSchema = z.string().refine(isStoredUri, "not a relative path or asset URI");

export const ProjectStatusSchema = z.enum(["pending", "in_progress", "done"]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectSchema = z.object({
  /** UUID v4 (see createProjectId), valid as is for the Supabase sync. */
  id: z.uuid({ version: "v4" }),
  name: z.string().min(1),
  sourceUri: StoredUriSchema,
  /** Last camera adjustment, restored when the project opens. */
  transform: TransformSchema,
  /**
   * Canvas `transform` was saved for (its x/y are px of that canvas). Absent = never placed:
   * the camera fits the image on open. Saved together with `transform`, always.
   */
  transformViewport: ViewportSchema.optional(),
  /** Overlay image opacity, 0..1. */
  opacity: z.number().min(0).max(1),
  split: SplitConfigSchema.optional(),
  currentTileId: z.string().optional(),
  status: ProjectStatusSchema,
  /** Photo of the finished drawing. */
  resultPhotoUri: StoredUriSchema.optional(),
  /** How the result photo is shown next to the original. */
  resultTransform: TransformSchema.optional(),
  completedAt: z.iso.datetime().optional(),
  notes: z.string().optional(),
  /** 1 (easy) .. 5 (hard), set by the person. */
  difficulty: z.int().min(1).max(5).optional(),
  /** Time spent drawing, in ms. */
  timeSpentMs: z.int().nonnegative(),
  /** Category ids, many-to-many. */
  categoryIds: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Project = z.infer<typeof ProjectSchema>;

/** Built-in categories, seeded by the first migration. Their names come from i18n. */
export const DEFAULT_CATEGORY_IDS = [
  "animals",
  "people",
  "landscapes",
  "manga",
  "objects",
  "lettering",
] as const;
export type DefaultCategoryId = (typeof DEFAULT_CATEGORY_IDS)[number];

/** i18n key of a built-in category's name. */
export function defaultCategoryKey<Id extends DefaultCategoryId>(id: Id): `categories.${Id}` {
  return `categories.${id}`;
}

export const CategorySchema = z
  .object({
    id: z.string().min(1),
    /** i18n key: only built-in categories have one. */
    key: z.string().min(1).optional(),
    /** Name typed by the person: only their own categories. */
    name: z.string().min(1).optional(),
    isDefault: z.boolean(),
    /** Token key of a packages/ui colour, never a hex value. */
    color: z.string().min(1).optional(),
    /** Icon name from packages/ui. */
    icon: z.string().min(1).optional(),
    /** Position in the list, 0-based. */
    order: z.int().nonnegative(),
  })
  .refine((c) => (c.key === undefined) !== (c.name === undefined), {
    message: "a category has either a key or a name",
  });
export type Category = z.infer<typeof CategorySchema>;
