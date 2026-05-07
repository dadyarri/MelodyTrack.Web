import { CheckOutlined, CloseOutlined, DeleteOutlined, LeftOutlined, LinkOutlined, PhoneOutlined, PlusOutlined, RightOutlined, SendOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, DatePicker, Empty, Form, Modal, Space, Tag, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { CSSProperties } from "react";
import { useState } from "react";
import { scheduleApi } from "../api/crm";
import { getApiErrorMessages } from "../api/http";
import { Appointment } from "../api/types";
import { PageHeader } from "../components/PageHeader";
import { ClientSelect, ServiceSelect, UserSelect } from "../components/RemoteSelect";

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const defaultStartHour = 10;
const defaultEndHour = 20;
const hourHeight = 64;
const serviceColors = [
  { background: "#dff0ff", border: "#4e8fc8" },
  { background: "#fff2c2", border: "#b8860b" },
  { background: "#dff0d4", border: "#5f8f4d" },
  { background: "#eadfff", border: "#7b61c8" },
  { background: "#ffdfe7", border: "#c85f7d" },
  { background: "#dff7ef", border: "#3f9b7c" },
];

export function SchedulePage() {
  const [weekStart, setWeekStart] = useState(dayjs().startOf("week"));
  const [isOpen, setOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));
  const range: [Dayjs, Dayjs] = [weekStart, weekStart.endOf("week")];

  const query = useQuery({
    queryKey: ["appointments", range[0].toISOString(), range[1].toISOString()],
    queryFn: () => scheduleApi.list({ timezone, startDate: range[0].toISOString(), endDate: range[1].toISOString() }),
  });

  const createMutation = useMutation({
    mutationFn: (values: { clientId: string; serviceId: string; providerId?: string; startDate: dayjs.Dayjs }) =>
      scheduleApi.create({ ...values, startDate: values.startDate.toISOString() }),
    onSuccess: async () => {
      message.success("Запись создана");
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: showErrors,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { isCompleted?: boolean; isCanceled?: boolean } }) => scheduleApi.update(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: scheduleApi.remove,
    onSuccess: async () => {
      message.success("Запись удалена");
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: showErrors,
  });

  return (
    <>
      <PageHeader
        title="Расписание"
        actions={
          <>
            <Space.Compact className="schedule-week-controls">
              <Button icon={<LeftOutlined />} onClick={() => setWeekStart((value) => value.subtract(1, "week"))} />
              <Button onClick={() => setWeekStart(dayjs().startOf("week"))}>Сегодня</Button>
              <Button icon={<RightOutlined />} onClick={() => setWeekStart((value) => value.add(1, "week"))} />
            </Space.Compact>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Добавить</Button>
          </>
        }
      />
      <AppointmentsCalendar
        appointments={query.data ?? []}
        loading={query.isLoading}
        range={range}
        onSelect={setSelectedAppointment}
      />
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onComplete={(appointment) => updateMutation.mutate({ id: appointment.id, input: { isCompleted: true, isCanceled: false } })}
        onCancel={(appointment) => updateMutation.mutate({ id: appointment.id, input: { isCanceled: true } })}
        onDelete={(appointment) => modal.confirm({ title: "Удалить запись?", onOk: () => deleteMutation.mutate(appointment.id) })}
      />
      <Modal open={isOpen} title="Новая запись" onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ startDate: dayjs() }} onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="clientId" label="Клиент" rules={[{ required: true }]}>
            <ClientSelect />
          </Form.Item>
          <Form.Item name="serviceId" label="Услуга" rules={[{ required: true }]}>
            <ServiceSelect allowClear={false} />
          </Form.Item>
          <Form.Item name="providerId" label="Специалист">
            <UserSelect />
          </Form.Item>
          <Form.Item name="startDate" label="Начало" rules={[{ required: true }]}>
            <DatePicker showTime className="wide" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function AppointmentsCalendar({
  appointments,
  loading,
  range,
  onSelect,
}: {
  appointments: Appointment[];
  loading: boolean;
  range: [Dayjs, Dayjs];
  onSelect: (appointment: Appointment) => void;
}) {
  const days = getDays(range);
  const hours = getHours(appointments);
  const appointmentsByDay = groupAppointmentsByDay(appointments);

  return (
    <section className="schedule-calendar" aria-busy={loading}>
      <div className="schedule-calendar-desktop">
        <div className="schedule-calendar-header" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(144px, 1fr))` }}>
          <div className="schedule-calendar-corner" />
          {days.map((day) => (
            <div className={day.isSame(dayjs(), "day") ? "schedule-day-heading schedule-day-heading-today" : "schedule-day-heading"} key={day.format("YYYY-MM-DD")}>
              <span>{formatWeekday(day)}</span>
              <strong>{day.format("D")}</strong>
            </div>
          ))}
        </div>
        <div
          className="schedule-calendar-grid"
          style={{
            gridTemplateColumns: `72px repeat(${days.length}, minmax(144px, 1fr))`,
            minHeight: hours.length * hourHeight,
          }}
        >
          <div className="schedule-time-rail">
            {hours.map((hour) => (
              <div className="schedule-time-slot" key={hour}>
                {`${hour.toString().padStart(2, "0")}:00`}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div className="schedule-day-column" key={day.format("YYYY-MM-DD")}>
              {hours.map((hour) => (
                <div className="schedule-hour-line" key={hour} />
              ))}
              {(appointmentsByDay.get(day.format("YYYY-MM-DD")) ?? []).map((appointment) => (
                <AppointmentBlock
                  appointment={appointment}
                  day={day}
                  startHour={hours[0]}
                  key={appointment.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="schedule-calendar-mobile">
        {days.map((day) => {
          const dayAppointments = appointmentsByDay.get(day.format("YYYY-MM-DD")) ?? [];
          return (
            <section className="schedule-agenda-day" key={day.format("YYYY-MM-DD")}>
              <div className="schedule-agenda-heading">
                <Typography.Text strong>{day.format("D MMMM")}</Typography.Text>
                <Typography.Text type="secondary">{formatWeekday(day)}</Typography.Text>
              </div>
              {dayAppointments.length > 0 ? (
                dayAppointments.map((appointment) => (
                  <AppointmentAgendaItem
                    appointment={appointment}
                    key={appointment.id}
                    onSelect={onSelect}
                  />
                ))
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет записей" />
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function AppointmentBlock({
  appointment,
  day,
  startHour,
  onSelect,
}: {
  appointment: Appointment;
  day: Dayjs;
  startHour: number;
  onSelect: (appointment: Appointment) => void;
}) {
  const start = dayjs(appointment.startDate);
  const end = dayjs(appointment.endDate);
  const top = Math.max(0, start.diff(day.hour(startHour).minute(0).second(0), "minute") / 60 * hourHeight);
  const height = Math.max(48, end.diff(start, "minute") / 60 * hourHeight);

  return (
    <article
      role="button"
      tabIndex={0}
      className={`schedule-event ${getAppointmentClassName(appointment)}`}
      style={{ "--event-top": `${top}px`, "--event-height": `${height}px`, ...getServiceColorVars(appointment) } as CSSProperties}
      onClick={() => onSelect(appointment)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(appointment);
        }
      }}
    >
      <AppointmentContent appointment={appointment} compact />
    </article>
  );
}

function AppointmentAgendaItem({
  appointment,
  onSelect,
}: {
  appointment: Appointment;
  onSelect: (appointment: Appointment) => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      className={`schedule-agenda-item ${getAppointmentClassName(appointment)}`}
      style={getServiceColorVars(appointment) as CSSProperties}
      onClick={() => onSelect(appointment)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(appointment);
        }
      }}
    >
      <AppointmentContent appointment={appointment} />
    </article>
  );
}

function AppointmentContent({ appointment, compact = false }: { appointment: Appointment; compact?: boolean }) {
  const start = dayjs(appointment.startDate);
  const end = dayjs(appointment.endDate);
  const clientName = [appointment.client.lastName, appointment.client.firstName].filter(Boolean).join(" ");
  return (
    <div className="schedule-event-content">
      <div className="schedule-event-topline">
        <div className="schedule-event-time">{start.format("HH:mm")} - {end.format("HH:mm")}</div>
        <span className="schedule-event-status-icon" title={getAppointmentStatusLabel(appointment)}>
          {renderAppointmentStatusIcon(appointment)}
        </span>
      </div>
      <div className="schedule-event-title">{clientName}</div>
      <div className="schedule-event-service">{appointment.service.name}{!compact && appointment.provider ? ` · ${appointment.provider.lastName} ${appointment.provider.firstName}` : ""}</div>
    </div>
  );
}

function AppointmentActions({
  appointment,
  onComplete,
  onCancel,
  onDelete,
}: {
  appointment: Appointment;
  onComplete: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
}) {
  return (
    <Space size={4} className="schedule-event-actions">
      <Button size="small" icon={<CheckOutlined />} onClick={() => onComplete(appointment)} />
      <Button size="small" icon={<CloseOutlined />} onClick={() => onCancel(appointment)} />
      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(appointment)} />
    </Space>
  );
}

function AppointmentDetailsModal({
  appointment,
  onClose,
  onComplete,
  onCancel,
  onDelete,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onComplete: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
}) {
  if (!appointment) {
    return null;
  }

  const start = dayjs(appointment.startDate);
  const end = dayjs(appointment.endDate);
  const clientName = [appointment.client.lastName, appointment.client.firstName, appointment.client.patronymic].filter(Boolean).join(" ");

  return (
    <Modal open title="Запись" onCancel={onClose} footer={null}>
      <Space direction="vertical" size={18} className="wide">
        <div className="schedule-details-header">
          <div>
            <Typography.Title level={3}>{clientName}</Typography.Title>
            <Typography.Text type="secondary">{start.format("DD.MM.YYYY HH:mm")} - {end.format("HH:mm")}</Typography.Text>
          </div>
          {hasClientContacts(appointment.client.contacts) ? (
            <Space wrap className="schedule-contact-links">
              {appointment.client.contacts?.phone ? <Button shape="circle" icon={<PhoneOutlined />} href={`tel:${appointment.client.contacts.phone}`} title={appointment.client.contacts.phone} /> : null}
              {appointment.client.contacts?.telegram ? <Button shape="circle" icon={<SendOutlined />} href={appointment.client.contacts.telegram} target="_blank" rel="noreferrer" title="Telegram" /> : null}
              {appointment.client.contacts?.vk ? <Button shape="circle" icon={<LinkOutlined />} href={appointment.client.contacts.vk} target="_blank" rel="noreferrer" title="VK" /> : null}
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
              <div className="schedule-detail-value">{appointment.provider.lastName} {appointment.provider.firstName}</div>
              <Typography.Text type="secondary">Специалист</Typography.Text>
            </div>
          ) : null}
          <div>
            <div>{renderAppointmentStatus(appointment)}</div>
            <Typography.Text type="secondary">Статус</Typography.Text>
          </div>
        </div>
        <Space wrap>
          <Button icon={<CheckOutlined />} onClick={() => onComplete(appointment)}>
            Завершить
          </Button>
          <Button icon={<CloseOutlined />} onClick={() => onCancel(appointment)}>
            Отменить
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => onDelete(appointment)}>
            Удалить
          </Button>
        </Space>
      </Space>
    </Modal>
  );
}

function getDays(range: [Dayjs, Dayjs]) {
  const days: Dayjs[] = [];
  let cursor = range[0].startOf("day");
  const end = range[1].startOf("day");
  while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
    days.push(cursor);
    cursor = cursor.add(1, "day");
  }
  return days.filter((day) => day.day() !== 1 && day.day() !== 2);
}

function getHours(_appointments: Appointment[]) {
  return Array.from({ length: defaultEndHour - defaultStartHour + 1 }, (_, index) => defaultStartHour + index);
}

function groupAppointmentsByDay(appointments: Appointment[]) {
  return appointments.reduce((map, appointment) => {
    const key = dayjs(appointment.startDate).format("YYYY-MM-DD");
    const items = map.get(key) ?? [];
    items.push(appointment);
    items.sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf());
    map.set(key, items);
    return map;
  }, new Map<string, Appointment[]>());
}

function formatWeekday(day: Dayjs) {
  return day.format("dd").toUpperCase();
}

function formatVisibleWeekRange(range: [Dayjs, Dayjs]) {
  const days = getDays(range);
  const first = days[0] ?? range[0];
  const last = days.at(-1) ?? range[1];
  return `${first.format("D MMMM")} - ${last.format("D MMMM YYYY")}`;
}

function getAppointmentClassName(appointment: Appointment) {
  if (appointment.isCanceled) {
    return "schedule-event-canceled";
  }
  if (appointment.isCompleted) {
    return "schedule-event-completed";
  }
  return "schedule-event-planned";
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

function renderAppointmentStatusIcon(appointment: Appointment) {
  if (appointment.isCanceled) {
    return <CloseOutlined />;
  }
  if (appointment.isCompleted) {
    return <CheckOutlined />;
  }
  return <PlusOutlined />;
}

function getAppointmentStatusLabel(appointment: Appointment) {
  if (appointment.isCanceled) {
    return "Отменена";
  }
  if (appointment.isCompleted) {
    return "Завершена";
  }
  return "Запланирована";
}

function getServiceColorVars(appointment: Appointment) {
  const color = serviceColors[getStableColorIndex(appointment.service.name, serviceColors.length)];
  return {
    "--service-background": color.background,
    "--service-border": color.border,
  };
}

function getStableColorIndex(value: string, modulo: number) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % modulo;
  }
  return hash;
}

function hasClientContacts(contacts: Appointment["client"]["contacts"]) {
  return Boolean(contacts?.phone || contacts?.telegram || contacts?.vk);
}
