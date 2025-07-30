// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import reactFallback from "@vitejs/plugin-react";
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
    // Use standard React plugin on Netlify (CI/CD), SWC locally for speed
    process.env.NETLIFY || process.env.CI ? reactFallback() : react(),
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
      // Handle native dependencies issue on Netlify
      external: (id) => {
        if (id.includes('@rollup/rollup-linux-x64-gnu')) return false;
        return false;
      },
      output: {
        // Add environment to chunk names for better debugging
        chunkFileNames: `assets/[name]-${mode}.[hash].js`,
        entryFileNames: `assets/[name]-${mode}.[hash].js`,
        assetFileNames: `assets/[name]-${mode}.[hash].[ext]`,
        // Optimized manual chunks for better performance and caching
        manualChunks: isProduction ? {
          // Core React ecosystem - loaded on every page
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Data fetching and state management
          'query-vendor': ['@tanstack/react-query'],
          
          // Map libraries - large and specific to trip planning
          'mapbox-vendor': ['mapbox-gl', '@mapbox/mapbox-gl-directions', '@mapbox/mapbox-gl-geocoder'],
          
          // Charts - only used in financial sections
          'chart-vendor': ['recharts'],
          
          // Calendar functionality - specific to calendar features
          'calendar-vendor': [
            '@fullcalendar/core', '@fullcalendar/react', '@fullcalendar/daygrid', 
            '@fullcalendar/timegrid', '@fullcalendar/interaction'
          ],
          
          // UI component library - widely used
          'radix-vendor': [
            '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog', '@radix-ui/react-aspect-ratio', '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox', '@radix-ui/react-collapsible', '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card', '@radix-ui/react-label', '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu', '@radix-ui/react-popover', '@radix-ui/react-progress',
            '@radix-ui/react-radio-group', '@radix-ui/react-scroll-area', '@radix-ui/react-select',
            '@radix-ui/react-separator', '@radix-ui/react-slider', '@radix-ui/react-slot',
            '@radix-ui/react-switch', '@radix-ui/react-tabs', '@radix-ui/react-toast',
            '@radix-ui/react-toggle', '@radix-ui/react-toggle-group', '@radix-ui/react-tooltip'
          ],
          
          // Animation library - used across the app
          'animation-vendor': ['framer-motion'],
          
          // Icons - lightweight but widely used
          'icons-vendor': ['lucide-react'],
          
          // Utility libraries - small but commonly used
          'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority', 'date-fns', 'uuid'],
          
          // Form handling - specific to forms
          'form-vendor': ['react-hook-form'],
          
          // Supabase client - database interactions
          'supabase-vendor': ['@supabase/supabase-js', '@supabase/auth-helpers-react'],
          
          // Development and testing tools (excluded in production)
          ...(mode !== 'production' && {
            'dev-vendor': ['lovable-tagger']
          })
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
