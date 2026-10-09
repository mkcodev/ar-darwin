import type { Messages } from "./es";

/** `satisfies Messages` fails on a missing or extra key; params are checked in the tests. */
export const en = {
  app: {
    name: "AR-Darwin",
  },
} as const satisfies Messages;
