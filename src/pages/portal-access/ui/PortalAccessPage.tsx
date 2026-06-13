import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Result, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { authApi, type ClientPortalPinAuthInput } from "@/api/auth";
import { getApiErrorMessage } from "@/api/http";
import { AuthScreenLayout } from "@/components/AuthScreenLayout";
import { useAuth } from "@/features/auth/useAuth";

type PortalPinFormValues = {
  pin: string;
  pinConfirmation?: string;
};

export function PortalAccessPage() {
  const { token } = useParams<{ token: string }>();
  const auth = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm<PortalPinFormValues>();
  const [pinSetupStep, setPinSetupStep] = useState<"entry" | "confirmation">("entry");
  const [pendingPin, setPendingPin] = useState("");

  const statusQuery = useQuery({
    queryKey: ["client-portal", "link-status", token],
    queryFn: () => authApi.getClientPortalLinkStatus(token ?? ""),
    enabled: Boolean(token),
    retry: false,
  });

  const authenticateMutation = useMutation({
    mutationFn: (input: ClientPortalPinAuthInput) => authApi.authenticateClientPortalLink(input),
    onSuccess: async (response) => {
      await auth.establishSession(response.accessToken, response.refreshToken);
      await navigate("/portal", { replace: true });
    },
  });

  useEffect(() => {
    if (!statusQuery.data) {
      return;
    }

    setPinSetupStep("entry");
    setPendingPin("");
    form.resetFields();
  }, [form, token, statusQuery.data?.hasPin]);

  if (auth.isAuthenticated) {
    return <Navigate to={auth.user?.isClientPortal ? "/portal" : "/"} replace />;
  }

  if (!token) {
    return (
      <AuthScreenLayout title="Вход в кабинет">
        <Result status="warning" title="Ссылка входа недействительна" />
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout title="Вход в кабинет">
      {statusQuery.isLoading ? (
        <Result
          status="info"
          title="Проверяем ссылку"
          icon={<Spin size="large" />}
        />
      ) : statusQuery.isError ? (
        <Result
          status="warning"
          title="Ссылка входа недействительна"
          subTitle={getApiErrorMessage(statusQuery.error)}
        />
      ) : statusQuery.data ? (
        <Form<PortalPinFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => {
            if (!statusQuery.data.hasPin && pinSetupStep === "entry") {
              setPendingPin(values.pin);
              setPinSetupStep("confirmation");
              form.setFieldValue("pinConfirmation", undefined);
              return;
            }

            authenticateMutation.mutate({
              token,
              pin: statusQuery.data.hasPin ? values.pin : pendingPin,
              pinConfirmation: statusQuery.data.hasPin ? undefined : values.pinConfirmation,
            });
          }}
        >
          <Typography.Title level={4}>
            {statusQuery.data.firstName},{" "}
            {statusQuery.data.hasPin
              ? "введите PIN-код"
              : pinSetupStep === "entry"
                ? "придумайте PIN-код"
                : "подтвердите PIN-код"}
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            {statusQuery.data.hasPin
              ? "Используйте тот же 4-значный PIN"
              : pinSetupStep === "entry"
                ? "Это ваш первый вход. Задайте 4-значный PIN и используйте его дальше с этой же ссылкой"
                : "Повторите тот же PIN"}
          </Typography.Paragraph>

          {statusQuery.data.hasPin || pinSetupStep === "entry" ? (
            <Form.Item
              name="pin"
              label="PIN-код"
              rules={[
                { required: true, message: "Введите PIN-код" },
                { pattern: /^\d{4}$/, message: "PIN-код должен состоять из 4 цифр" },
              ]}
            >
              <PinCodeInput autoFocus />
            </Form.Item>
          ) : null}

          {!statusQuery.data.hasPin && pinSetupStep === "confirmation" ? (
            <Form.Item
              name="pinConfirmation"
              label="Подтверждение PIN-кода"
              rules={[
                { required: true, message: "Подтвердите PIN-код" },
                { pattern: /^\d{4}$/, message: "Подтверждение должно состоять из 4 цифр" },
                () => ({
                  validator(_, value) {
                    if (!value || pendingPin === value) {
                      return Promise.resolve();
                    }

                    return Promise.reject(new Error("PIN-коды не совпадают"));
                  },
                }),
              ]}
            >
              <PinCodeInput autoFocus />
            </Form.Item>
          ) : null}

          {!statusQuery.data.hasPin && pinSetupStep === "confirmation" ? (
            <>
              <Button
                block
                style={{ marginBottom: 12 }}
                onClick={() => {
                  setPinSetupStep("entry");
                  form.setFieldValue("pinConfirmation", undefined);
                }}
              >
                Изменить PIN
              </Button>
              <Button block type="primary" htmlType="submit" loading={authenticateMutation.isPending}>
                Сохранить PIN и войти
              </Button>
            </>
          ) : (
            <Button block type="primary" htmlType="submit" loading={authenticateMutation.isPending}>
              {statusQuery.data.hasPin ? "Войти" : "Продолжить"}
            </Button>
          )}

          {authenticateMutation.isError ? (
            <Typography.Paragraph type="danger" style={{ marginTop: 12, marginBottom: 0 }}>
              {getApiErrorMessage(authenticateMutation.error)}
            </Typography.Paragraph>
          ) : null}
        </Form>
      ) : null}
    </AuthScreenLayout>
  );
}

function PinCodeInput({
  autoFocus = false,
  value,
  onChange,
}: {
  autoFocus?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <Input.OTP
      length={4}
      autoFocus={autoFocus}
      value={value}
      mask={false}
      inputMode="numeric"
      autoComplete="none"
      aria-autocomplete="none"
      formatter={(next) => next.replace(/\D/g, "")}
      onChange={(next) => {
        onChange?.(next.replace(/\D/g, ""));
      }}
    />
  );
}
