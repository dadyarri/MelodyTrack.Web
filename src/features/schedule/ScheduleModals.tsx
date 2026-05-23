import {
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  FireOutlined,
  LinkOutlined,
  PhoneOutlined,
  SendOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";
import { Button, Checkbox, DatePicker, Form, Modal, Select, Space, Typography } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import dayjs, { type Dayjs } from "dayjs";
import { type ReactNode, useEffect } from "react";
import { ClientSelect, ServiceSelect, UserSelect } from "@/components/RemoteSelect";
import { getPhoneUri } from "@/entities/client";
import { DraftModalFooter, DraftModalTitle, StatusBanner } from "@/shared/ui";
import type { Appointment, AppointmentStatus, RecurrenceType } from "../../api/types";
import { DATE_FORMAT, DATE_TIME_FORMAT, formatDateTime, TIME_FORMAT } from "../../utils/date";
import { formatRecordActivitySummary } from "../../utils/staleEntity";
import { getAppointmentStatusLabel } from "./appointmentStatus";
import styles from "./ScheduleModals.module.css";

const weeklyDayOptions: { label: string; value: number }[] = [
  { label: "Пн", value: 1 },
  { label: "Вт", value: 2 },
  { label: "Ср", value: 4 },
  { label: "Чт", value: 8 },
  { label: "Пт", value: 16 },
  { label: "Сб", value: 32 },
  { label: "Вс", value: 64 },
];

export type AppointmentFormValues = {
  clientId: string;
  serviceId: string;
  providerId?: string;
  startDate: Dayjs;
  recurrenceTypeId?: string;
  patternEndDate?: Dayjs;
  weeklyDays?: number[];
};

export type AppointmentEditFormValues = {
  clientId: string;
  serviceId: string;
  providerId?: string;
  startDate: Dayjs;
};

export type AppointmentDeleteScope = "single" | "this-and-following" | "all";
export type AppointmentRescheduleScope = AppointmentDeleteScope;

export function AppointmentEditModal({
  appointment,
  createdClientOptions,
  editPending,
  form,
  isStale,
  lockedProviderId,
  canCreateClient = true,
  onCreateClient,
  onCancel,
  onSubmit,
}: {
  appointment: Appointment | null;
  createdClientOptions: DefaultOptionType[];
  editPending: boolean;
  form: FormInstance<AppointmentEditFormValues>;
  isStale: boolean;
  lockedProviderId?: string;
  canCreateClient?: boolean;
  onCreateClient: () => void;
  onCancel: () => void;
  onSubmit: (values: AppointmentEditFormValues) => void;
}) {
  useEffect(() => {
    if (!appointment) {
      form.resetFields();
      return;
    }

    form.setFieldsValue({
      clientId: appointment.client.id,
      serviceId: appointment.service.id,
      providerId: lockedProviderId ?? appointment.provider?.id,
      startDate: dayjs(appointment.startDate),
    });
  }, [appointment, form, lockedProviderId]);

  return (
    <Modal
      open={appointment !== null}
      title="Редактировать запись"
      onCancel={onCancel}
      onOk={() => {
        form.submit();
      }}
      confirmLoading={editPending}
      destroyOnHidden
    >
      {appointment ? (
        <Form<AppointmentEditFormValues> form={form} layout="vertical" requiredMark={false} onFinish={onSubmit}>
          {isStale ? (
            <StatusBanner
              type="warning"
              title="Запись изменилась в другом окне"
              description={formatRecordActivitySummary(appointment.lastActivity)}
            />
          ) : null}
          <Form.Item label="Клиент">
            <Space orientation="vertical" size={8} className="wide">
              <Form.Item name="clientId" noStyle rules={[{ required: true }]}>
                <ClientSelect extraOptions={createdClientOptions} />
              </Form.Item>
              {canCreateClient ? <Button onClick={onCreateClient}>Новый клиент</Button> : null}
            </Space>
          </Form.Item>
          <Form.Item name="serviceId" label="Услуга" rules={[{ required: true }]}>
            <ServiceSelect allowClear={false} showPrice />
          </Form.Item>
          <Form.Item name="providerId" label="Преподаватель">
            <UserSelect disabled={Boolean(lockedProviderId)} />
          </Form.Item>
          <Form.Item name="startDate" label="Начало" rules={[{ required: true }]}>
            <DatePicker showTime={{ format: TIME_FORMAT }} format={DATE_TIME_FORMAT} className="wide" />
          </Form.Item>
          {appointment.recurringRule ? (
            <Typography.Text type="secondary">
              Изменяются только клиент, услуга, Преподаватель и время. Повторяющаяся серия останется без изменений.
            </Typography.Text>
          ) : null}
        </Form>
      ) : null}
    </Modal>
  );
}

export function AppointmentCreateModal({
  createPending,
  createdClientOptions,
  draftRestored,
  form,
  lockedProviderId,
  canCreateClient = true,
  onCreateClient,
  onCancel,
  onDraftChange,
  onClientLabelChange,
  onServiceLabelChange,
  onProviderLabelChange,
  onSubmit,
  open,
  onClearDraft,
  recurrenceTypes,
  recurrenceTypesLoading,
}: {
  createPending: boolean;
  createdClientOptions: DefaultOptionType[];
  draftRestored: boolean;
  form: FormInstance<AppointmentFormValues>;
  lockedProviderId?: string;
  canCreateClient?: boolean;
  onCreateClient: () => void;
  onCancel: () => void;
  onDraftChange: (values: AppointmentFormValues) => void;
  onClientLabelChange: (label?: string) => void;
  onServiceLabelChange: (label?: string) => void;
  onProviderLabelChange: (label?: string) => void;
  onSubmit: (values: AppointmentFormValues) => void;
  open: boolean;
  onClearDraft: () => void;
  recurrenceTypes: RecurrenceType[];
  recurrenceTypesLoading: boolean;
}) {
  const recurrenceTypeId = Form.useWatch("recurrenceTypeId", form);
  const startDate = Form.useWatch("startDate", form);
  const weeklyDays = Form.useWatch("weeklyDays", form);
  const weeklyRecurrenceType = recurrenceTypes.find((item) => item.key === "weekly");
  const recurrenceEnabled = Boolean(recurrenceTypeId);

  useEffect(() => {
    if (!recurrenceTypeId || !weeklyRecurrenceType || recurrenceTypeId === weeklyRecurrenceType.id) {
      return;
    }

    const nextWeeklyDays = weeklyDays?.length ? weeklyDays : [getWeeklyBitmaskValue(startDate)];
    form.setFieldsValue({
      recurrenceTypeId: weeklyRecurrenceType.id,
      weeklyDays: nextWeeklyDays,
    });
  }, [form, recurrenceTypeId, startDate, weeklyDays, weeklyRecurrenceType]);

  useEffect(() => {
    if (!recurrenceEnabled || weeklyDays?.length) {
      return;
    }

    form.setFieldValue("weeklyDays", [getWeeklyBitmaskValue(startDate)]);
  }, [form, recurrenceEnabled, startDate, weeklyDays]);

  const handleRecurrenceEnabledChange = (enabled: boolean) => {
    if (!enabled || !weeklyRecurrenceType) {
      form.setFieldsValue({ patternEndDate: undefined, weeklyDays: undefined });
      form.setFieldValue("recurrenceTypeId", undefined);
      return;
    }

    form.setFieldsValue({
      recurrenceTypeId: weeklyRecurrenceType.id,
      weeklyDays: weeklyDays?.length ? weeklyDays : [getWeeklyBitmaskValue(startDate)],
    });
  };

  return (
    <Modal
      open={open}
      title={<DraftModalTitle title="Новая запись" restored={draftRestored} />}
      onCancel={onCancel}
      onOk={() => {
        form.submit();
      }}
      confirmLoading={createPending}
      destroyOnHidden
      footer={(_, { CancelBtn, OkBtn }) => <DraftModalFooter onClearDraft={onClearDraft} CancelBtn={CancelBtn} OkBtn={OkBtn} />}
    >
      <Form<AppointmentFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ startDate: dayjs() }}
        onFinish={onSubmit}
        onValuesChange={(_, values) => {
          onDraftChange(values);
        }}
      >
        <Form.Item name="recurrenceTypeId" hidden>
          <input type="hidden" />
        </Form.Item>
        <Form.Item label="Клиент">
          <Space orientation="vertical" size={8} className="wide">
            <Form.Item name="clientId" noStyle rules={[{ required: true }]}>
              <ClientSelect extraOptions={createdClientOptions} onResolvedLabelChange={onClientLabelChange} />
            </Form.Item>
            {canCreateClient ? <Button onClick={onCreateClient}>Новый клиент</Button> : null}
          </Space>
        </Form.Item>
        <Form.Item name="serviceId" label="Услуга" rules={[{ required: true }]}>
          <ServiceSelect allowClear={false} showPrice onResolvedLabelChange={onServiceLabelChange} />
        </Form.Item>
        <Form.Item name="providerId" label="Преподаватель">
          <UserSelect disabled={Boolean(lockedProviderId)} onResolvedLabelChange={onProviderLabelChange} />
        </Form.Item>
        <Form.Item name="startDate" label="Начало" rules={[{ required: true }]}>
          <DatePicker showTime={{ format: TIME_FORMAT }} format={DATE_TIME_FORMAT} className="wide" />
        </Form.Item>
        <Form.Item label="Повторение">
          <Checkbox
            checked={recurrenceEnabled}
            disabled={recurrenceTypesLoading || !weeklyRecurrenceType}
            onChange={(event) => {
              handleRecurrenceEnabledChange(event.target.checked);
            }}
          >
            Повторять еженедельно
          </Checkbox>
        </Form.Item>
        {recurrenceEnabled ? (
          <>
            <Form.Item
              name="patternEndDate"
              label="Повторять до"
              rules={[{ required: true, message: "Укажите дату окончания повторения" }]}
            >
              <DatePicker
                format={DATE_FORMAT}
                className="wide"
                disabledDate={(current) => {
                  return current.isBefore(startDate.startOf("day"));
                }}
              />
            </Form.Item>
            <Form.Item
              name="weeklyDays"
              label="Дни недели"
              rules={[
                {
                  validator: (_, value?: number[]) => {
                    if (value?.length) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Выберите хотя бы один день недели"));
                  },
                },
              ]}
            >
              <Checkbox.Group className={styles.weeklyDays} options={weeklyDayOptions} />
            </Form.Item>
            <div className={styles.recurrenceHint}>
              <Typography.Text type="secondary">{getRecurrenceSummary("weekly", startDate, weeklyDays)}</Typography.Text>
            </div>
          </>
        ) : null}
      </Form>
    </Modal>
  );
}

export function RecurringDeleteModal({
  appointment,
  deletePending,
  isStale,
  onCancel,
  onDelete,
}: {
  appointment: Appointment | null;
  deletePending: boolean;
  isStale: boolean;
  onCancel: () => void;
  onDelete: (appointment: Appointment, scope: AppointmentDeleteScope) => void;
}) {
  return (
    <Modal
      open={appointment !== null}
      title="Удалить повторяющуюся запись"
      onCancel={deletePending ? undefined : onCancel}
      footer={null}
      destroyOnHidden
    >
      {appointment ? (
        <Space orientation="vertical" size={16} className="wide">
          {isStale ? (
            <StatusBanner
              type="warning"
              title="Запись изменилась в другом окне"
              description={formatRecordActivitySummary(appointment.lastActivity)}
            />
          ) : null}
          <Typography.Text>Выберите, как удалить запись на {formatDateTime(dayjs(appointment.startDate))}.</Typography.Text>
          <Space orientation="vertical" size={10} className={`wide ${styles.recurringDeleteActions}`}>
            <Button
              danger
              block
              loading={deletePending}
              onClick={() => {
                onDelete(appointment, "single");
              }}
            >
              Только эту запись
            </Button>
            <Button
              danger
              block
              loading={deletePending}
              onClick={() => {
                onDelete(appointment, "this-and-following");
              }}
            >
              Эту и следующие
            </Button>
            <Button
              danger
              block
              loading={deletePending}
              onClick={() => {
                onDelete(appointment, "all");
              }}
            >
              Все записи
            </Button>
            <Button block disabled={deletePending} onClick={onCancel}>
              Отмена
            </Button>
          </Space>
        </Space>
      ) : null}
    </Modal>
  );
}

export function RecurringRescheduleModal({
  appointment,
  nextStartDate,
  reschedulePending,
  isStale,
  onCancel,
  onReschedule,
}: {
  appointment: Appointment | null;
  nextStartDate: Dayjs | null;
  reschedulePending: boolean;
  isStale: boolean;
  onCancel: () => void;
  onReschedule: (appointment: Appointment, nextStartDate: Dayjs, scope: AppointmentRescheduleScope) => void;
}) {
  return (
    <Modal
      open={appointment !== null && nextStartDate !== null}
      title="Перенести повторяющуюся запись"
      onCancel={reschedulePending ? undefined : onCancel}
      footer={null}
      destroyOnHidden
    >
      {appointment && nextStartDate ? (
        <Space orientation="vertical" size={16} className="wide">
          {isStale ? (
            <StatusBanner
              type="warning"
              title="Запись изменилась в другом окне"
              description={formatRecordActivitySummary(appointment.lastActivity)}
            />
          ) : null}
          <Typography.Text>
            Выберите, как перенести запись с {formatDateTime(dayjs(appointment.startDate))} на {formatDateTime(nextStartDate)}.
          </Typography.Text>
          <Space orientation="vertical" size={10} className={`wide ${styles.recurringDeleteActions}`}>
            <Button
              block
              loading={reschedulePending}
              onClick={() => {
                onReschedule(appointment, nextStartDate, "single");
              }}
            >
              Только эту запись
            </Button>
            <Button
              block
              loading={reschedulePending}
              onClick={() => {
                onReschedule(appointment, nextStartDate, "this-and-following");
              }}
            >
              Эту и следующие
            </Button>
            <Button
              block
              loading={reschedulePending}
              onClick={() => {
                onReschedule(appointment, nextStartDate, "all");
              }}
            >
              Все записи
            </Button>
            <Button block disabled={reschedulePending} onClick={onCancel}>
              Отмена
            </Button>
          </Space>
        </Space>
      ) : null}
    </Modal>
  );
}

export function AppointmentDetailsModal({
  appointment,
  isStale,
  onClose,
  onEdit,
  onStatusChange,
  onDelete,
  onCreatePayment,
}: {
  appointment: Appointment | null;
  isStale: boolean;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
  onStatusChange: (appointment: Appointment, status: AppointmentStatus) => void;
  onDelete: (appointment: Appointment) => void;
  onCreatePayment?: (appointment: Appointment) => void;
}) {
  if (!appointment) {
    return null;
  }

  const start = dayjs(appointment.startDate);
  const end = dayjs(appointment.endDate);
  const clientName = [appointment.client.lastName, appointment.client.firstName, appointment.client.patronymic].filter(Boolean).join(" ");
  const recurrenceSummary = appointment.recurringRule ? formatRecurringRuleSummary(appointment.recurringRule) : null;

  return (
    <Modal open title="Запись" onCancel={onClose} footer={null}>
      <Space orientation="vertical" size={18} className="wide">
        {isStale ? (
          <StatusBanner
            type="warning"
            title="Запись изменилась в другом окне"
            description={formatRecordActivitySummary(appointment.lastActivity)}
          />
        ) : null}
        <div className={styles.detailsHeader}>
          <div>
            <Typography.Title level={3}>{clientName}</Typography.Title>
            <Typography.Text type="secondary">
              {formatDateTime(start)} - {end.format(TIME_FORMAT)}
            </Typography.Text>
          </div>
          {hasClientContacts(appointment.client.contacts) ? (
            <Space wrap className={styles.contactLinks}>
              {appointment.client.contacts?.phone ? (
                <Button
                  shape="circle"
                  icon={<PhoneOutlined />}
                  href={getPhoneUri(appointment.client.contacts.phone)}
                  title={appointment.client.contacts.phone}
                />
              ) : null}
              {appointment.client.contacts?.telegram ? (
                <Button
                  shape="circle"
                  icon={<SendOutlined />}
                  href={appointment.client.contacts.telegram}
                  target="_blank"
                  rel="noreferrer"
                  title="Telegram"
                />
              ) : null}
              {appointment.client.contacts?.vk ? (
                <Button
                  shape="circle"
                  icon={<LinkOutlined />}
                  href={appointment.client.contacts.vk}
                  target="_blank"
                  rel="noreferrer"
                  title="VK"
                />
              ) : null}
            </Space>
          ) : null}
        </div>
        <div className={styles.detailsGrid}>
          <div>
            <div className={styles.detailValue}>{appointment.service.name}</div>
            <Typography.Text type="secondary">Услуга</Typography.Text>
          </div>
          {appointment.provider ? (
            <div>
              <div className={styles.detailValue}>
                {appointment.provider.lastName} {appointment.provider.firstName}
              </div>
              <Typography.Text type="secondary">Преподаватель</Typography.Text>
            </div>
          ) : null}
          <div>
            <div className={styles.detailValue}>
              <Select
                value={appointment.status}
                options={appointmentStatusOptions}
                popupMatchSelectWidth={false}
                onChange={(status) => {
                  if (status !== appointment.status) {
                    onStatusChange(appointment, status);
                  }
                }}
              />
            </div>
            <Typography.Text type="secondary">Статус</Typography.Text>
          </div>
          {recurrenceSummary ? (
            <div>
              <div className={styles.detailValue}>{recurrenceSummary}</div>
              <Typography.Text type="secondary">Повторение</Typography.Text>
            </div>
          ) : null}
        </div>
        <Space wrap>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              onEdit(appointment);
            }}
          >
            Изменить
          </Button>
          {onCreatePayment ? (
            <Button
              icon={<DollarOutlined />}
              onClick={() => {
                onCreatePayment(appointment);
              }}
            >
              Создать платеж
            </Button>
          ) : null}
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              onDelete(appointment);
            }}
          >
            Удалить
          </Button>
        </Space>
      </Space>
    </Modal>
  );
}

function getRecurrenceSummary(key: RecurrenceType["key"], startDate?: Dayjs, weeklyDays?: number[]) {
  if (key === "daily") {
    return "Будет создаваться каждый день в это же время.";
  }

  if (key === "weekly") {
    const days = weeklyDayOptions
      .filter((item) => weeklyDays?.includes(item.value))
      .map((item) => item.label)
      .join(", ");

    return days ? `Будет создаваться каждую неделю: ${days}.` : "Выберите дни недели для повторения.";
  }

  if (!startDate) {
    return "Будет создаваться ежемесячно в выбранную дату.";
  }

  return `Будет создаваться ${String(startDate.date())} числа каждого месяца в это же время.`;
}

function getWeeklyBitmaskValue(date: Dayjs) {
  const day = date.day();

  if (day === 0) {
    return 64;
  }

  return 2 ** (day - 1);
}

function hasClientContacts(contacts: Appointment["client"]["contacts"]) {
  return Boolean(contacts?.phone || contacts?.telegram || contacts?.vk);
}

function formatRecurringRuleSummary(rule: NonNullable<Appointment["recurringRule"]>) {
  const ruleStart = dayjs(rule.startDate);
  const until = rule.endDate ? ` до ${dayjs(rule.endDate).format(DATE_FORMAT)}` : "";

  if (rule.key === "daily") {
    return `Каждый день с ${ruleStart.format(DATE_FORMAT)}${until}`;
  }

  if (rule.key === "weekly") {
    const weeklyDays = formatWeeklyPattern(rule.recurrencePattern);
    return `Каждую неделю: ${weeklyDays} с ${ruleStart.format(DATE_FORMAT)}${until}`;
  }

  const dayOfMonth = rule.recurrencePattern ?? ruleStart.date();
  return `Каждый месяц ${String(dayOfMonth)} числа с ${ruleStart.format(DATE_FORMAT)}${until}`;
}

function formatWeeklyPattern(pattern?: number | null) {
  if (!pattern) {
    return "дни не указаны";
  }

  return weeklyDayOptions
    .filter((item) => (pattern & item.value) === item.value)
    .map((item) => item.label)
    .join(", ");
}

const appointmentStatusOptions: { value: AppointmentStatus; label: ReactNode }[] = [
  {
    value: "planned",
    label: (
      <Space size={8}>
        <ClockCircleOutlined />
        {getAppointmentStatusLabel("planned")}
      </Space>
    ),
  },
  {
    value: "completed",
    label: (
      <Space size={8}>
        <CheckOutlined />
        {getAppointmentStatusLabel("completed")}
      </Space>
    ),
  },
  {
    value: "cancelled",
    label: (
      <Space size={8}>
        <CloseOutlined />
        {getAppointmentStatusLabel("cancelled")}
      </Space>
    ),
  },
  {
    value: "burned",
    label: (
      <Space size={8}>
        <FireOutlined />
        {getAppointmentStatusLabel("burned")}
      </Space>
    ),
  },
];
