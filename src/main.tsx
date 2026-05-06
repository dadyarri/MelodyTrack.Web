import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import { App } from "./app/App";
import "./styles.css";

dayjs.locale("ru");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      locale={ruRU}
      theme={{
        token: {
          colorPrimary: "#8b6226",
          colorInfo: "#6f6942",
          colorSuccess: "#5f7b4b",
          colorWarning: "#a87322",
          colorError: "#9b4a3c",
          colorText: "#33271a",
          colorTextSecondary: "#746550",
          colorBgBase: "#f4e8c8",
          colorBgContainer: "#f8edcf",
          colorBgElevated: "#fbf3dc",
          colorFillAlter: "#efe1be",
          colorBorder: "#d4c19a",
          colorBorderSecondary: "#e8dcc2",
          borderRadius: 6,
          boxShadow: "0 8px 24px rgba(72, 52, 27, 0.10)",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        },
        components: {
          Button: {
            primaryShadow: "none",
          },
          Card: {
            colorBgContainer: "#f8edcf",
            headerBg: "#f8edcf",
          },
          Layout: {
            bodyBg: "#f4e8c8",
            headerBg: "#f8edcf",
            siderBg: "#efe1be",
          },
          Menu: {
            itemBg: "transparent",
            itemColor: "#5f503d",
            itemHoverBg: "#e6d5ad",
            itemHoverColor: "#33271a",
            itemSelectedBg: "#d8bd7a",
            itemSelectedColor: "#2f2418",
          },
          Table: {
            borderColor: "#d8c8a7",
            headerBg: "#efe1be",
            headerColor: "#33271a",
            rowHoverBg: "#fbf2dd",
          },
          Typography: {
            titleMarginBottom: 0,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
);
