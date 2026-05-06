import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Form, Input, QRCode, Segmented, Space, Typography, App as AntdApp } from "antd";
import { useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { authApi, RegisterInput } from "../api/auth";
import { getApiErrorMessages } from "../api/http";
import { useAuth } from "../features/auth/useAuth";

type AuthMode = "login" | "register";
type TotpSetup = {
  email: string;
  secret: string;
  otpUrl: string;
};

export function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(searchParams.has("inviteCode") ? "register" : "login");
  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null);
  const inviteCode = searchParams.get("inviteCode") ?? "";
  const { message } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));

  const inviteQuery = useQuery({
    queryKey: ["invite", inviteCode],
    queryFn: () => authApi.getInviteInfo(inviteCode),
    enabled: mode === "register" && Boolean(inviteCode),
  });

  const loginMutation = useMutation({
    mutationFn: auth.login,
    onSuccess: () => navigate((location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/", { replace: true }),
    onError: showErrors,
  });

  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (data, input) => {
      if (data.totpRequired) {
        if (!data.secret || !data.otpUrl) {
          message.error("Пользователь создан, но сервер не вернул данные для настройки 2FA.");
          return;
        }

        setTotpSetup({
          email: inviteQuery.data?.email ?? input.email,
          secret: data.secret,
          otpUrl: data.otpUrl,
        });
        message.success("Пользователь создан. Настройте 2FA.");
        return;
      }

      message.success("Пользователь создан. Теперь можно войти.");
      setMode("login");
    },
    onError: showErrors,
  });

  const verify2FaMutation = useMutation({
    mutationFn: ({ otp }: { otp: string }) => {
      if (!totpSetup) {
        throw new Error("Нет данных для настройки 2FA");
      }

      return authApi.verify2Fa({
        email: totpSetup.email,
        otp,
        otpSecret: totpSetup.secret,
      });
    },
    onSuccess: () => {
      message.success("2FA настроена. Теперь можно войти.");
      setTotpSetup(null);
      setMode("login");
    },
    onError: showErrors,
  });

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="auth-screen">
      <Card className="auth-card">
        <Space direction="vertical" size={18} className="wide">
          <div>
            <Typography.Title level={1}>MelodyTrack</Typography.Title>
            <Typography.Text type="secondary">Вход в CRM</Typography.Text>
          </div>
          {totpSetup ? null : (
            <Segmented<AuthMode>
              block
              value={mode}
              onChange={setMode}
              options={[
                { label: "Вход", value: "login" },
                { label: "Регистрация", value: "register" },
              ]}
            />
          )}
          {totpSetup ? (
            <Space direction="vertical" size={16} className="wide">
              <Alert
                type="info"
                showIcon
                message="Настройка 2FA"
                description="Отсканируйте QR-код в приложении-аутентификаторе и введите одноразовый код."
              />
              <div className="totp-qr">
                <QRCode value={totpSetup.otpUrl} size={200} />
              </div>
              <Typography.Text copyable code>
                {totpSetup.secret}
              </Typography.Text>
              <Form layout="vertical" onFinish={(values) => verify2FaMutation.mutate(values)} requiredMark={false}>
                <Form.Item name="otp" label="Код 2FA" rules={[{ required: true }]}>
                  <Input inputMode="numeric" autoComplete="one-time-code" autoFocus />
                </Form.Item>
                <Button block type="primary" htmlType="submit" loading={verify2FaMutation.isPending}>
                  Подтвердить 2FA
                </Button>
              </Form>
            </Space>
          ) : mode === "login" ? (
            <Form layout="vertical" onFinish={(values) => loginMutation.mutate(values)} requiredMark={false}>
              <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
                <Input prefix={<MailOutlined />} autoComplete="email" />
              </Form.Item>
              <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
                <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
              </Form.Item>
              <Form.Item name="otp" label="Код 2FA">
                <Input inputMode="numeric" />
              </Form.Item>
              <Button block type="primary" htmlType="submit" loading={loginMutation.isPending}>
                Войти
              </Button>
            </Form>
          ) : (
            <Form
              layout="vertical"
              initialValues={{ inviteCode, email: inviteQuery.data?.email ?? "" }}
              onFinish={(values) => registerMutation.mutate(values)}
              requiredMark={false}
            >
              {!inviteCode ? <Alert type="info" showIcon message="Для регистрации нужен inviteCode из ссылки приглашения." /> : null}
              <Form.Item name="inviteCode" label="Invite code" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
                <Input prefix={<MailOutlined />} />
              </Form.Item>
              <Form.Item name="firstName" label="Имя" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined />} />
              </Form.Item>
              <Form.Item name="lastName" label="Фамилия" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined />} />
              </Form.Item>
              <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
                <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
              </Form.Item>
              <Button block type="primary" htmlType="submit" loading={registerMutation.isPending}>
                Зарегистрироваться
              </Button>
            </Form>
          )}
        </Space>
      </Card>
    </main>
  );
}
