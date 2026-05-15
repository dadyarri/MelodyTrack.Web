import { KeyOutlined, LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { App as AntdApp, Button, Form, Input, Segmented } from "antd";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { authApi, type ResetPasswordInput } from "@/api/auth";
import { getApiErrorMessage, getApiErrorMessages } from "@/api/http";
import { AuthScreenLayout } from "@/components/AuthScreenLayout";
import { StatusBanner } from "@/shared/ui";

type SecondFactorMode = "otp" | "recoveryCode";

export function RestorePasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("code") ?? "";
  const { message } = AntdApp.useApp();
  const [secondFactorMode, setSecondFactorMode] = useState<SecondFactorMode>("otp");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };

  const resetPasswordMutation = useMutation({
    mutationFn: (values: Omit<ResetPasswordInput, "token">) =>
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
    <AuthScreenLayout title="Восстановление пароля" description="Если 2FA включен, используйте одноразовый код или код восстановления.">
      {!token ? <StatusBanner type="error" title="В ссылке нет токена восстановления." /> : null}
      {token ? <StatusBanner type="info" title="Если ссылка уже использована или просрочена, запросите новую ссылку." /> : null}
      {submitError ? <StatusBanner type="error" title={submitError} /> : null}
      <Form<Omit<ResetPasswordInput, "token">>
        layout="vertical"
        onFinish={(values) => {
          resetPasswordMutation.mutate(values);
        }}
        requiredMark={false}
      >
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
    </AuthScreenLayout>
  );
}
