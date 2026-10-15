import { afterEach, describe, expect, it } from "vitest";
import * as z from "zod";
import { disableSchemaJit } from "./schemaJit";

describe("disableSchemaJit", () => {
  afterEach(() => {
    z.config({ jitless: false });
  });

  it("sets Zod's global jitless flag", () => {
    disableSchemaJit();
    expect(z.config().jitless).toBe(true);
  });

  it("keeps schemas built afterwards parsing and rejecting as before", () => {
    disableSchemaJit();
    const schema = z.object({ id: z.string(), size: z.int().positive() });
    expect(schema.parse({ id: "a", size: 2 })).toEqual({ id: "a", size: 2 });
    expect(schema.safeParse({ id: "a", size: -1 }).success).toBe(false);
  });
});
