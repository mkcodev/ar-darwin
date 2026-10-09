import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ReduceMotionProvider } from "./theme/ReduceMotion";

// No router for a single dev route: /playground is picked by path and loaded on demand.
const Playground = lazy(() =>
  import("./playground/Playground").then((m) => ({ default: m.Playground })),
);

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

const isPlayground = window.location.pathname.replace(/\/$/, "") === "/playground";

createRoot(root).render(
  <StrictMode>
    {isPlayground ? (
      <ReduceMotionProvider>
        <Suspense fallback={null}>
          <Playground />
        </Suspense>
      </ReduceMotionProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);
