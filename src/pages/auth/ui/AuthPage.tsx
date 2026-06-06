import { KeyOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined, UserOutlined } from "@/components/icons";
import { Alert, Button, Card, Form, Input, Segmented, Space, Typography } from "antd";
import { Navigate } from "react-router";
import type { LoginInput, RecoveryCodeItem } from "@/api/auth";
import { AuthScreenLayout } from "@/components/AuthScreenLayout";
import authStyles from "@/components/AuthStyles.module.css";
import { RecoveryCodesCard } from "@/components/RecoveryCodesCard";
import { TotpSecretPanel } from "@/components/TotpSecretPanel";
import { type AuthMode, type SecondFactorMode, useAuthPageController } from "@/features/auth/useAuthPageController";
import { StatusBanner } from "@/shared/ui";

export function AuthPage() {
  const controller = useAuthPageController();

  if (controller.auth.isLoading && !controller.recover2FaState) {
    return null;
  }

  if (controller.auth.isAuthenticated && !controller.recover2FaState) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthScreenLayout title="MelodyTrack" description="Войдите, чтобы открыть рабочее пространство.">
      {controller.totpSetup || controller.recoveryCodes || controller.recover2FaState || controller.hasInviteCode ? null : (
        <Segmented<AuthMode>
          block
          value={controller.mode}
          onChange={controller.setMode}
          options={[
            { label: "Вход", value: "login" },
            { label: "Сброс 2FA", value: "recover2fa" },
          ]}
        />
      )}
      {controller.totpSetup ? (
        <TotpSecretPanel
          alertType="info"
          alertMessage="Настройка 2FA"
          alertDescription="Отсканируйте QR-код или введите секрет вручную в Bitwarden/Authy/Google Authenticator. Пока вы не подтвердите код и не сохраните коды восстановления, вход для этой учетной записи не будет завершен."
          qrValue={controller.totpSetup.otpUrl}
          secret={controller.totpSetup.secret}
          copyable
        >
          <Form<{ otp: string }> layout="vertical" onFinish={controller.onVerify2FaSubmit} requiredMark={false}>
            <Form.Item name="otp" label="Код 2FA" rules={[{ required: true }]}>
              <Input inputMode="numeric" autoComplete="one-time-code" autoFocus />
            </Form.Item>
            <Button block type="primary" htmlType="submit" loading={controller.verify2FaMutation.isPending}>
              Подтвердить 2FA
            </Button>
          </Form>
        </TotpSecretPanel>
      ) : controller.recover2FaState ? (
        <TotpSecretPanel
          alertType="warning"
          alertMessage="Доступ к 2FA восстановлен"
          alertDescription="Добавьте новый секрет в приложение-аутентификатор и сохраните новые коды восстановления. Старые коды больше не действуют."
          qrValue={controller.recover2FaState.otpUrl}
          secret={controller.recover2FaState.secret}
          copyable
        >
          <RecoveryCodesCard
            items={controller.recover2FaState.allCodes}
            downloadFileName={`MelodyTrackRecovery_${toRecoveryFileStem(controller.recoveryCodeUsername)}.txt`}
            description="Эти коды замещают старые. Каждый код одноразовый."
          />
          <Button block type="primary" onClick={controller.continueAfterRecovered2Fa}>
            Продолжить
          </Button>
        </TotpSecretPanel>
      ) : controller.recoveryCodes ? (
        <RecoveryCodesBlock
          codes={controller.recoveryCodes}
          username={controller.recoveryCodeUsername}
          onContinue={controller.continueAfterRecoveryCodes}
        />
      ) : controller.hasInviteCode ? (
        <Form
          form={controller.registerForm}
          layout="vertical"
          initialValues={{
            inviteCode: controller.inviteCode,
            email: controller.inviteEmail,
          }}
          onFinish={controller.onRegisterSubmit}
          requiredMark={false}
        >
          <StatusBanner type="info" title="Регистрация доступна только по ссылке-приглашению." />
          {controller.inviteQuery.isPending ? <StatusBanner type="info" title="Проверяем ссылку приглашения..." /> : null}
          {controller.inviteErrorMessage ? <StatusBanner type="error" title={controller.inviteErrorMessage} /> : null}
          {controller.canSubmitRegistration && controller.inviteLookupFinished ? (
            <StatusBanner
              type="warning"
              title="Если для вашей роли обязателен 2FA, после регистрации нужно сразу подтвердить код из приложения и сохранить коды восстановления."
            />
          ) : null}
          <Form.Item name="inviteCode" label="Код приглашения" rules={[{ required: true }]}>
            <Input disabled />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
            <Input prefix={<MailOutlined />} disabled={Boolean(controller.inviteEmail)} />
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
          <Button
            block
            type="primary"
            htmlType="submit"
            loading={controller.registerMutation.isPending}
            disabled={!controller.canSubmitRegistration}
          >
            Зарегистрироваться
          </Button>
        </Form>
      ) : controller.mode === "login" ? (
        <Space orientation="vertical" size={16} className="wide">
          <Alert
            type="info"
            showIcon
            title="Если для вашей роли включен обязательный 2FA, используйте код из приложения-аутентификатора. Если устройство потеряно, переключитесь на код восстановления или выберите «Сброс 2FA»."
          />
          <Form<LoginInput> form={controller.loginForm} layout="vertical" onFinish={controller.onLoginSubmit} requiredMark={false}>
            <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
              <Input prefix={<MailOutlined />} autoComplete="email" />
            </Form.Item>
            <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            <Segmented<SecondFactorMode>
              block
              value={controller.loginSecondFactorMode}
              onChange={controller.onLoginSecondFactorModeChange}
              options={[
                { label: "Код 2FA", value: "otp" },
                { label: "Код восстановления", value: "recoveryCode" },
              ]}
            />
            {controller.loginSecondFactorMode === "otp" ? (
              <Form.Item name="otp" label="Код 2FA">
                <Input prefix={<SafetyCertificateOutlined />} inputMode="numeric" autoComplete="one-time-code" />
              </Form.Item>
            ) : (
              <Form.Item name="recoveryCode" label="Код восстановления">
                <Input prefix={<KeyOutlined />} autoComplete="one-time-code" />
              </Form.Item>
            )}
            <Button block type="primary" htmlType="submit" loading={controller.loginMutation.isPending}>
              Войти
            </Button>
          </Form>
          <Card size="small">
            <Typography.Text strong>Восстановление пароля</Typography.Text>
            <Typography.Paragraph type="secondary" className={authStyles.helperText}>
              Обратитесь к администратору, чтобы получить новую ссылку для восстановления пароля.
            </Typography.Paragraph>
          </Card>
        </Space>
      ) : controller.mode === "recover2fa" ? (
        <Card size="small">
          <Form form={controller.recover2FaForm} layout="vertical" onFinish={controller.onRecover2FaSubmit} requiredMark={false}>
            <Typography.Text strong>Потеряли доступ к приложению-аутентификатору?</Typography.Text>
            <Typography.Paragraph type="secondary" className={authStyles.helperText}>
              Введите email и один из сохраненных кодов восстановления. После этого вы получите новый секрет и новый набор кодов.
            </Typography.Paragraph>
            <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
              <Input prefix={<MailOutlined />} autoComplete="email" />
            </Form.Item>
            <Form.Item name="recoveryCode" label="Код восстановления" rules={[{ required: true }]}>
              <Input prefix={<KeyOutlined />} autoComplete="one-time-code" />
            </Form.Item>
            <Button block type="primary" htmlType="submit" loading={controller.recover2FaMutation.isPending}>
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
