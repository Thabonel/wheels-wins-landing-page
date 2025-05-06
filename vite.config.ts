// vite.config.ts
import * as nodeCrypto from "node:crypto";
// Polyfill getRandomValues on Node’s crypto module
if (typeof (nodeCrypto as any).getRandomValues !== "function" && nodeCrypto.webcrypto) {
  (nodeCrypto as any).getRandomValues = nodeCrypto.webcrypto.getRandomValues.bind(nodeCrypto.webcrypto);
}
// Also expose on globalThis for any runtime code
;(globalThis as any).crypto = nodeCrypto;

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["mapbox-gl"],
  },
  ssr: {
    noExternal: ["mapbox-gl"],
  },
}));
