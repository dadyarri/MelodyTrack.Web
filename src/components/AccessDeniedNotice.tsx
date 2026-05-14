import { StatusBanner } from "./StatusBanner";

export function AccessDeniedNotice({ message }: { message: string }) {
  return <StatusBanner type="error" message={message} />;
}
