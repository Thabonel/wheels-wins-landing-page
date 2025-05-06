import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { randomFillSync } from "crypto";

// Polyfill Node’s crypto.getRandomValues for Vite
;(globalThis as any).crypto = {
  getRandomValues: (arr: Uint8Array) => randomFillSync(arr),
};

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
