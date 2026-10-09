import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as transform from "./transform";

// The gesture callbacks in apps/mobile run these functions on Reanimated's UI thread. Vitest
// runs them as plain JS, so a missing "worklet" directive or an outer constant the worklets
// Babel plugin does not capture only fails on the phone. These checks catch both in CI.

/** Body right after the parameter list (which may hold `options = {}`) opens with "worklet". */
const WORKLET_BODY = /^[^)]*\)\s*\{\s*["']worklet["'];/;

/**
 * transform.ts without types, so every function's parameters and body are plain JS. The path is
 * relative to packages/core, where Vitest runs (pnpm test via turbo and `--filter` both do);
 * core's tsconfig has no Node types, so the file is read through TypeScript's own `ts.sys`.
 */
const source = ts.transpileModule(ts.sys.readFile("src/transform.ts") ?? "", {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
}).outputText;

/** Every `function name(params) {` in transform.ts, exported or not. */
const declarations = [...source.matchAll(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g)].map((m) => ({
  name: m[1] ?? "",
  params: m[2] ?? "",
  body: source.slice((m.index ?? 0) + m[0].length),
}));

describe("transform.ts runs on the UI thread", () => {
  const exported = Object.entries(transform)
    .filter(([, value]) => typeof value === "function")
    .map(([name, fn]) => [name, String(fn)] as const);

  it("exports at least the functions the gestures call", () => {
    const names = exported.map(([name]) => name);
    expect(names).toEqual(
      expect.arrayContaining(["applyGesture", "rotationDeadZone", "radiansToDegrees"]),
    );
  });

  it.each(exported)("exported %s starts with the 'worklet' directive", (_name, code) => {
    expect(code).toMatch(WORKLET_BODY);
  });

  it("finds every function declaration in the source", () => {
    expect(declarations.length).toBeGreaterThanOrEqual(exported.length);
  });

  it.each(declarations)("$name (exported or not) starts with 'worklet'", ({ body }) => {
    expect(body).toMatch(/^\s*["']worklet["'];/);
  });

  it.each(declarations)("$name has no outer identifier in a default parameter", ({ params }) => {
    // `options = {}` is fine; `zone = SOME_CONSTANT` is undefined on the UI thread.
    expect(params).not.toMatch(/=\s*[A-Za-z_$]/);
  });
});
