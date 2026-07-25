import { CloudDownloadOutlined, CloudOutlined } from "@/shared/ui/icons";
import { Tooltip } from "antd";
import type { ReactNode } from "react";
import styles from "./DraftModalTitle.module.css";

type DraftModalTitleProps = {
  title: ReactNode;
  restored: boolean;
  restoredLabel?: string;
  idleLabel?: string;
};

export function DraftModalTitle({
  title,
  restored,
  restoredLabel = "Черновик восстановлен",
  idleLabel = "Автосохранение активно",
}: DraftModalTitleProps) {
  const label = restored ? restoredLabel : idleLabel;

  return (
    <span className={styles.title}>
      <span className={styles.titleText}>{title}</span>
      <Tooltip title={label}>
        <span className={[styles.titleState, restored ? styles.titleStateRestored : null].filter(Boolean).join(" ")}>
          {restored ? <CloudDownloadOutlined /> : <CloudOutlined />}
        </span>
      </Tooltip>
    </span>
  );
}
