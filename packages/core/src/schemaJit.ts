import * as z from "zod";

/**
 * Turns off Zod's JIT: schemas parse without compiling validators through `Function`. Zod decides
 * whether to JIT when each schema is constructed and probes `Function("")` to find out, which a
 * strict CSP (the desktop build) reports as a violation even though the probe's throw is caught.
 *
 * Must run before any schema exists, i.e. before `models.ts` is evaluated: import this module
 * directly (`@ar-darwin/core/src/schemaJit`), not through the package index, which builds them.
 */
export function disableSchemaJit(): void {
  z.config({ jitless: true });
}
