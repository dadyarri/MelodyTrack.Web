import { Card, Typography } from "antd";
import type { ReactNode } from "react";

export function SummaryGrid({ children }: { children: ReactNode }) {
  return <div className="summary-grid">{children}</div>;
}

export function SummaryCard({
  title,
  value,
  caption,
}: {
  title: string;
  value: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <Card size="small">
      <Typography.Text type="secondary">{title}</Typography.Text>
      <div className="summary-value">{value}</div>
      {caption ? <div className="summary-caption">{caption}</div> : null}
    </Card>
  );
}
