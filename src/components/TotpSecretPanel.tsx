import type { ReactNode } from "react";
import { CopyOutlined } from "@ant-design/icons";
import { Alert, App as AntdApp, Button, Form, Input, QRCode, Space } from "antd";

type TotpSecretPanelProps = {
  alertType: "info" | "warning";
  alertMessage: string;
  alertDescription: string;
  qrValue: string;
  secret: string;
  qrSize?: number;
  copyable?: boolean;
  children?: ReactNode;
};

export function TotpSecretPanel({
  alertType,
  alertMessage,
  alertDescription,
  qrValue,
  secret,
  qrSize = 200,
  copyable = false,
  children,
}: TotpSecretPanelProps) {
  const { message } = AntdApp.useApp();

  async function copySecret() {
    await navigator.clipboard.writeText(secret);
    message.success("Секрет скопирован.");
  }

  return (
    <Space direction="vertical" size={16} className="wide">
      <Alert type={alertType} showIcon message={alertMessage} description={alertDescription} />
      <div className="totp-qr">
        <QRCode value={qrValue} size={qrSize} />
      </div>
      <Form.Item label="Секрет для ручного ввода" className="compact-form-item">
        <Input
          readOnly
          value={secret}
          suffix={copyable ? <Button type="text" icon={<CopyOutlined />} onClick={() => void copySecret()} /> : undefined}
        />
      </Form.Item>
      {children}
    </Space>
  );
}
