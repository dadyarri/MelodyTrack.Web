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
              name: "antd-pickers",
              test: /[\\/]node_modules[\\/]antd[\\/]es[\\/](auto-complete|cascader|date-picker|select|time-picker|transfer|tree-select)[\\/]/,
            },
            {
              name: "antd-forms",
              test: /[\\/]node_modules[\\/]antd[\\/]es[\\/](checkbox|color-picker|form|input|input-number|mentions|radio|rate|slider|switch|upload)[\\/]/,
            },
            {
              name: "antd-data-display",
              test: /[\\/]node_modules[\\/]antd[\\/]es[\\/](avatar|badge|calendar|card|carousel|collapse|descriptions|empty|image|list|popover|qrcode|segmented|statistic|table|tabs|tag|timeline|tooltip|tour|tree|typography)[\\/]/,
            },
            {
              name: "antd-feedback",
              test: /[\\/]node_modules[\\/]antd[\\/]es[\\/](alert|drawer|message|modal|notification|popconfirm|progress|result|skeleton|spin)[\\/]/,
            },
            {
              name: "antd-navigation",
              test: /[\\/]node_modules[\\/]antd[\\/]es[\\/](anchor|breadcrumb|dropdown|menu|pagination|steps)[\\/]/,
            },
            {
              name: "antd-core",
              test: /[\\/]node_modules[\\/]antd[\\/]/,
            },
            {
              name: "rc-data",
              test: /[\\/]node_modules[\\/]@rc-component[\\/](async-validator|form|input|pagination|picker|select|table|tree|virtual-list)[\\/]/,
            },
            {
              name: "rc-overlay",
              test: /[\\/]node_modules[\\/]@rc-component[\\/]/,
            },
            {
              name: "antd-internals",
              test: /[\\/]node_modules[\\/](@ant-design|rc-[^\\/]+)[\\/]/,
            },
            {
              name: "icons",
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            },
          ],
        },
      },
    },
  },
});
