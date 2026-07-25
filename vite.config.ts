import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "scheduler"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "scheduler"],
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "query",
              test: /[\\/]node_modules[\\/]@tanstack[\\/](query-core|react-query)[\\/]/,
            },
            {
              name: "network",
              test: /[\\/]node_modules[\\/]axios[\\/]/,
            },
            {
              name: "lucide",
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            },
            {
              name: "select-runtime",
              test: /[\\/]node_modules[\\/]@rc-component[\\/](select|virtual-list)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
