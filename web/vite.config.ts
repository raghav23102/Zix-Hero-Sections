import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import dotenv from "dotenv";

dotenv.config();

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
    outDir: "../build/client",
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
  define: {
    "process.env.SHOPIFY_API_KEY": JSON.stringify(
      process.env.VITE_SHOPIFY_API_KEY || 
      process.env.SHOPIFY_API_KEY || 
      "b032eb456c32ff2cc4b6a036d39feb1c"
    ),
  },
});
