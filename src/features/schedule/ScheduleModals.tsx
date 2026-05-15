import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  PhoneOutlined,
  RedoOutlined,
  SendOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";
import { Button, Checkbox, DatePicker, Form, Modal, Select, Space, Tag, Typography } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect } from "react";
import { ClientSelect, ServiceSelect, UserSelect } from "@/components/RemoteSelect";
import { DraftModalFooter, DraftModalTitle, StatusBanner } from "@/shared/ui";
import type { Appointment, RecurrenceType } from "../../api/types";
import { DATE_FORMAT, DATE_TIME_FORMAT, formatDateTime, TIME_FORMAT } from "../../utils/date";
import { formatRecordActivitySummary } from "../../utils/staleEntity";

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

export function AppointmentEditModal({
  appointment,
  createdClientOptions,
  editPending,
  form,
  isStale,
  lockedProviderId,
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
              <Button onClick={onCreateClient}>Новый клиент</Button>
            </Space>
          </Form.Item>
          <Form.Item name="serviceId" label="Услуга" rules={[{ required: true }]}>
            <ServiceSelect allowClear={false} />
          </Form.Item>
          <Form.Item name="providerId" label="Специалист">
            <UserSelect disabled={Boolean(lockedProviderId)} />
          </Form.Item>
          <Form.Item name="startDate" label="Начало" rules={[{ required: true }]}>
            <DatePicker showTime={{ format: TIME_FORMAT }} format={DATE_TIME_FORMAT} className="wide" />
          </Form.Item>
          {appointment.recurringRule ? (
            <Typography.Text type="secondary">
              Изменяются только клиент, услуга, специалист и время. Повторяющаяся серия останется без изменений.
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
  const recurrenceType = recurrenceTypes.find((item) => item.id === recurrenceTypeId);
  const recurrenceKey = recurrenceType?.key;

  const handleRecurrenceTypeChange = (value?: string) => {
    form.setFieldValue("recurrenceTypeId", value);

    if (!value) {
      form.setFieldsValue({ patternEndDate: undefined, weeklyDays: undefined });
      return;
    }

    const nextType = recurrenceTypes.find((item) => item.id === value);
    if (nextType?.key === "weekly") {
      const { startDate: currentStartDate, weeklyDays: currentWeeklyDays } = form.getFieldsValue(["startDate", "weeklyDays"]) as Pick<
        AppointmentFormValues,
        "startDate" | "weeklyDays"
      >;
      const nextStartDate = currentStartDate;
      if (!currentWeeklyDays?.length) {
        form.setFieldValue("weeklyDays", [getWeeklyBitmaskValue(nextStartDate)]);
      }
    } else {
      form.setFieldValue("weeklyDays", undefined);
    }
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
        <Form.Item label="Клиент">
          <Space orientation="vertical" size={8} className="wide">
            <Form.Item name="clientId" noStyle rules={[{ required: true }]}>
              <ClientSelect extraOptions={createdClientOptions} onResolvedLabelChange={onClientLabelChange} />
            </Form.Item>
            <Button onClick={onCreateClient}>Новый клиент</Button>
          </Space>
        </Form.Item>
        <Form.Item name="serviceId" label="Услуга" rules={[{ required: true }]}>
          <ServiceSelect allowClear={false} onResolvedLabelChange={onServiceLabelChange} />
        </Form.Item>
        <Form.Item name="providerId" label="Специалист">
          <UserSelect disabled={Boolean(lockedProviderId)} onResolvedLabelChange={onProviderLabelChange} />
        </Form.Item>
        <Form.Item name="startDate" label="Начало" rules={[{ required: true }]}>
          <DatePicker showTime={{ format: TIME_FORMAT }} format={DATE_TIME_FORMAT} className="wide" />
        </Form.Item>
        <Form.Item name="recurrenceTypeId" label="Повторение">
          <Select
            allowClear
            loading={recurrenceTypesLoading}
            options={recurrenceTypes.map((item) => ({ value: item.id, label: item.displayName }))}
            placeholder="Без повтора"
            value={recurrenceTypeId}
            onChange={handleRecurrenceTypeChange}
          />
        </Form.Item>
        {recurrenceKey ? (
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
            {recurrenceKey === "weekly" ? (
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
                <Checkbox.Group className="schedule-weekly-days" options={weeklyDayOptions} />
              </Form.Item>
            ) : null}
            <div className="schedule-recurrence-hint">
              <Typography.Text type="secondary">{getRecurrenceSummary(recurrenceKey, startDate, weeklyDays)}</Typography.Text>
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
          <Space orientation="vertical" className="wide recurring-delete-actions">
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

export function AppointmentDetailsModal({
  appointment,
  isStale,
  onClose,
  onEdit,
  onComplete,
  onCancel,
  onRestore,
  onDelete,
}: {
  appointment: Appointment | null;
  isStale: boolean;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
  onComplete: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onRestore: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
}) {
  if (!appointment) {
    return null;
  }

  const start = dayjs(appointment.startDate);
  const end = dayjs(appointment.endDate);
  const clientName = [appointment.client.lastName, appointment.client.firstName, appointment.client.patronymic].filter(Boolean).join(" ");
  const isPlanned = !appointment.isCanceled && !appointment.isCompleted;
  const isCompleted = appointment.isCompleted;
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
        <div className="schedule-details-header">
          <div>
            <Typography.Title level={3}>{clientName}</Typography.Title>
            <Typography.Text type="secondary">
              {formatDateTime(start)} - {end.format(TIME_FORMAT)}
            </Typography.Text>
          </div>
          {hasClientContacts(appointment.client.contacts) ? (
            <Space wrap className="schedule-contact-links">
              {appointment.client.contacts?.phone ? (
                <Button
                  shape="circle"
                  icon={<PhoneOutlined />}
                  href={`tel:${appointment.client.contacts.phone}`}
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
        <div className="schedule-details-grid">
          <div>
            <div className="schedule-detail-value">{appointment.service.name}</div>
            <Typography.Text type="secondary">Услуга</Typography.Text>
          </div>
          {appointment.provider ? (
            <div>
              <div className="schedule-detail-value">
                {appointment.provider.lastName} {appointment.provider.firstName}
              </div>
              <Typography.Text type="secondary">Специалист</Typography.Text>
            </div>
          ) : null}
          <div>
            <div>{renderAppointmentStatus(appointment)}</div>
            <Typography.Text type="secondary">Статус</Typography.Text>
          </div>
          {recurrenceSummary ? (
            <div>
              <div className="schedule-detail-value">{recurrenceSummary}</div>
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
          {isPlanned ? (
            <Button
              icon={<CheckOutlined />}
              onClick={() => {
                onComplete(appointment);
              }}
            >
              Завершить
            </Button>
          ) : null}
          {isPlanned || isCompleted ? (
            <Button
              icon={<CloseOutlined />}
              onClick={() => {
                onCancel(appointment);
              }}
            >
              Отменить
            </Button>
          ) : null}
          {!isPlanned ? (
            <Button
              icon={<RedoOutlined />}
              onClick={() => {
                onRestore(appointment);
              }}
            >
              Вернуть в запланированные
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

function renderAppointmentStatus(appointment: Appointment) {
  if (appointment.isCanceled) {
    return <Tag color="red">Отменена</Tag>;
  }
  if (appointment.isCompleted) {
    return <Tag color="green">Завершена</Tag>;
  }
  return <Tag color="gold">Запланирована</Tag>;
}
