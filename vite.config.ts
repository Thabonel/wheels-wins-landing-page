// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  console.log(`🔧 Building for mode: ${mode}`);
  
  return {
  server: {
    host: "::",
    port: 8080,
  },
  // Load environment files from root directory
  envDir: ".",
  
  // Environment-specific configuration
  define: {
    __ENVIRONMENT__: JSON.stringify(mode),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
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
  
  // Environment-specific build options
  build: {
    sourcemap: mode !== 'production',
    minify: mode === 'production' ? 'esbuild' : false,
    rollupOptions: {
      output: {
        // Add environment to chunk names for better debugging
        chunkFileNames: `assets/[name]-${mode}.[hash].js`,
        entryFileNames: `assets/[name]-${mode}.[hash].js`,
        assetFileNames: `assets/[name]-${mode}.[hash].[ext]`,
      },
    },
  },
};
});
