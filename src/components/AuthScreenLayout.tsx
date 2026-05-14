import { Card, Space, Typography } from "antd";
import type { ReactNode } from "react";

type AuthScreenLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthScreenLayout({ title, description, children }: AuthScreenLayoutProps) {
  return (
    <main className="auth-screen">
      <Card className="auth-card">
        <Space orientation="vertical" size={20} className="wide">
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
