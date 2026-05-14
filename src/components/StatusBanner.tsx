import type { ReactNode } from "react";
import { Alert } from "antd";
import type { AlertProps } from "antd";

type StatusBannerProps = Pick<AlertProps, "type" | "description"> & {
  title: ReactNode;
};

export function StatusBanner({ title, ...props }: StatusBannerProps) {
  return <Alert showIcon style={{ marginBottom: 12 }} title={title} {...props} />;
}
