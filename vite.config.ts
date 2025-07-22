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
        // Temporarily disable manual chunks until dependencies are resolved
        // manualChunks: isProduction ? {
        //   'react-vendor': ['react', 'react-dom'],
        //   'routing-vendor': ['react-router-dom'],
        //   'query-vendor': ['@tanstack/react-query'],
        //   'mapbox-vendor': ['mapbox-gl', '@mapbox/mapbox-gl-directions', '@mapbox/mapbox-gl-geocoder'],
        //   'chart-vendor': ['recharts'],
        //   'calendar-vendor': ['@fullcalendar/core', '@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction'],
        //   'radix-vendor': [
        //     '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-accordion',
        //     '@radix-ui/react-alert-dialog', '@radix-ui/react-aspect-ratio', '@radix-ui/react-avatar',
        //     '@radix-ui/react-checkbox', '@radix-ui/react-collapsible', '@radix-ui/react-context-menu',
        //     '@radix-ui/react-hover-card', '@radix-ui/react-label', '@radix-ui/react-menubar',
        //     '@radix-ui/react-navigation-menu', '@radix-ui/react-popover', '@radix-ui/react-progress',
        //     '@radix-ui/react-radio-group', '@radix-ui/react-scroll-area', '@radix-ui/react-select',
        //     '@radix-ui/react-separator', '@radix-ui/react-slider',
        //     '@radix-ui/react-slot', '@radix-ui/react-switch', '@radix-ui/react-tabs',
        //     '@radix-ui/react-toast', '@radix-ui/react-toggle', '@radix-ui/react-toggle-group',
        //     '@radix-ui/react-tooltip'
        //   ],
        //   'icons-vendor': ['lucide-react'],
        //   'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority', 'date-fns', 'uuid']
        // } : undefined,
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
