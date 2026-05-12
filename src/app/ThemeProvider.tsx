import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ConfigProvider, theme as antdTheme, ThemeConfig } from "antd";
import ruRU from "antd/locale/ru_RU";
import { ThemeContext, ThemeContextValue, ThemeMode } from "./ThemeContext";

const storageKey = "melodytrack.theme";

const lightTheme: ThemeConfig = {
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
    fontFamily: "\"IBM Plex Sans\", \"Segoe UI\", sans-serif",
  },
  components: {
    Button: { primaryShadow: "none" },
    Card: { colorBgContainer: "#f8edcf", headerBg: "#f8edcf" },
    Layout: { bodyBg: "#f4e8c8", headerBg: "#f8edcf", siderBg: "#efe1be" },
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
    Typography: { titleMarginBottom: 0 },
  },
};

const darkTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: "#d0a35b",
    colorInfo: "#b78d4a",
    colorSuccess: "#7ca46d",
    colorWarning: "#d4a24f",
    colorError: "#d27a70",
    colorText: "#f1e7d1",
    colorTextSecondary: "#bcae94",
    colorBgBase: "#15120f",
    colorBgContainer: "#1f1914",
    colorBgElevated: "#261f18",
    colorFillAlter: "#31271d",
    colorBorder: "#5d4a35",
    colorBorderSecondary: "#463727",
    borderRadius: 6,
    boxShadow: "0 14px 30px rgba(0, 0, 0, 0.35)",
    fontFamily: "\"IBM Plex Sans\", \"Segoe UI\", sans-serif",
  },
  components: {
    Button: { primaryShadow: "none" },
    Card: { colorBgContainer: "#1f1914", headerBg: "#1f1914" },
    Layout: { bodyBg: "#15120f", headerBg: "#1f1914", siderBg: "#1b1611" },
    Menu: {
      itemBg: "transparent",
      itemColor: "#d2c0a4",
      itemHoverBg: "#2f241a",
      itemHoverColor: "#fff0d4",
      itemSelectedBg: "#5c4122",
      itemSelectedColor: "#fff0d4",
    },
    Table: {
      borderColor: "#463727",
      headerBg: "#2a2118",
      headerColor: "#f1e7d1",
      rowHoverBg: "#2b2219",
    },
    Typography: { titleMarginBottom: 0 },
  },
};

function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem(storageKey);
  return stored === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);

  const changeMode = useCallback((nextMode: ThemeMode) => {
    const transitionDocument = document as Document & {
      startViewTransition?: (updateCallback: () => void) => ViewTransition;
    };

    if (!transitionDocument.startViewTransition) {
      setMode(nextMode);
      return;
    }

    transitionDocument.startViewTransition(() => {
      setMode(nextMode);
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem(storageKey, mode);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      toggleMode: () => {
        const nextMode = mode === "light" ? "dark" : "light";
        changeMode(nextMode);
      },
    }),
    [changeMode, mode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider locale={ruRU} theme={mode === "dark" ? darkTheme : lightTheme}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
