import type { ReactNode } from "react";
import { Space } from "antd";
import { PageHeader } from "./PageHeader";

type PageLayoutProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  size?: number;
};

export function PageLayout({ title, description, actions, children, size = 20 }: PageLayoutProps) {
  return (
    <Space orientation="vertical" size={size} className="wide">
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </Space>
  );
}
