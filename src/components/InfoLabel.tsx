import { InfoCircleOutlined } from "@/components/icons";
import { Tooltip } from "antd";
import type { ReactNode } from "react";

export function InfoLabel({ label, tooltip }: { label: ReactNode; tooltip: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span>{label}</span>
      <Tooltip title={tooltip}>
        <InfoCircleOutlined style={{ color: "var(--text-main)" }} />
      </Tooltip>
    </span>
  );
}
