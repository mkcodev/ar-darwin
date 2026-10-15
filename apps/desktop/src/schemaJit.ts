// Imported first in main.tsx, before anything loads @ar-darwin/core's schemas: the production CSP
// forbids eval, so Zod must not probe `Function` for its JIT (see packages/core/src/schemaJit.ts).
import { disableSchemaJit } from "@ar-darwin/core/src/schemaJit";

disableSchemaJit();
