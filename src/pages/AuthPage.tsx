import { CopyOutlined, KeyOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, App as AntdApp, Button, Card, Form, Input, QRCode, Segmented, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { authApi, RecoveryCodeItem, RecoveryCodesResponse, RegisterInput } from "../api/auth";
import { getApiErrorMessages } from "../api/http";
import { RecoveryCodesCard } from "../components/RecoveryCodesCard";
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
  const [recoveryCodes, setRecoveryCodes] = useState<RecoveryCodeItem[] | null>(null);
  const [recoveryCodeUsername, setRecoveryCodeUsername] = useState<string>("user");
  const [registerForm] = Form.useForm<RegisterInput>();
  const [forgotPasswordForm] = Form.useForm<{ email: string }>();
  const inviteCode = searchParams.get("inviteCode") ?? "";
  const { message } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));

  const inviteQuery = useQuery({
    queryKey: ["invite", inviteCode],
    queryFn: () => authApi.getInviteInfo(inviteCode),
    enabled: mode === "register" && Boolean(inviteCode),
  });
  const inviteEmail = inviteQuery.data?.email ?? "";

  useEffect(() => {
    if (!inviteCode && !inviteEmail) {
      return;
    }

    registerForm.setFieldsValue({
      inviteCode,
      ...(inviteEmail ? { email: inviteEmail } : {}),
    });
  }, [inviteCode, inviteEmail, registerForm]);

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
          email: inviteEmail || input.email,
          secret: data.secret,
          otpUrl: data.otpUrl,
        });
        setRecoveryCodeUsername(inviteEmail || input.email);
        setRecoveryCodes(null);
        message.success("Пользователь создан. Завершите настройку 2FA и сохраните коды восстановления.");
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
    onSuccess: (data: RecoveryCodesResponse) => {
      message.success("2FA настроена. Сохраните коды восстановления.");
      setRecoveryCodes(data.allCodes);
      setTotpSetup(null);
      setMode("login");
    },
    onError: showErrors,
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: ({ email }: { email: string }) => authApi.forgotPassword(email),
    onSuccess: (data) => {
      message.success("Ссылка на восстановление создана.");
      void navigate(`/restore?code=${data.token}`);
    },
    onError: showErrors,
  });

  async function copySecret(secret: string) {
    await navigator.clipboard.writeText(secret);
    message.success("Секрет скопирован.");
  }

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
          {totpSetup || recoveryCodes ? null : (
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
                description="Отсканируйте QR-код или введите секрет вручную в Bitwarden/Authy/Google Authenticator, затем подтвердите одноразовый код."
              />
              <div className="totp-qr">
                <QRCode value={totpSetup.otpUrl} size={200} />
              </div>
              <Form.Item label="Секрет для ручного ввода" className="compact-form-item">
                <Input
                  readOnly
                  value={totpSetup.secret}
                  suffix={
                    <Button type="text" icon={<CopyOutlined />} onClick={() => void copySecret(totpSetup.secret)} />
                  }
                />
              </Form.Item>
              <Form layout="vertical" onFinish={(values) => verify2FaMutation.mutate(values)} requiredMark={false}>
                <Form.Item name="otp" label="Код 2FA" rules={[{ required: true }]}>
                  <Input inputMode="numeric" autoComplete="one-time-code" autoFocus />
                </Form.Item>
                <Button block type="primary" htmlType="submit" loading={verify2FaMutation.isPending}>
                  Подтвердить 2FA
                </Button>
              </Form>
            </Space>
          ) : recoveryCodes ? (
            <RecoveryCodesBlock
              codes={recoveryCodes}
              username={recoveryCodeUsername}
              onContinue={() => {
                setRecoveryCodes(null);
                void navigate("/login", { replace: true });
              }}
            />
          ) : mode === "login" ? (
            <Space direction="vertical" size={16} className="wide">
              <Form layout="vertical" onFinish={(values) => loginMutation.mutate(values)} requiredMark={false}>
                <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
                  <Input prefix={<MailOutlined />} autoComplete="email" />
                </Form.Item>
                <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
                  <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
                </Form.Item>
                <Form.Item name="otp" label="Код 2FA">
                  <Input prefix={<SafetyCertificateOutlined />} inputMode="numeric" autoComplete="one-time-code" />
                </Form.Item>
                <Form.Item name="recoveryCode" label="Или код восстановления">
                  <Input prefix={<KeyOutlined />} autoComplete="one-time-code" />
                </Form.Item>
                <Button block type="primary" htmlType="submit" loading={loginMutation.isPending}>
                  Войти
                </Button>
              </Form>
              <Card size="small">
                <Form form={forgotPasswordForm} layout="vertical" onFinish={(values) => forgotPasswordMutation.mutate(values)} requiredMark={false}>
                  <Typography.Text strong>Забыли пароль?</Typography.Text>
                  <Typography.Paragraph type="secondary" className="helper-text">
                    Для этого проекта ссылка создается сразу без email-рассылки.
                  </Typography.Paragraph>
                  <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
                    <Input prefix={<MailOutlined />} autoComplete="email" />
                  </Form.Item>
                  <Button block htmlType="submit" loading={forgotPasswordMutation.isPending}>
                    Получить ссылку для восстановления
                  </Button>
                </Form>
              </Card>
            </Space>
          ) : (
            <Form
              form={registerForm}
              layout="vertical"
              initialValues={{ inviteCode, email: inviteEmail }}
              onFinish={(values) => registerMutation.mutate(values)}
              requiredMark={false}
            >
              {!inviteCode ? <Alert type="info" showIcon message="Для регистрации нужен inviteCode из ссылки приглашения." /> : null}
              <Form.Item name="inviteCode" label="Invite code" rules={[{ required: true }]}>
                <Input disabled={Boolean(inviteCode)} />
              </Form.Item>
              <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
                <Input prefix={<MailOutlined />} disabled={Boolean(inviteEmail)} />
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

function RecoveryCodesBlock({ codes, username, onContinue }: { codes: RecoveryCodeItem[]; username: string; onContinue: () => void }) {
  return (
    <Space direction="vertical" size={16} className="wide">
      <RecoveryCodesCard
        items={codes}
        downloadFileName={`MelodyTrackRecovery_${toRecoveryFileStem(username)}.txt`}
        description="Каждый код одноразовый. Они пригодятся, если у вас не будет доступа к приложению-аутентификатору."
      />
      <Button block type="primary" onClick={onContinue}>
        Перейти ко входу
      </Button>
    </Space>
  );
}

function toRecoveryFileStem(value: string) {
  const stem = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
  return stem || "user";
}
