import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Result, Space, Spin, Typography } from "antd";
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

import { authApi, type ClientPortalPinAuthInput, useAuth } from "@/entities/session";
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/api";
import { AuthScreenLayout } from "@/shared/ui";

type PortalPinFormValues = {
  pin: string;
  pinConfirmation?: string;
};

export function PortalAccessPage() {
  const { token } = useParams<{ token: string }>();

  return <PortalAccessPageContent key={token ?? "saved-clients"} token={token} />;
}

function PortalAccessPageContent({ token }: { token?: string }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm<PortalPinFormValues>();
  const [pinSetupStep, setPinSetupStep] = useState<"entry" | "confirmation">("entry");
  const [pendingPin, setPendingPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinConfirmationError, setPinConfirmationError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ["client-portal", "link-status", token],
    queryFn: () => authApi.getClientPortalLinkStatus(token ?? ""),
    enabled: Boolean(token),
    retry: false,
  });

  const authenticateMutation = useMutation({
    mutationFn: (input: ClientPortalPinAuthInput) => authApi.authenticateClientPortalLink(input),
    onSuccess: async (response) => {
      await auth.establishSession(response.accessToken);
      await navigate("/portal", { replace: true });
    },
    onError: (error) => {
      const fieldErrors = getPortalPinFieldErrors(error, statusQuery.data?.hasPin ?? false, pinSetupStep, getApiErrorMessage(error));
      setPinError(fieldErrors.pin);
      setPinConfirmationError(fieldErrors.pinConfirmation);
    },
  });

  if (auth.isAuthenticated) {
    return <Navigate to={auth.user?.isClientPortal ? "/portal" : "/"} replace />;
  }

  if (!token) {
    return (
      <AuthScreenLayout title="Вход на портал ученика">
        <Result
          status="info"
          title="Нужна ссылка для входа"
          subTitle="Откройте персональную ссылку, которую вам прислал преподаватель. В целях безопасности приложение не сохраняет ссылки доступа на устройстве."
        />
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout title="Вход на портал ученика">
      {statusQuery.isLoading ? (
        <Result status="info" title="Проверяем ссылку" icon={<Spin size="large" />} />
      ) : statusQuery.isError ? (
        <Result status="warning" title="Ссылка входа недействительна" subTitle={getApiErrorMessage(statusQuery.error)} />
      ) : statusQuery.data ? (
        <Space orientation="vertical" size={16} className="wide">
          <Form<PortalPinFormValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            onValuesChange={(changedValues) => {
              if ("pin" in changedValues) {
                setPinError(null);
              }
              if ("pinConfirmation" in changedValues) {
                setPinConfirmationError(null);
              }
            }}
            onFinish={(values) => {
              if (!statusQuery.data.hasPin && pinSetupStep === "entry") {
                setPendingPin(values.pin);
                setPinSetupStep("confirmation");
                setPinError(null);
                setPinConfirmationError(null);
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
              {statusQuery.data.hasPin ? "введите PIN-код" : pinSetupStep === "entry" ? "придумайте PIN-код" : "подтвердите PIN-код"}
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
                validateStatus={pinError ? "error" : undefined}
                help={pinError}
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
                validateStatus={pinConfirmationError ? "error" : undefined}
                help={pinConfirmationError}
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
                    setPinConfirmationError(null);
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
          </Form>
        </Space>
      ) : null}
    </AuthScreenLayout>
  );
}

function PinCodeInput({ autoFocus = false, value, onChange }: { autoFocus?: boolean; value?: string; onChange?: (value: string) => void }) {
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

function getPortalPinFieldErrors(error: unknown, hasPin: boolean, step: "entry" | "confirmation", fallbackMessage: string) {
  const errorsByField = getApiFieldErrors(error);
  const pinErrors = getFieldErrors(errorsByField, "pin");
  const pinConfirmationErrors = !hasPin ? getFieldErrors(errorsByField, "pinConfirmation") : [];
  const tokenErrors = getFieldErrors(errorsByField, "token");

  const result = {
    pin: pinErrors[0] ?? null,
    pinConfirmation: pinConfirmationErrors[0] ?? null,
  };

  if (tokenErrors.length > 0) {
    if (hasPin || step === "entry") {
      result.pin = tokenErrors[0];
    } else {
      result.pinConfirmation = tokenErrors[0];
    }
  }

  if (!result.pin && !result.pinConfirmation && fallbackMessage.trim()) {
    if (hasPin || step === "entry") {
      result.pin = fallbackMessage;
    } else {
      result.pinConfirmation = fallbackMessage;
    }
  }

  return result;
}

function getFieldErrors(errorsByField: Record<string, string[]>, fieldName: string) {
  return errorsByField[fieldName.toLowerCase()] ?? [];
}
