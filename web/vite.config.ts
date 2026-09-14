import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  root: "frontend",
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "frontend/src"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          polaris: ["@shopify/polaris"],
          bridge: ["@shopify/app-bridge", "@shopify/app-bridge-react"],
        },
      },
    },
  },
});
