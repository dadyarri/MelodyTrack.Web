import { LogoutOutlined, ReloadOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, App as AntdApp, Button, Card, Form, Input, List, QRCode, Space, Tag, Typography } from "antd";
import { useState } from "react";
import { authApi, MeResponse, RecoveryCodeItem, Setup2FaResponse } from "../api/auth";
import { getApiErrorMessages } from "../api/http";
import { RecoveryCodesCard } from "../components/RecoveryCodesCard";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../features/auth/useAuth";

type TotpSetupState = Setup2FaResponse & { password: string };

export function ProfilePage() {
  const auth = useAuth();
  const { message } = AntdApp.useApp();
  const [setupState, setSetupState] = useState<TotpSetupState | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<RecoveryCodeItem[] | null>(null);
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.getMe(),
  });

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => authApi.getSessions(),
  });

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: async () => {
      message.success("Пароль изменен. Войдите снова.");
      await auth.logout();
    },
    onError: showErrors,
  });

  const setup2FaMutation = useMutation({
    mutationFn: authApi.setup2Fa,
    onSuccess: (data, variables) => {
      setSetupState({ ...data, password: variables.password });
    },
    onError: showErrors,
  });

  const verify2FaMutation = useMutation({
    mutationFn: ({ otp }: { otp: string }) => {
      if (!setupState || !meQuery.data) {
        throw new Error("Нет данных для настройки 2FA");
      }

      return authApi.verify2Fa({
        email: meQuery.data.email,
        otp,
        otpSecret: setupState.secret,
      });
    },
    onSuccess: (data) => {
      message.success("2FA включен. Сохраните коды восстановления.");
      setSetupState(null);
      openRecoveryCodes(data.allCodes);
      void meQuery.refetch();
    },
    onError: showErrors,
  });

  const getRecoveryCodesMutation = useMutation({
    mutationFn: authApi.getRecoveryCodes,
    onSuccess: (data) => openRecoveryCodes(data.allCodes),
    onError: showErrors,
  });

  const regenerateRecoveryCodesMutation = useMutation({
    mutationFn: authApi.regenerateRecoveryCodes,
    onSuccess: (data) => {
      message.success("Новые коды восстановления созданы.");
      openRecoveryCodes(data.allCodes);
    },
    onError: showErrors,
  });

  const remove2FaMutation = useMutation({
    mutationFn: authApi.remove2Fa,
    onSuccess: () => {
      message.success("2FA отключен.");
      void meQuery.refetch();
      setRecoveryCodes(null);
    },
    onError: showErrors,
  });

  const logoutAllMutation = useMutation({
    mutationFn: authApi.logoutAll,
    onSuccess: async () => {
      message.success("Все сессии завершены. Войдите снова.");
      await auth.logout();
    },
    onError: showErrors,
  });

  function openRecoveryCodes(codes: RecoveryCodeItem[]) {
    setRecoveryCodes(codes);
  }

  const me = meQuery.data;

  return (
    <Space direction="vertical" size={20} className="wide">
      <PageHeader
        title="Профиль"
        description="Управление паролем, 2FA, кодами восстановления и активными сессиями."
      />

      <div className="profile-grid">
        <Card title="Аккаунт">
          {me ? <ProfileSummary me={me} /> : <Typography.Text type="secondary">Загрузка...</Typography.Text>}
        </Card>
      </div>

      <div className="profile-grid">
        <Card title="Смена пароля">
          <Form layout="vertical" onFinish={(values) => changePasswordMutation.mutate(values)} requiredMark={false}>
            <Form.Item name="currentPassword" label="Текущий пароль" rules={[{ required: true }]}>
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item name="newPassword" label="Новый пароль" rules={[{ required: true }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={changePasswordMutation.isPending}>
              Сменить пароль
            </Button>
          </Form>
        </Card>

        <Card title="2FA и коды восстановления">
          <Space direction="vertical" className="wide">
            <Typography.Text>
              {me?.isTwoFactorEnabled ? "2FA включен." : "2FA пока не настроен."}
            </Typography.Text>
            {me?.isTwoFactorRequired ? <Alert type="info" showIcon message="Для этой роли 2FA обязателен и не может быть отключен." /> : null}
            <Space wrap>
              <Button onClick={() => getRecoveryCodesMutation.mutate()} disabled={!me?.isTwoFactorEnabled} loading={getRecoveryCodesMutation.isPending}>
                Показать коды
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => regenerateRecoveryCodesMutation.mutate()} disabled={!me?.isTwoFactorEnabled} loading={regenerateRecoveryCodesMutation.isPending}>
                Перегенерировать коды
              </Button>
              <Button danger onClick={() => remove2FaMutation.mutate()} disabled={!me?.isTwoFactorEnabled || me?.isTwoFactorRequired} loading={remove2FaMutation.isPending}>
                Отключить 2FA
              </Button>
            </Space>
            <Form layout="vertical" onFinish={(values) => setup2FaMutation.mutate(values)} requiredMark={false}>
              <Form.Item name="password" label="Подтвердите текущий пароль для настройки 2FA" rules={[{ required: true }]}>
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Button type="primary" icon={<SafetyCertificateOutlined />} htmlType="submit" loading={setup2FaMutation.isPending}>
                Получить QR и секрет
              </Button>
            </Form>
            {setupState ? (
              <Card size="small" className="profile-setup-card">
                <Space direction="vertical" className="wide">
                  <div className="totp-qr">
                    <QRCode value={setupState.otpUrl} size={180} />
                  </div>
                  <Form.Item label="Секрет для ручного ввода" className="compact-form-item">
                    <Input readOnly value={setupState.secret} />
                  </Form.Item>
                  <Form layout="vertical" onFinish={(values) => verify2FaMutation.mutate(values)} requiredMark={false}>
                    <Form.Item name="otp" label="Код из приложения" rules={[{ required: true }]}>
                      <Input inputMode="numeric" autoComplete="one-time-code" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={verify2FaMutation.isPending}>
                      Подтвердить и получить коды восстановления
                    </Button>
                  </Form>
                </Space>
              </Card>
            ) : null}
            {recoveryCodes ? (
              <RecoveryCodesCard
                items={recoveryCodes}
                downloadFileName={`MelodyTrackRecovery_${toRecoveryFileStem(me)}.txt`}
              />
            ) : null}
          </Space>
        </Card>
      </div>

      <Card
        title="Активные сессии"
        extra={
          <Button danger icon={<LogoutOutlined />} onClick={() => logoutAllMutation.mutate()} loading={logoutAllMutation.isPending}>
            Выйти везде
          </Button>
        }
      >
        <List
          dataSource={sessionsQuery.data?.data ?? []}
          locale={{ emptyText: "Нет активных сессий" }}
          renderItem={(session) => (
            <List.Item>
              <Typography.Text>{session.deviceInfo || "Неизвестное устройство"}</Typography.Text>
            </List.Item>
          )}
        />
      </Card>

    </Space>
  );
}

function ProfileSummary({ me }: { me: MeResponse }) {
  return (
    <Space direction="vertical">
      <Typography.Text strong>
        {me.firstName} {me.lastName}
      </Typography.Text>
      <Typography.Text>{me.email}</Typography.Text>
      <Space wrap>
        <Tag color="gold">{me.roleDisplayName}</Tag>
        <Tag color={me.isTwoFactorEnabled ? "green" : "default"}>{me.isTwoFactorEnabled ? "2FA включен" : "2FA выключен"}</Tag>
      </Space>
    </Space>
  );
}

function toRecoveryFileStem(me?: MeResponse) {
  const source = me?.email?.split("@")[0] || [me?.firstName, me?.lastName].filter(Boolean).join("_");
  const stem = source.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
  return stem || "user";
}
