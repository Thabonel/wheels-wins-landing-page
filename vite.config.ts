// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  console.log(`🔧 Building for mode: ${mode}`);
  
  // Ensure production mode is properly set
  const isProduction = mode === 'production';
  
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
    // Ensure NODE_ENV is properly set for Redux
    'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : mode),
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
    sourcemap: !isProduction,
    minify: isProduction ? 'esbuild' : false,
    target: 'esnext',
    rollupOptions: {
      output: {
        // Add environment to chunk names for better debugging
        chunkFileNames: `assets/[name]-${mode}.[hash].js`,
        entryFileNames: `assets/[name]-${mode}.[hash].js`,
        assetFileNames: `assets/[name]-${mode}.[hash].[ext]`,
        manualChunks: isProduction ? {
          'react-vendor': ['react', 'react-dom'],
          'routing-vendor': ['react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        } : undefined,
      },
    },
    // Optimize for production
    ...(isProduction && {
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
    }),
  },
};
});
