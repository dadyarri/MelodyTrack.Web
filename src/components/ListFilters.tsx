import { Space } from "antd";
import type { ReactNode } from "react";

export function ListFilters({ children }: { children: ReactNode }) {
  return (
    <Space direction="vertical" size={16} className="wide">
      <div className="filters-stack">{children}</div>
    </Space>
  );
}
