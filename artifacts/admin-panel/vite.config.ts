import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Vercel handles PORT and BASE_PATH automatically
const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "../../attached_assets"),
      "@workspace/api-client-react": path.resolve(__dirname, "../../lib/api-client-react"),
      
      // JAB BHI KOI BAHAR KI FILE PACKAGES MAANGE, TOH YAHAN SE DENA:
      "@tanstack/react-query": path.resolve(__dirname, "node_modules/@tanstack/react-query"),
      "zod": path.resolve(__dirname, "node_modules/zod")
    },
    // Dedupe ensures that only one copy of these packages is loaded
    dedupe: ["react", "react-dom", "@tanstack/react-query", "zod"],
  },
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false, 
    minify: false, 
    chunkSizeWarningLimit: 2000, 
  },
  server: {
    port,
    host: "0.0.0.0",
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  }
});
