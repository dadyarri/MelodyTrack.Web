import { DisconnectOutlined, LogoutOutlined, ReloadOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App as AntdApp, Button, Card, DatePicker, Divider, Form, Input, List, Space, Switch, Tag, TimePicker, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import {
  authApi,
  type ChangePasswordInput,
  type MeResponse,
  onboardingApi,
  type RecoveryCodeItem,
  type SessionDto,
  type Setup2FaInput,
  type Setup2FaResponse,
} from "@/api/auth";
import { usersApi } from "@/api/crm";
import type { UserAvailability, WeekdayKey } from "@/api/types";
import { getApiErrorMessages } from "@/api/http";
import { RecoveryCodesCard } from "@/components/RecoveryCodesCard";
import { TotpSecretPanel } from "@/components/TotpSecretPanel";
import { useAuth } from "@/features/auth/useAuth";
import { PageLayout, ShortcutButton } from "@/shared/ui";
import { isShortcutTarget, matchesPlainKey } from "@/utils/shortcuts";
import { weekdayLabels, weekdayOrder } from "@/utils/userAvailability";
import styles from "./ProfilePage.module.css";

type TotpSetupState = Setup2FaResponse & { password: string };
type AvailabilityFormValues = {
  workingHours: Array<{
    dayOfWeek: WeekdayKey;
    isWorkingDay: boolean;
    timeRange?: [Dayjs, Dayjs];
  }>;
  vacations: Array<{
    period?: [Dayjs, Dayjs];
  }>;
};

export function ProfilePage() {
  const auth = useAuth();
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const [setupState, setSetupState] = useState<TotpSetupState | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<RecoveryCodeItem[] | null>(null);
  const [availabilityForm] = Form.useForm<AvailabilityFormValues>();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.getMe(),
  });

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => authApi.getSessions(),
  });
  const availabilityQuery = useQuery({
    queryKey: ["users", "availability", meQuery.data?.id],
    queryFn: () => {
      const userId = meQuery.data?.id;
      if (!userId) {
        throw new Error("User id is missing.");
      }

      return usersApi.getAvailability(userId);
    },
    enabled: Boolean(meQuery.data?.id),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (input: ChangePasswordInput) => authApi.changePassword(input),
    onSuccess: async () => {
      message.success("Пароль изменен. Войдите снова.");
      await auth.logout();
    },
    onError: showErrors,
  });

  const setup2FaMutation = useMutation({
    mutationFn: (input: Setup2FaInput) => authApi.setup2Fa(input),
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
    mutationFn: () => authApi.getRecoveryCodes(),
    onSuccess: (data) => {
      openRecoveryCodes(data.allCodes);
    },
    onError: showErrors,
  });

  const regenerateRecoveryCodesMutation = useMutation({
    mutationFn: () => authApi.regenerateRecoveryCodes(),
    onSuccess: (data) => {
      message.success("Новые коды восстановления созданы.");
      openRecoveryCodes(data.allCodes);
    },
    onError: showErrors,
  });

  const remove2FaMutation = useMutation({
    mutationFn: () => authApi.remove2Fa(),
    onSuccess: () => {
      message.success("2FA отключен.");
      void meQuery.refetch();
      setRecoveryCodes(null);
    },
    onError: showErrors,
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: async () => {
      message.success("Все сессии завершены. Войдите снова.");
      await auth.logout();
    },
    onError: showErrors,
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (session: SessionDto) => {
      await authApi.revokeSession(session.id);
      return session;
    },
    onSuccess: async (session) => {
      message.success(session.isCurrent ? "Текущая сессия завершена." : "Сессия завершена.");

      if (session.isCurrent) {
        await auth.logout();
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: showErrors,
  });
  const saveAvailabilityMutation = useMutation({
    mutationFn: (values: AvailabilityFormValues) => {
      const userId = meQuery.data?.id;
      if (!userId) {
        throw new Error("User id is missing.");
      }

      return usersApi.updateAvailability(userId, {
        workingHours: values.workingHours.map((item) => ({
          dayOfWeek: item.dayOfWeek,
          isWorkingDay: item.isWorkingDay,
          startTime: item.isWorkingDay && item.timeRange?.[0] ? item.timeRange[0].format("HH:mm") : null,
          endTime: item.isWorkingDay && item.timeRange?.[1] ? item.timeRange[1].format("HH:mm") : null,
        })),
        vacations: values.vacations
          .filter((item) => item.period?.[0] && item.period?.[1])
          .map((item) => ({
            startDate: item.period?.[0].format("YYYY-MM-DD") ?? "",
            endDate: item.period?.[1].format("YYYY-MM-DD") ?? "",
          })),
      });
    },
    onSuccess: async () => {
      message.success("График работы сохранен");
      await queryClient.invalidateQueries({ queryKey: ["users", "availability", meQuery.data?.id] });
    },
    onError: showErrors,
  });
  const resetOnboardingMutation = useMutation({
    mutationFn: () => onboardingApi.reset(),
    onSuccess: async () => {
      message.success("Экскурсия сброшена и снова появится в приложении.");
      await queryClient.invalidateQueries({ queryKey: ["onboarding", "state"] });
    },
    onError: showErrors,
  });

  function openRecoveryCodes(codes: RecoveryCodeItem[]) {
    setRecoveryCodes(codes);
  }

  const me = meQuery.data;
  const isTwoFactorEnabled = me?.isTwoFactorEnabled ?? false;
  const isTwoFactorRequired = me?.isTwoFactorRequired ?? false;

  useEffect(() => {
    if (!availabilityQuery.data) {
      return;
    }

    availabilityForm.setFieldsValue(mapAvailabilityToForm(availabilityQuery.data));
  }, [availabilityForm, availabilityQuery.data]);

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
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [getRecoveryCodesMutation, me?.isTwoFactorEnabled, me?.isTwoFactorRequired, regenerateRecoveryCodesMutation, remove2FaMutation]);

  return (
    <PageLayout title="Профиль" description="Управление паролем, 2FA, кодами восстановления и активными сессиями." size={20}>
      <div className="profile-grid">
        <div data-onboarding-id="profile-account-card">
          <Card title="Аккаунт">{me ? <ProfileSummary me={me} /> : <Typography.Text type="secondary">Загрузка...</Typography.Text>}</Card>
        </div>
        <Card
          data-onboarding-id="profile-onboarding-reset"
          title="Экскурсия по приложению"
          extra={
            <Button
              icon={<ReloadOutlined />}
              loading={resetOnboardingMutation.isPending}
              onClick={() => {
                resetOnboardingMutation.mutate();
              }}
            >
              Сбросить
            </Button>
          }
        >
          <Typography.Text type="secondary">
            Если хотите пройти онбординг заново, сбросьте прогресс. После этого гид снова откроется поверх приложения.
          </Typography.Text>
        </Card>
      </div>

      <Card title="График работы и отпуск" loading={availabilityQuery.isLoading} data-onboarding-id="profile-availability">
        <Form<AvailabilityFormValues>
          form={availabilityForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => {
            saveAvailabilityMutation.mutate(values);
          }}
        >
          <Space orientation="vertical" size={18} className="wide">
            <div>
              <Typography.Title level={5}>Рабочие часы</Typography.Title>
              <Typography.Text type="secondary">Выходные и нерабочие дни выключаются переключателем.</Typography.Text>
            </div>
            <Form.List name="workingHours">
              {(fields) => (
                <Space orientation="vertical" size={12} className="wide">
                  {fields.map((field, index) => (
                    <div className={styles.availabilityRow} key={field.key}>
                      <Form.Item name={[field.name, "dayOfWeek"]} hidden>
                        <Input />
                      </Form.Item>
                      <Typography.Text className={styles.availabilityDayLabel}>{weekdayLabels[weekdayOrder[index]]}</Typography.Text>
                      <Form.Item name={[field.name, "isWorkingDay"]} valuePropName="checked" className={styles.availabilityToggle}>
                        <Switch checkedChildren="Рабочий" unCheckedChildren="Выходной" />
                      </Form.Item>
                      <Form.Item
                        shouldUpdate={(prevValues, nextValues) =>
                          prevValues.workingHours?.[index]?.isWorkingDay !== nextValues.workingHours?.[index]?.isWorkingDay
                        }
                        noStyle
                      >
                        {() => {
                          const isWorkingDay = availabilityForm.getFieldValue(["workingHours", index, "isWorkingDay"]);
                          return (
                            <Form.Item
                              name={[field.name, "timeRange"]}
                              className={styles.availabilityTimeRange}
                              rules={
                                isWorkingDay
                                  ? [{ required: true, message: "Укажите рабочее время." }]
                                  : []
                              }
                            >
                              <TimePicker.RangePicker
                                className="wide"
                                format="HH:mm"
                                minuteStep={15}
                                disabled={!isWorkingDay}
                              />
                            </Form.Item>
                          );
                        }}
                      </Form.Item>
                    </div>
                  ))}
                </Space>
              )}
            </Form.List>

            <Divider className={styles.divider} />

            <div className={styles.vacationsHeader}>
              <div>
                <Typography.Title level={5}>Отпуска</Typography.Title>
                <Typography.Text type="secondary">Периоды отпуска блокируют создание и перенос записей.</Typography.Text>
              </div>
              <Button
                onClick={() => {
                  const vacations = availabilityForm.getFieldValue("vacations") ?? [];
                  availabilityForm.setFieldValue("vacations", [...vacations, { period: undefined }]);
                }}
              >
                Добавить отпуск
              </Button>
            </div>
            <Form.List name="vacations">
              {(fields, { remove }) => (
                <Space orientation="vertical" size={12} className="wide">
                  {fields.length === 0 ? <Typography.Text type="secondary">Отпуска пока не добавлены.</Typography.Text> : null}
                  {fields.map((field) => (
                    <div className={styles.vacationRow} key={field.key}>
                      <Form.Item
                        name={[field.name, "period"]}
                        className={styles.vacationRange}
                        rules={[{ required: true, message: "Укажите период отпуска." }]}
                      >
                        <DatePicker.RangePicker className="wide" format="DD.MM.YYYY" />
                      </Form.Item>
                      <Button danger onClick={() => remove(field.name)}>
                        Удалить
                      </Button>
                    </div>
                  ))}
                </Space>
              )}
            </Form.List>

            <div>
              <Button type="primary" htmlType="submit" loading={saveAvailabilityMutation.isPending}>
                Сохранить график
              </Button>
            </div>
          </Space>
        </Form>
      </Card>

      <div className="profile-grid" data-onboarding-id="profile-security">
        <Card title="Смена пароля">
          <Form<ChangePasswordInput>
            layout="vertical"
            onFinish={(values) => {
              changePasswordMutation.mutate(values);
            }}
            requiredMark={false}
          >
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
          <Space orientation="vertical" className="wide">
            <Typography.Text>
              {isTwoFactorEnabled
                ? "Вход через приложение-аутентификатор уже включен."
                : "Подключите приложение-аутентификатор и сохраните коды восстановления."}
            </Typography.Text>
            {isTwoFactorRequired ? (
              <Alert type="info" showIcon title="Для этой роли двухфакторная защита обязательна, поэтому отключить ее нельзя." />
            ) : null}
            <Space wrap>
              <ShortcutButton
                shortcut="R"
                disabled={!isTwoFactorEnabled}
                loading={getRecoveryCodesMutation.isPending}
                label="Показать коды"
                onClick={() => {
                  getRecoveryCodesMutation.mutate();
                }}
              />
              <ShortcutButton
                shortcut="G"
                leadingIcon={<ReloadOutlined />}
                disabled={!isTwoFactorEnabled}
                loading={regenerateRecoveryCodesMutation.isPending}
                label="Перегенерировать коды"
                onClick={() => {
                  regenerateRecoveryCodesMutation.mutate();
                }}
              />
              <ShortcutButton
                shortcut="O"
                danger
                disabled={!isTwoFactorEnabled || isTwoFactorRequired}
                label="Отключить 2FA"
                onClick={() => {
                  remove2FaMutation.mutate();
                }}
              />
            </Space>
            {!isTwoFactorEnabled ? (
              <Form<Setup2FaInput>
                layout="vertical"
                onFinish={(values) => {
                  setup2FaMutation.mutate(values);
                }}
                requiredMark={false}
              >
                <Form.Item name="password" label="Подтвердите текущий пароль" rules={[{ required: true }]}>
                  <Input.Password autoComplete="current-password" />
                </Form.Item>
                <ShortcutButton
                  shortcut="F"
                  type="primary"
                  leadingIcon={<SafetyCertificateOutlined />}
                  htmlType="submit"
                  loading={setup2FaMutation.isPending}
                  label="Получить QR-код и секрет"
                />
              </Form>
            ) : null}
            {setupState ? (
              <Card size="small" className={styles.setupCard}>
                <TotpSecretPanel
                  alertType="info"
                  alertMessage="Подтвердите подключение 2FA"
                  alertDescription="Отсканируйте QR-код в приложении-аутентификаторе, затем подтвердите одноразовый код, чтобы получить коды восстановления."
                  qrValue={setupState.otpUrl}
                  secret={setupState.secret}
                  qrSize={180}
                >
                  <Form<{ otp: string }>
                    layout="vertical"
                    onFinish={(values) => {
                      verify2FaMutation.mutate(values);
                    }}
                    requiredMark={false}
                  >
                    <Form.Item name="otp" label="Код из приложения" rules={[{ required: true }]}>
                      <Input inputMode="numeric" autoComplete="one-time-code" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={verify2FaMutation.isPending}>
                      Подтвердить и получить коды восстановления
                    </Button>
                  </Form>
                </TotpSecretPanel>
              </Card>
            ) : null}
            {recoveryCodes ? (
              <RecoveryCodesCard items={recoveryCodes} downloadFileName={`MelodyTrackRecovery_${toRecoveryFileStem(me)}.txt`} />
            ) : null}
          </Space>
        </Card>
      </div>

      <Card
        title="Активные сессии"
        extra={
          <ShortcutButton
            shortcut="W"
            danger
            leadingIcon={<LogoutOutlined />}
            loading={logoutAllMutation.isPending}
            label="Выйти везде"
            onClick={() => {
              logoutAllMutation.mutate();
            }}
          />
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
                  loading={revokeSessionMutation.isPending && revokeSessionMutation.variables.id === session.id}
                  onClick={() => {
                    revokeSessionMutation.mutate(session);
                  }}
                >
                  {session.isCurrent ? "Выйти" : "Завершить"}
                </Button>,
              ]}
            >
              <Space orientation="vertical" size={2}>
                <Space size={8} wrap>
                  <Typography.Text>{session.deviceInfo || "Неизвестное устройство"}</Typography.Text>
                  {session.isCurrent ? <Tag color="green">Текущая</Tag> : null}
                </Space>
                <Typography.Text type="secondary">Последняя активность: {formatSessionTime(session.lastSeenAtUtc)}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </PageLayout>
  );
}

function ProfileSummary({ me }: { me: MeResponse }) {
  return (
    <Space orientation="vertical">
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
  const source = me?.email ? me.email.split("@")[0] : [me?.firstName, me?.lastName].filter(Boolean).join("_");
  const stem = source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_");
  return stem || "user";
}

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function mapAvailabilityToForm(availability: UserAvailability): AvailabilityFormValues {
  return {
    workingHours: weekdayOrder.map((dayOfWeek) => {
      const item = availability.workingHours.find((entry) => entry.dayOfWeek === dayOfWeek);
      return {
        dayOfWeek,
        isWorkingDay: item?.isWorkingDay ?? false,
        timeRange:
          item?.isWorkingDay && item.startTime && item.endTime
            ? [timeToDayjs(item.startTime), timeToDayjs(item.endTime)]
            : undefined,
      };
    }),
    vacations: availability.vacations.map((vacation) => ({
      period: [dayjs(vacation.startDate), dayjs(vacation.endDate)],
    })),
  };
}

function timeToDayjs(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return dayjs().hour(Number(hours)).minute(Number(minutes)).second(0).millisecond(0);
}
