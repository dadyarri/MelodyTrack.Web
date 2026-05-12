import { Alert } from "antd";

export function AccessDeniedNotice({ message }: { message: string }) {
  return <Alert type="error" showIcon message={message} />;
}
