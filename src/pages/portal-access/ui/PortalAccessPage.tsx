import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, Form, Input, Result, Space, Spin, Typography } from "antd";
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { ClientPortalThemeProvider } from "@/app/ThemeProvider";
import { authApi, type ClientPortalPinAuthInput } from "@/api/auth";
import { getApiErrorMessage } from "@/api/http";
import { AuthScreenLayout } from "@/components/AuthScreenLayout";
import { portalClientsStore } from "@/features/auth/portalClientsStore";
import { useAuth } from "@/features/auth/useAuth";

type PortalPinFormValues = {
  pin: string;
  pinConfirmation?: string;
};

export function PortalAccessPage() {
  const { token } = useParams<{ token: string }>();

  return (
    <ClientPortalThemeProvider>
      <PortalAccessPageContent key={token ?? "saved-clients"} token={token} />
    </ClientPortalThemeProvider>
  );
}

function PortalAccessPageContent({ token }: { token?: string }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm<PortalPinFormValues>();
  const [pinSetupStep, setPinSetupStep] = useState<"entry" | "confirmation">("entry");
  const [pendingPin, setPendingPin] = useState("");
  const [savedClients, setSavedClients] = useState(() => portalClientsStore.list());
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
      if (token) {
        portalClientsStore.save({
          token,
          firstName: response.firstName,
          lastName: response.lastName,
        });
        setSavedClients(portalClientsStore.list());
      }

      await auth.establishSession(response.accessToken, response.refreshToken);
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

  if (!token && savedClients.length === 0) {
    return (
      <AuthScreenLayout title="Вход на портал ученика">
        <Result
          status="info"
          title="Пока нет сохраненных пользователей"
          subTitle="Откройте ссылку для входа один раз, и кабинет появится здесь для быстрого входа по PIN."
        />
      </AuthScreenLayout>
    );
  }

  if (!token) {
    return (
      <AuthScreenLayout title="Вход на портал ученика">
        <SavedClientsList
          clients={savedClients}
          onOpen={(savedToken) => void navigate(`/portal/access/${savedToken}`)}
          onRemove={(savedToken) => {
            portalClientsStore.remove(savedToken);
            setSavedClients(portalClientsStore.list());
          }}
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
  const errorsByField = readApiErrorsByField(error);
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

function readApiErrorsByField(error: unknown) {
  if (!error || typeof error !== "object") {
    return {};
  }

  const response = "response" in error ? error.response : undefined;
  if (!response || typeof response !== "object") {
    return {};
  }

  const data = "data" in response ? response.data : undefined;
  if (!data || typeof data !== "object" || !("errors" in data)) {
    return {};
  }

  const apiErrors = data.errors;
  if (!apiErrors || typeof apiErrors !== "object" || Array.isArray(apiErrors)) {
    return {};
  }

  const normalized: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(apiErrors)) {
    const messages = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
    if (messages.length > 0) {
      normalized[key] = messages;
      normalized[key.toLowerCase()] = messages;
    }
  }

  return normalized;
}

function SavedClientsList({
  clients,
  onOpen,
  onRemove,
  title = "Сохраненные пользователи",
}: {
  clients: Array<{ token: string; firstName: string; lastName: string; lastUsedAtUtc: string }>;
  onOpen: (token: string) => void;
  onRemove: (token: string) => void;
  title?: string;
}) {
  if (clients.length === 0) {
    return null;
  }

  return (
    <Card size="small" title={title}>
      <Space orientation="vertical" size={12} className="wide">
        {clients.map((client) => (
          <Space key={client.token} className="wide" style={{ justifyContent: "space-between" }}>
            <div>
              <Typography.Text strong>{[client.firstName, client.lastName].filter(Boolean).join(" ")}</Typography.Text>
            </div>
            <Space>
              <Button
                onClick={() => {
                  onOpen(client.token);
                }}
              >
                Открыть
              </Button>
              <Button
                danger
                onClick={() => {
                  onRemove(client.token);
                }}
              >
                Убрать
              </Button>
            </Space>
          </Space>
        ))}
      </Space>
    </Card>
  );
}
