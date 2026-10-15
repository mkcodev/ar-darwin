import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Content-Security-Policy for production builds only: Vite's dev server needs inline scripts for
 * HMR. As a meta tag, so `frame-ancestors` (ignored there) waits for a real host's headers.
 * `data:` covers fonts Vite inlines and the playground's generated SVG backdrops; `worker-src` and
 * `manifest-src` are ready for the PWA.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

function contentSecurityPolicy(): Plugin {
  return {
    name: "ar-darwin:csp",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: CSP },
        injectTo: "head",
      },
    ],
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
});
