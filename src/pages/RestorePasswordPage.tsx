import { KeyOutlined, LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { App as AntdApp, Button, Card, Form, Input, Segmented, Space, Typography } from "antd";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { authApi } from "../api/auth";
import { getApiErrorMessage, getApiErrorMessages } from "../api/http";
import { StatusBanner } from "../components/StatusBanner";

type SecondFactorMode = "otp" | "recoveryCode";

export function RestorePasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("code") ?? "";
  const { message } = AntdApp.useApp();
  const [secondFactorMode, setSecondFactorMode] = useState<SecondFactorMode>("otp");
  const [submitError, setSubmitError] = useState<string | null>(null);
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
      setSubmitError(null);
      message.success("Пароль изменен. Теперь можно войти с новым паролем.");
    },
    onError: (error) => {
      setSubmitError(getApiErrorMessage(error));
      showErrors(error);
    },
  });

  return (
    <main className="auth-screen">
      <Card className="auth-card">
        <Space direction="vertical" size={20} className="wide">
          <div>
            <Typography.Title level={1}>Восстановление пароля</Typography.Title>
            <Typography.Text type="secondary">Если 2FA включен, используйте одноразовый код или код восстановления.</Typography.Text>
          </div>
          {!token ? <StatusBanner type="error" message="В ссылке нет токена восстановления." /> : null}
          {token ? (
            <StatusBanner
              type="info"
              message="Если ссылка уже использована или просрочена, запросите новую ссылку."
            />
          ) : null}
          {submitError ? <StatusBanner type="error" message={submitError} /> : null}
          <Form layout="vertical" onFinish={(values) => resetPasswordMutation.mutate(values)} requiredMark={false}>
            <Form.Item name="newPassword" label="Новый пароль" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>
            <Segmented<SecondFactorMode>
              block
              value={secondFactorMode}
              onChange={setSecondFactorMode}
              options={[
                { label: "Код 2FA", value: "otp" },
                { label: "Код восстановления", value: "recoveryCode" },
              ]}
            />
            {secondFactorMode === "otp" ? (
              <Form.Item name="otp" label="Код 2FA">
                <Input prefix={<SafetyCertificateOutlined />} inputMode="numeric" autoComplete="one-time-code" />
              </Form.Item>
            ) : (
              <Form.Item name="recoveryCode" label="Код восстановления">
                <Input prefix={<KeyOutlined />} autoComplete="one-time-code" />
              </Form.Item>
            )}
            <Button block type="primary" htmlType="submit" disabled={!token} loading={resetPasswordMutation.isPending}>
              Сменить пароль
            </Button>
          </Form>
        </Space>
      </Card>
    </main>
  );
}
