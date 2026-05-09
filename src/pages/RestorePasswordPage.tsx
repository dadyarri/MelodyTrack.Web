import { KeyOutlined, LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Alert, App as AntdApp, Button, Card, Form, Input, Space, Typography } from "antd";
import { useSearchParams } from "react-router";
import { authApi } from "../api/auth";
import { getApiErrorMessages } from "../api/http";

export function RestorePasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("code") ?? "";
  const { message } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));

  const resetPasswordMutation = useMutation({
    mutationFn: (values: { newPassword: string; otp?: string; recoveryCode?: string }) =>
      authApi.resetPassword({
        token,
        newPassword: values.newPassword,
        otp: values.otp,
        recoveryCode: values.recoveryCode,
      }),
    onSuccess: () => {
      message.success("Пароль изменен. Теперь можно войти с новым паролем.");
    },
    onError: showErrors,
  });

  return (
    <main className="auth-screen">
      <Card className="auth-card">
        <Space direction="vertical" size={18} className="wide">
          <div>
            <Typography.Title level={1}>Восстановление пароля</Typography.Title>
            <Typography.Text type="secondary">Если 2FA включен, используйте одноразовый код или код восстановления.</Typography.Text>
          </div>
          {!token ? <Alert type="error" showIcon message="В ссылке нет токена восстановления." /> : null}
          <Form layout="vertical" onFinish={(values) => resetPasswordMutation.mutate(values)} requiredMark={false}>
            <Form.Item name="newPassword" label="Новый пароль" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>
            <Form.Item name="otp" label="Код 2FA">
              <Input prefix={<SafetyCertificateOutlined />} inputMode="numeric" autoComplete="one-time-code" />
            </Form.Item>
            <Form.Item name="recoveryCode" label="Или код восстановления">
              <Input prefix={<KeyOutlined />} autoComplete="one-time-code" />
            </Form.Item>
            <Button block type="primary" htmlType="submit" disabled={!token} loading={resetPasswordMutation.isPending}>
              Сменить пароль
            </Button>
          </Form>
        </Space>
      </Card>
    </main>
  );
}
