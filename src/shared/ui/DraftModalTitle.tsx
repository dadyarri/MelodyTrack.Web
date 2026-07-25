import { Tooltip } from "antd";
import type { ReactNode } from "react";

import type { DraftSaveStatus } from "@/shared/lib/react";
import { CloudDownloadOutlined, CloudOutlined } from "@/shared/ui/icons";

import styles from "./DraftModalTitle.module.css";

type DraftModalTitleProps = {
  title: ReactNode;
  restored: boolean;
  saveStatus?: DraftSaveStatus;
  restoredLabel?: string;
  idleLabel?: string;
};

export function DraftModalTitle({
  title,
  restored,
  saveStatus = "saved",
  restoredLabel = "Черновик восстановлен",
  idleLabel = "Черновик сохранён",
}: DraftModalTitleProps) {
  const label =
    saveStatus === "loading"
      ? "Загружаем черновик…"
      : saveStatus === "pending"
        ? "Сохраняем черновик…"
        : saveStatus === "failed"
          ? "Не удалось сохранить черновик"
          : restored
            ? restoredLabel
            : idleLabel;

  return (
    <span className={styles.title}>
      <span className={styles.titleText}>{title}</span>
      <Tooltip title={label}>
        <span
          className={[
            styles.titleState,
            restored ? styles.titleStateRestored : null,
            saveStatus === "failed" ? styles.titleStateFailed : null,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-live="polite"
        >
          {restored ? <CloudDownloadOutlined /> : <CloudOutlined />}
          <span>{label}</span>
        </span>
      </Tooltip>
    </span>
  );
}
