import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    sourcemap: false,
    target: "esnext",
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("antd") || id.includes("@ant-design")) {
              return "antd";
            }
            if (id.includes("jspdf") || id.includes("jspdf-autotable") || id.includes("html2canvas") || id.includes("xlsx")) {
              return "docs";
            }
            if (id.includes("leaflet") || id.includes("react-leaflet") || id.includes("@react-google-maps")) {
              return "maps";
            }
            if (id.includes("reactflow") || id.includes("dagre")) {
              return "flows";
            }
            if (id.includes("lucide-react")) {
              return "lucide";
            }
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router") ||
              id.includes("@reduxjs") ||
              id.includes("react-redux")
            ) {
              return "vendor-core";
            }
          }
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:4002",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      "/uploads": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:4002",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:4002",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      api: path.resolve(__dirname, "src/api"),
    },
  },
});
