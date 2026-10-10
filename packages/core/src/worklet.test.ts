import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as controls from "./controls";
import * as frameStats from "./frameStats";
import * as transform from "./transform";

// apps/mobile runs these functions on Reanimated's UI thread (gesture callbacks, the fps
// meter's frame callback). Vitest runs them as plain JS, so a missing "worklet" directive or
// an outer constant the worklets Babel plugin does not capture only fails on the phone. These
// checks catch both in CI.

/** Body right after the parameter list (which may hold `options = {}`) opens with "worklet". */
const WORKLET_BODY = /^[^)]*\)\s*\{\s*["']worklet["'];/;

/**
 * A module's source without types, so every function's parameters and body are plain JS. The
 * path is relative to packages/core, where Vitest runs (pnpm test via turbo and `--filter` both
 * do); core's tsconfig has no Node types, so the file is read through TypeScript's own `ts.sys`.
 */
function plainSource(file: string): string {
  return ts.transpileModule(ts.sys.readFile(`src/${file}`) ?? "", {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText;
}

const modules = [
  {
    file: "transform.ts",
    exports: transform as Record<string, unknown>,
    mustExport: [
      "applyGesture",
      "rotationDeadZone",
      "radiansToDegrees",
      "fitTransform",
      "restoreTransform",
    ],
  },
  {
    file: "frameStats.ts",
    exports: frameStats as Record<string, unknown>,
    mustExport: ["emptyFrameWindow", "addFrame", "summarizeFrameWindow", "frameBudgetMs"],
  },
  {
    file: "controls.ts",
    exports: controls as Record<string, unknown>,
    mustExport: [
      "clamp",
      "valueFromTrack",
      "fractionOfRange",
      "stepValue",
      "sheetRelease",
      "sheetScrimOpacity",
      "inkDiameter",
      "retreatOffset",
      "staggeredProgress",
    ],
  },
];

describe.each(modules)("$file runs on the UI thread", ({ file, exports, mustExport }) => {
  const source = plainSource(file);

  /** Every `function name(params) {` in the file, exported or not. */
  const declarations = [...source.matchAll(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g)].map((m) => ({
    name: m[1] ?? "",
    params: m[2] ?? "",
    body: source.slice((m.index ?? 0) + m[0].length),
  }));

  const exported = Object.entries(exports)
    .filter(([, value]) => typeof value === "function")
    .map(([name, fn]) => [name, String(fn)] as const);

  it("exports at least the functions the UI thread calls", () => {
    const names = exported.map(([name]) => name);
    expect(names).toEqual(expect.arrayContaining(mustExport));
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
