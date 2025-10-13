import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "build",
      "node_modules",
      "coverage",
      "playwright-report",
      "test-results",
      "backups/**",
      "backend/pam2_backend/**",
      "backend/_pam2_backend_backup/**",
      "src/services/pam/context/**",
      "src/services/pam/performance/**"
    ]
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      
      // TypeScript rules - relaxed for initial setup
      "@typescript-eslint/no-unused-vars": "off", // Too many to fix initially
      "@typescript-eslint/no-explicit-any": "off", // Too many to fix initially  
      "@typescript-eslint/no-var-requires": "off", // Legacy code support
      
      // Security and best practices - only critical security rules
      "no-console": "off", 
      "no-debugger": "error",
      "no-alert": "off", // Legacy code has alerts
      "no-eval": "error",
      "no-implied-eval": "error", 
      "no-new-func": "error",
      "no-script-url": "error",
      "no-inline-comments": "off",
      "@typescript-eslint/no-require-imports": "off", // Legacy JS files
      
      // Code quality - warnings only for gradual adoption
      "prefer-const": "warn",
      "no-var": "warn", 
      "object-shorthand": "warn",
      "prefer-template": "warn",
      "prefer-arrow-callback": "warn",
      "arrow-spacing": "warn",
      "no-duplicate-imports": "warn",
      "no-useless-return": "warn",
      "no-useless-concat": "warn",
      
      // React specific
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    // Test file specific rules
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/test/**/*"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
