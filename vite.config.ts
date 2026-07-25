import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const optimizedDependencies = [
  "@tanstack/react-query",
  "@xyflow/react",
  "antd",
  "antd/locale/ru_RU",
  "axios",
  "dayjs",
  "dayjs/locale/ru",
  "libphonenumber-js/max",
  "lucide-react",
  "react",
  "react-dom",
  "react-dom/client",
  "react/jsx-dev-runtime",
  "react/jsx-runtime",
  "react-router",
  "sceditor/languages/ru.js",
  "sceditor/minified/formats/bbcode.js",
  "sceditor/minified/icons/material.js",
  "sceditor/minified/sceditor.min.js",
  "scheduler",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom", "scheduler"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  optimizeDeps: {
    // Route modules are lazy, so discovering one of their dependencies after
    // startup can replace Vite's optimized graph while the browser still has
    // modules from the previous graph. A single explicit graph keeps React and
    // its renderer on the same runtime instance throughout development.
    noDiscovery: true,
    include: optimizedDependencies,
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
