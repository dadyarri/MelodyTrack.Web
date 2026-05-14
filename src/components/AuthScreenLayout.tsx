import type { ReactNode } from "react";
import { Card, Space, Typography } from "antd";

type AuthScreenLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthScreenLayout({ title, description, children }: AuthScreenLayoutProps) {
  return (
    <main className="auth-screen">
      <Card className="auth-card">
        <Space direction="vertical" size={20} className="wide">
          <div>
            <Typography.Title level={1}>{title}</Typography.Title>
            <Typography.Text type="secondary">{description}</Typography.Text>
          </div>
          {children}
        </Space>
      </Card>
    </main>
  );
}
