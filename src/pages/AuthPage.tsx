import { KeyOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, App as AntdApp, Button, Card, Form, Input, Segmented, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  authApi,
  type LoginInput,
  type Recover2FaInput,
  type Recover2FaResponse,
  type RecoveryCodeItem,
  type RecoveryCodesResponse,
  type RegisterInput,
} from "../api/auth";
import { getApiErrorMessage, getApiErrorMessages } from "../api/http";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { RecoveryCodesCard } from "../components/RecoveryCodesCard";
import { StatusBanner } from "../components/StatusBanner";
import { TotpSecretPanel } from "../components/TotpSecretPanel";
import { useAuth } from "../features/auth/useAuth";

type AuthMode = "login" | "register" | "recover2fa";
type TotpSetup = {
  email: string;
  secret: string;
  otpUrl: string;
};
type Recover2FaState = Recover2FaResponse & { email: string };
type SecondFactorMode = "otp" | "recoveryCode";

export function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hasInviteCode = searchParams.has("inviteCode");
  const [mode, setMode] = useState<AuthMode>("login");
  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<RecoveryCodeItem[] | null>(null);
  const [recoveryCodeUsername, setRecoveryCodeUsername] = useState<string>("user");
  const [recover2FaState, setRecover2FaState] = useState<Recover2FaState | null>(null);
  const [loginSecondFactorMode, setLoginSecondFactorMode] = useState<SecondFactorMode>("otp");
  const [isForgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [loginForm] = Form.useForm<LoginInput>();
  const [registerForm] = Form.useForm<RegisterInput>();
  const [forgotPasswordForm] = Form.useForm<{ email: string }>();
  const [recover2FaForm] = Form.useForm<Recover2FaInput>();
  const inviteCode = searchParams.get("inviteCode") ?? "";
  const watchedInviteCode = Form.useWatch("inviteCode", registerForm);
  const registerInviteCode = (watchedInviteCode || inviteCode).trim();
  const { message } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };

  const inviteQuery = useQuery({
    queryKey: ["invite", registerInviteCode],
    queryFn: () => authApi.getInviteInfo(registerInviteCode),
    enabled: hasInviteCode && Boolean(registerInviteCode),
    retry: false,
  });
  const inviteEmail = inviteQuery.data?.email ?? "";
  const inviteErrorMessage = inviteQuery.error ? getApiErrorMessage(inviteQuery.error) : null;
  const inviteLookupFinished = !inviteQuery.isPending;
  const canSubmitRegistration = Boolean(registerInviteCode) && !inviteQuery.isError && !inviteQuery.isPending;

  useEffect(() => {
    if (!registerInviteCode && !inviteEmail) {
      return;
    }

    registerForm.setFieldsValue({
      inviteCode: registerInviteCode,
      ...(inviteEmail ? { email: inviteEmail } : {}),
    });
  }, [registerInviteCode, inviteEmail, registerForm]);

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
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: (data) => {
      message.success(data.message);
    },
    onError: showErrors,
  });

  const recover2FaMutation = useMutation({
    mutationFn: ({ email, recoveryCode }: { email: string; recoveryCode: string }) => authApi.recover2Fa({ email, recoveryCode }),
    onSuccess: (data, values) => {
      setRecover2FaState({ ...data, email: values.email });
      setRecoveryCodeUsername(values.email);
      message.success("Доступ восстановлен. Настройте новое приложение и сохраните новые коды восстановления.");
    },
    onError: showErrors,
  });

  if (auth.isLoading && !recover2FaState) {
    return null;
  }

  if (auth.isAuthenticated && !recover2FaState) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthScreenLayout title="MelodyTrack" description="Войдите, чтобы открыть рабочее пространство.">
      {totpSetup || recoveryCodes || recover2FaState || hasInviteCode ? null : (
        <Segmented<AuthMode>
          block
          value={mode}
          onChange={setMode}
          options={[
            { label: "Вход", value: "login" },
            { label: "Сброс 2FA", value: "recover2fa" },
          ]}
        />
      )}
      {totpSetup ? (
        <TotpSecretPanel
          alertType="info"
          alertMessage="Настройка 2FA"
          alertDescription="Отсканируйте QR-код или введите секрет вручную в Bitwarden/Authy/Google Authenticator. Пока вы не подтвердите код и не сохраните коды восстановления, вход для этой учетной записи не будет завершен."
          qrValue={totpSetup.otpUrl}
          secret={totpSetup.secret}
          copyable
        >
          <Form<{ otp: string }>
            layout="vertical"
            onFinish={(values) => {
              verify2FaMutation.mutate(values);
            }}
            requiredMark={false}
          >
            <Form.Item name="otp" label="Код 2FA" rules={[{ required: true }]}>
              <Input inputMode="numeric" autoComplete="one-time-code" autoFocus />
            </Form.Item>
            <Button block type="primary" htmlType="submit" loading={verify2FaMutation.isPending}>
              Подтвердить 2FA
            </Button>
          </Form>
        </TotpSecretPanel>
      ) : recover2FaState ? (
        <TotpSecretPanel
          alertType="warning"
          alertMessage="Доступ к 2FA восстановлен"
          alertDescription="Добавьте новый секрет в приложение-аутентификатор и сохраните новые коды восстановления. Старые коды больше не действуют."
          qrValue={recover2FaState.otpUrl}
          secret={recover2FaState.secret}
          copyable
        >
          <RecoveryCodesCard
            items={recover2FaState.allCodes}
            downloadFileName={`MelodyTrackRecovery_${toRecoveryFileStem(recoveryCodeUsername)}.txt`}
            description="Эти коды замещают старые. Каждый код одноразовый."
          />
          <Button
            block
            type="primary"
            onClick={async () => {
              await auth.establishSession(recover2FaState.accessToken, recover2FaState.refreshToken);
              void navigate("/", { replace: true });
            }}
          >
            Продолжить
          </Button>
        </TotpSecretPanel>
      ) : recoveryCodes ? (
        <RecoveryCodesBlock
          codes={recoveryCodes}
          username={recoveryCodeUsername}
          onContinue={() => {
            setRecoveryCodes(null);
            void navigate("/login", { replace: true });
          }}
        />
      ) : hasInviteCode ? (
        <Form
          form={registerForm}
          layout="vertical"
          initialValues={{ inviteCode, email: inviteEmail }}
          onFinish={(values) => {
            registerMutation.mutate(values);
          }}
          requiredMark={false}
        >
          <StatusBanner type="info" title="Регистрация доступна только по ссылке-приглашению." />
          {inviteQuery.isPending ? <StatusBanner type="info" title="Проверяем ссылку приглашения..." /> : null}
          {inviteErrorMessage ? <StatusBanner type="error" title={inviteErrorMessage} /> : null}
          {canSubmitRegistration && inviteLookupFinished ? (
            <StatusBanner
              type="warning"
              title="Если для вашей роли обязателен 2FA, после регистрации нужно сразу подтвердить код из приложения и сохранить коды восстановления."
            />
          ) : null}
          <Form.Item name="inviteCode" label="Код приглашения" rules={[{ required: true }]}>
            <Input disabled />
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
          <Button block type="primary" htmlType="submit" loading={registerMutation.isPending} disabled={!canSubmitRegistration}>
            Зарегистрироваться
          </Button>
        </Form>
      ) : mode === "login" ? (
        <Space orientation="vertical" size={16} className="wide">
          <Alert
            type="info"
            showIcon
            title="Если для вашей роли включен обязательный 2FA, используйте код из приложения-аутентификатора. Если устройство потеряно, переключитесь на код восстановления или выберите «Сброс 2FA»."
          />
          <Form<LoginInput>
            form={loginForm}
            layout="vertical"
            onFinish={(values) => {
              loginMutation.mutate(values);
            }}
            requiredMark={false}
          >
            <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
              <Input prefix={<MailOutlined />} autoComplete="email" />
            </Form.Item>
            <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            <Segmented<SecondFactorMode>
              block
              value={loginSecondFactorMode}
              onChange={(value) => {
                setLoginSecondFactorMode(value);
                if (value === "otp") {
                  loginForm.setFieldValue("recoveryCode", undefined);
                  return;
                }
                loginForm.setFieldValue("otp", undefined);
              }}
              options={[
                { label: "Код 2FA", value: "otp" },
                { label: "Код восстановления", value: "recoveryCode" },
              ]}
            />
            {loginSecondFactorMode === "otp" ? (
              <Form.Item name="otp" label="Код 2FA">
                <Input prefix={<SafetyCertificateOutlined />} inputMode="numeric" autoComplete="one-time-code" />
              </Form.Item>
            ) : (
              <Form.Item name="recoveryCode" label="Код восстановления">
                <Input prefix={<KeyOutlined />} autoComplete="one-time-code" />
              </Form.Item>
            )}
            <Button block type="primary" htmlType="submit" loading={loginMutation.isPending}>
              Войти
            </Button>
          </Form>
          <Space orientation="vertical" size={10} className="wide">
            <Button
              type="link"
              className="auth-secondary-action"
              onClick={() => {
                setForgotPasswordOpen((current) => !current);
              }}
            >
              {isForgotPasswordOpen ? "Скрыть восстановление пароля" : "Забыли пароль?"}
            </Button>
            {isForgotPasswordOpen ? (
              <Card size="small">
                <Form<{ email: string }>
                  form={forgotPasswordForm}
                  layout="vertical"
                  onFinish={(values) => {
                    forgotPasswordMutation.mutate(values.email);
                  }}
                  requiredMark={false}
                >
                  <Typography.Text strong>Восстановление пароля</Typography.Text>
                  <Typography.Paragraph type="secondary" className="helper-text">
                    Укажите email, и система подготовит новую ссылку для восстановления.
                  </Typography.Paragraph>
                  <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
                    <Input prefix={<MailOutlined />} autoComplete="email" />
                  </Form.Item>
                  <Button block htmlType="submit" loading={forgotPasswordMutation.isPending}>
                    Запросить ссылку
                  </Button>
                </Form>
              </Card>
            ) : null}
          </Space>
        </Space>
      ) : mode === "recover2fa" ? (
        <Card size="small">
          <Form<Recover2FaInput>
            form={recover2FaForm}
            layout="vertical"
            onFinish={(values) => {
              recover2FaMutation.mutate(values);
            }}
            requiredMark={false}
          >
            <Typography.Text strong>Потеряли доступ к приложению-аутентификатору?</Typography.Text>
            <Typography.Paragraph type="secondary" className="helper-text">
              Введите email и один из сохраненных кодов восстановления. После этого вы получите новый секрет и новый набор кодов.
            </Typography.Paragraph>
            <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
              <Input prefix={<MailOutlined />} autoComplete="email" />
            </Form.Item>
            <Form.Item name="recoveryCode" label="Код восстановления" rules={[{ required: true }]}>
              <Input prefix={<KeyOutlined />} autoComplete="one-time-code" />
            </Form.Item>
            <Button block type="primary" htmlType="submit" loading={recover2FaMutation.isPending}>
              Восстановить доступ
            </Button>
          </Form>
        </Card>
      ) : (
        <Card size="small">
          <Typography.Text type="secondary">Неверное состояние экрана входа.</Typography.Text>
        </Card>
      )}
    </AuthScreenLayout>
  );
}

function RecoveryCodesBlock({ codes, username, onContinue }: { codes: RecoveryCodeItem[]; username: string; onContinue: () => void }) {
  return (
    <Space orientation="vertical" size={16} className="wide">
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
  const stem = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_");
  return stem || "user";
}
