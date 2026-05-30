import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
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
              name: "antd-icons",
              test: /[\\/]node_modules[\\/](@ant-design|rc-[^\\/]+)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
