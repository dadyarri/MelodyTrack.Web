import { DisconnectOutlined, LogoutOutlined, ReloadOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App as AntdApp, Button, Card, Form, Input, List, QRCode, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { authApi, MeResponse, RecoveryCodeItem, SessionDto, Setup2FaResponse } from "../api/auth";
import { getApiErrorMessages } from "../api/http";
import { RecoveryCodesCard } from "../components/RecoveryCodesCard";
import { PageHeader } from "../components/PageHeader";
import { ShortcutButton } from "../components/ShortcutButton";
import { useAuth } from "../features/auth/useAuth";
import { isShortcutTarget, matchesPlainKey } from "../utils/shortcuts";

type TotpSetupState = Setup2FaResponse & { password: string };

export function ProfilePage() {
  const auth = useAuth();
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();
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

  const revokeSessionMutation = useMutation({
    mutationFn: (session: SessionDto) => authApi.revokeSession(session.id),
    onSuccess: async (_, session) => {
      message.success(session.isCurrent ? "Текущая сессия завершена." : "Сессия завершена.");

      if (session.isCurrent) {
        await auth.logout();
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: showErrors,
  });

  function openRecoveryCodes(codes: RecoveryCodeItem[]) {
    setRecoveryCodes(codes);
  }

  const me = meQuery.data;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target) || !me?.isTwoFactorEnabled) {
        return;
      }

      if (matchesPlainKey(event, "r")) {
        event.preventDefault();
        getRecoveryCodesMutation.mutate();
        return;
      }

      if (matchesPlainKey(event, "g")) {
        event.preventDefault();
        regenerateRecoveryCodesMutation.mutate();
        return;
      }

      if (matchesPlainKey(event, "o") && !me.isTwoFactorRequired) {
        event.preventDefault();
        remove2FaMutation.mutate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [getRecoveryCodesMutation, me?.isTwoFactorEnabled, me?.isTwoFactorRequired, regenerateRecoveryCodesMutation, remove2FaMutation]);

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
            <Typography.Text>{me?.isTwoFactorEnabled ? "Вход через приложение-аутентификатор уже включен." : "Подключите приложение-аутентификатор и сохраните коды восстановления."}</Typography.Text>
            {me?.isTwoFactorRequired ? <Alert type="info" showIcon message="Для этой роли двухфакторная защита обязательна, поэтому отключить ее нельзя." /> : null}
            <Space wrap>
              <ShortcutButton shortcut="R" disabled={!me?.isTwoFactorEnabled} loading={getRecoveryCodesMutation.isPending} label="Показать коды" onClick={() => getRecoveryCodesMutation.mutate()} />
              <ShortcutButton shortcut="G" leadingIcon={<ReloadOutlined />} disabled={!me?.isTwoFactorEnabled} loading={regenerateRecoveryCodesMutation.isPending} label="Перегенерировать коды" onClick={() => regenerateRecoveryCodesMutation.mutate()} />
              <ShortcutButton shortcut="O" danger disabled={!me?.isTwoFactorEnabled || me?.isTwoFactorRequired} label="Отключить 2FA" onClick={() => remove2FaMutation.mutate()} />
            </Space>
            {!me?.isTwoFactorEnabled ? (
              <Form layout="vertical" onFinish={(values) => setup2FaMutation.mutate(values)} requiredMark={false}>
                <Form.Item name="password" label="Подтвердите текущий пароль" rules={[{ required: true }]}>
                  <Input.Password autoComplete="current-password" />
                </Form.Item>
                <ShortcutButton shortcut="F" type="primary" leadingIcon={<SafetyCertificateOutlined />} htmlType="submit" loading={setup2FaMutation.isPending} label="Получить QR-код и секрет" />
              </Form>
            ) : null}
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
          <ShortcutButton shortcut="W" danger leadingIcon={<LogoutOutlined />} loading={logoutAllMutation.isPending} label="Выйти везде" onClick={() => logoutAllMutation.mutate()} />
        }
      >
        <List
          dataSource={sessionsQuery.data?.data ?? []}
          locale={{ emptyText: "Нет активных сессий" }}
          renderItem={(session) => (
            <List.Item
              actions={[
                <Button
                  key="revoke"
                  danger
                  type="text"
                  icon={<DisconnectOutlined />}
                  loading={revokeSessionMutation.isPending && revokeSessionMutation.variables?.id === session.id}
                  onClick={() => revokeSessionMutation.mutate(session)}
                >
                  {session.isCurrent ? "Выйти" : "Завершить"}
                </Button>,
              ]}
            >
              <Space direction="vertical" size={2}>
                <Space size={8} wrap>
                  <Typography.Text>{session.deviceInfo || "Неизвестное устройство"}</Typography.Text>
                  {session.isCurrent ? <Tag color="green">Текущая</Tag> : null}
                </Space>
                <Typography.Text type="secondary">
                  Последняя активность: {formatSessionTime(session.lastSeenAtUtc)}
                </Typography.Text>
              </Space>
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

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
