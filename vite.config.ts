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
              name: "react",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
            {
              name: "router",
              test: /[\\/]node_modules[\\/](react-router|@remix-run[\\/]router)[\\/]/,
            },
            {
              name: "query",
              test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query[\\/]/,
            },
            {
              name: "network",
              test: /[\\/]node_modules[\\/]axios[\\/]/,
            },
            {
              name: "date-utils",
              test: /[\\/]node_modules[\\/](dayjs|libphonenumber-js)[\\/]/,
            },
            {
              name: "antd",
              test: /[\\/]node_modules[\\/](@ant-design|rc-[^\\/]+)[\\/]/,
            },
            {
              name: "rc",
              test: /[\\/]node_modules[\\/](@rc-component[^\\/]+)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
