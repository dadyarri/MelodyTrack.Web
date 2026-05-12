import { Alert } from "antd";
import type { AlertProps } from "antd";

type StatusBannerProps = Pick<AlertProps, "type" | "message" | "description">;

export function StatusBanner(props: StatusBannerProps) {
  return <Alert showIcon {...props} />;
}
