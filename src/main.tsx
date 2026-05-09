import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import { App } from "./app/App";
import { ThemeProvider } from "./app/ThemeProvider";
import "./styles.css";

dayjs.locale("ru");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
