import { CloudDownloadOutlined, CloudOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import type { ReactNode } from "react";

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
    <span className="draft-modal-title">
      <span className="draft-modal-title-text">{title}</span>
      <Tooltip title={label}>
        <span className={["draft-modal-title-state", restored ? "draft-modal-title-state-restored" : null].filter(Boolean).join(" ")} aria-label={label}>
          {restored ? <CloudDownloadOutlined /> : <CloudOutlined />}
        </span>
      </Tooltip>
    </span>
  );
}
