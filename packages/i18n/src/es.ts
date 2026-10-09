import type { KeyOf, Shape } from "./types";

/** Source of truth: keys and {params} of every other locale come from here. */
export const es = {
  app: {
    name: "AR-Darwin",
  },
} as const;

export type Messages = Shape<typeof es>;
export type MessageKey = KeyOf<typeof es>;
