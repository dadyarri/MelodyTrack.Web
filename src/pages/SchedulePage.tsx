import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined, LeftOutlined, LinkOutlined, PhoneOutlined, PlusOutlined, RedoOutlined, RightOutlined, SendOutlined, SyncOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, Checkbox, DatePicker, Empty, Form, FormInstance, Modal, Select, Space, Tag, Typography } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import dayjs, { Dayjs } from "dayjs";
import { CSSProperties, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { scheduleApi } from "../api/crm";
import { getApiErrorMessages } from "../api/http";
import { ClientQuickCreateModal } from "../components/ClientQuickCreateModal";
import { Appointment, RecurrenceType } from "../api/types";
import { PageHeader } from "../components/PageHeader";
import { ClientSelect, ServiceSelect, UserSelect } from "../components/RemoteSelect";
import { useAuth } from "../features/auth/useAuth";
import { DATE_FORMAT, DATE_TIME_FORMAT, formatDate, formatDateTime, TIME_FORMAT } from "../utils/date";

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const defaultStartHour = 10;
const defaultEndHour = 20;
const hourHeight = 72;
const stackOffset = 8;
const serviceColors = [
  { background: "#84b6ea", border: "#4e8fc8" },
  { background: "#d8b35a", border: "#b8860b" },
  { background: "#7cb071", border: "#5f8f4d" },
  { background: "#9a84dc", border: "#7b61c8" },
  { background: "#d98aa0", border: "#c85f7d" },
  { background: "#6eb79e", border: "#3f9b7c" },
];
const weeklyDayOptions: { label: string; value: number }[] = [
  { label: "Пн", value: 1 },
  { label: "Вт", value: 2 },
  { label: "Ср", value: 4 },
  { label: "Чт", value: 8 },
  { label: "Пт", value: 16 },
  { label: "Сб", value: 32 },
  { label: "Вс", value: 64 },
];

type AppointmentFormValues = {
  clientId: string;
  serviceId: string;
  providerId?: string;
  startDate: Dayjs;
  recurrenceTypeId?: string;
  patternEndDate?: Dayjs;
  weeklyDays?: number[];
};

type AppointmentEditFormValues = {
  clientId: string;
  serviceId: string;
  providerId?: string;
  startDate: Dayjs;
};

type AppointmentDeleteScope = "single" | "this-and-following" | "all";
type SchedulePageLocationState = {
  openCreate?: boolean;
  clientId?: string;
};

export function SchedulePage() {
  const [weekStart, setWeekStart] = useState(dayjs().startOf("week"));
  const [isOpen, setOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [isQuickClientCreateOpen, setQuickClientCreateOpen] = useState(false);
  const [createdClientOptions, setCreatedClientOptions] = useState<DefaultOptionType[]>([]);
  const [providerFilterId, setProviderFilterId] = useState<string | undefined>();
  const auth = useAuth();
  const [form] = Form.useForm<AppointmentFormValues>();
  const [editForm] = Form.useForm<AppointmentEditFormValues>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));
  const range: [Dayjs, Dayjs] = [weekStart, weekStart.endOf("week")];
  const isSpecialistFilterLocked = Boolean(auth.user && !auth.user.isAdmin);
  const effectiveProviderFilterId = isSpecialistFilterLocked ? auth.user?.id : providerFilterId;
  const locationState = (location.state ?? null) as SchedulePageLocationState | null;
  const createPrefillClientId = locationState?.openCreate ? locationState.clientId : undefined;
  const isCreateModalOpen = isOpen || Boolean(locationState?.openCreate);

  const query = useQuery({
    queryKey: ["appointments", range[0].toISOString(), range[1].toISOString()],
    queryFn: () => scheduleApi.list({ timezone, startDate: range[0].toISOString(), endDate: range[1].toISOString() }),
  });
  const recurrenceTypesQuery = useQuery({
    queryKey: ["appointments", "recurrenceTypes"],
    queryFn: scheduleApi.recurrenceTypes,
  });
  const filteredAppointments = (query.data ?? []).filter((appointment) => {
    // Kept for quick restore if broader appointment filtering becomes necessary again.
    // const clientFilterId = undefined as string | undefined;
    // const serviceFilterId = undefined as string | undefined;
    // const statusFilter = undefined as "planned" | "completed" | "canceled" | undefined;
    //
    // if (clientFilterId && appointment.client.id !== clientFilterId) {
    //   return false;
    // }
    //
    // if (serviceFilterId && appointment.service.id !== serviceFilterId) {
    //   return false;
    // }

    if (effectiveProviderFilterId && appointment.provider?.id !== effectiveProviderFilterId) {
      return false;
    }

    // if (!statusFilter) {
    //   return true;
    // }
    //
    // if (statusFilter === "planned") {
    //   return !appointment.isCanceled && !appointment.isCompleted;
    // }
    //
    // if (statusFilter === "completed") {
    //   return appointment.isCompleted;
    // }
    //
    // return appointment.isCanceled;
    return true;
  });

  const createMutation = useMutation({
    mutationFn: (values: AppointmentFormValues) =>
      scheduleApi.create(buildCreateAppointmentPayload(values, recurrenceTypesQuery.data ?? [])),
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
    onMutate: async ({ id, input }) => {
      const nextState = (appointment: Appointment) =>
        appointment.id === id
          ? {
              ...appointment,
              ...(input.isCompleted !== undefined ? { isCompleted: input.isCompleted } : {}),
              ...(input.isCanceled !== undefined ? { isCanceled: input.isCanceled } : {}),
            }
          : appointment;

      setSelectedAppointment((current) => (current ? nextState(current) : current));
      queryClient.setQueriesData<Appointment[]>({ queryKey: ["appointments"] }, (current) =>
        current ? current.map(nextState) : current,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: showErrors,
  });

  const editMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AppointmentEditFormValues }) =>
      scheduleApi.update(id, {
        clientId: input.clientId,
        serviceId: input.serviceId,
        providerId: input.providerId,
        startDate: input.startDate.toISOString(),
      }),
    onSuccess: async () => {
      message.success("Запись обновлена");
      setAppointmentToEdit(null);
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, scope }: { id: string; scope?: AppointmentDeleteScope }) => scheduleApi.remove(id, scope),
    onSuccess: async () => {
      message.success("Запись удалена");
      setSelectedAppointment(null);
      setAppointmentToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: showErrors,
  });

  const openCreateModalAt = (startDate: Dayjs) => {
    form.setFieldsValue({
      clientId: undefined,
      serviceId: undefined,
      providerId: isSpecialistFilterLocked ? auth.user?.id : undefined,
      startDate: startDate.second(0).millisecond(0),
      recurrenceTypeId: undefined,
      patternEndDate: undefined,
      weeklyDays: undefined,
    });
    setOpen(true);
  };

  function openCreateModal() {
    setOpen(true);
  }

  function clearCreateRouteState() {
    if (!location.state) {
      return;
    }

    navigate(location.pathname, { replace: true, state: null });
  }

  function closeCreateModal() {
    setOpen(false);
    form.resetFields();
    clearCreateRouteState();
  }

  return (
    <>
      <section className="schedule-page">
        <PageHeader
          title="Расписание"
          actions={
            <>
              <Space.Compact className="schedule-week-controls">
                <Button icon={<LeftOutlined />} onClick={() => setWeekStart((value) => value.subtract(1, "week"))} />
                <Button onClick={() => setWeekStart(dayjs().startOf("week"))}>Сегодня</Button>
                <Button icon={<RightOutlined />} onClick={() => setWeekStart((value) => value.add(1, "week"))} />
              </Space.Compact>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>Добавить</Button>
            </>
          }
        />
        <div className="schedule-page-toolbar">
          <div className="schedule-quick-filters">
            <Typography.Text type="secondary">Специалист</Typography.Text>
            <Space.Compact className="schedule-quick-filters-controls">
              <UserSelect value={effectiveProviderFilterId} onChange={setProviderFilterId} disabled={isSpecialistFilterLocked} />
              <Button
                type={effectiveProviderFilterId === auth.user?.id ? "primary" : "default"}
                disabled={!auth.user?.id}
                hidden={isSpecialistFilterLocked}
                onClick={() => setProviderFilterId((current) => current === auth.user?.id ? undefined : auth.user?.id)}
              >
                Моё
              </Button>
              <Button
                disabled={isSpecialistFilterLocked || !effectiveProviderFilterId}
                onClick={() => {
                  setProviderFilterId(undefined);
                }}
              >
                Сбросить
              </Button>
            </Space.Compact>
            {/*
            <div className="filters-stack">
              <div className="filter-field">
                <Typography.Text type="secondary">Клиент</Typography.Text>
                <ClientSelect value={clientFilterId} onChange={setClientFilterId} />
              </div>
              <div className="filter-field filter-field-service">
                <Typography.Text type="secondary">Услуга</Typography.Text>
                <ServiceSelect value={serviceFilterId} onChange={setServiceFilterId} />
              </div>
              <div className="filter-field">
                <Typography.Text type="secondary">Статус</Typography.Text>
                <Select
                  allowClear
                  className="wide"
                  placeholder="Все статусы"
                  options={[
                    { value: "planned", label: "Запланирована" },
                    { value: "completed", label: "Завершена" },
                    { value: "canceled", label: "Отменена" },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
            </div>
            */}
          </div>
        </div>
        <div className="schedule-page-calendar">
          <AppointmentsCalendar
            appointments={filteredAppointments}
            loading={query.isLoading}
            range={range}
            onCreateAt={openCreateModalAt}
            onSelect={setSelectedAppointment}
            selectedAppointmentId={selectedAppointment?.id ?? null}
          />
        </div>
      </section>
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onEdit={(appointment) => {
          setSelectedAppointment(null);
          setAppointmentToEdit(appointment);
        }}
        onComplete={(appointment) => updateMutation.mutate({ id: appointment.id, input: { isCompleted: true, isCanceled: false } })}
        onCancel={(appointment) => updateMutation.mutate({ id: appointment.id, input: { isCanceled: true } })}
        onRestore={(appointment) => updateMutation.mutate({ id: appointment.id, input: { isCompleted: false, isCanceled: false } })}
        onDelete={(appointment) => {
          if (appointment.recurringRule) {
            setAppointmentToDelete(appointment);
            return;
          }

          modal.confirm({
            title: "Удалить запись?",
            onOk: () => deleteMutation.mutate({ id: appointment.id }),
          });
        }}
      />
      <RecurringDeleteModal
        appointment={appointmentToDelete}
        deletePending={deleteMutation.isPending}
        onCancel={() => setAppointmentToDelete(null)}
        onDelete={(appointment, scope) => deleteMutation.mutate({ id: appointment.id, scope })}
      />
      <AppointmentCreateModal
        createPending={createMutation.isPending}
        createdClientOptions={createdClientOptions}
        form={form}
        initialClientId={createPrefillClientId}
        lockedProviderId={isSpecialistFilterLocked ? auth.user?.id : undefined}
        onCreateClient={() => setQuickClientCreateOpen(true)}
        onCancel={closeCreateModal}
        onSubmit={(values) => createMutation.mutate(values)}
        open={isCreateModalOpen}
        recurrenceTypes={recurrenceTypesQuery.data ?? []}
        recurrenceTypesLoading={recurrenceTypesQuery.isLoading}
      />
      <AppointmentEditModal
        appointment={appointmentToEdit}
        createdClientOptions={createdClientOptions}
        editPending={editMutation.isPending}
        form={editForm}
        lockedProviderId={isSpecialistFilterLocked ? auth.user?.id : undefined}
        onCreateClient={() => setQuickClientCreateOpen(true)}
        onCancel={() => setAppointmentToEdit(null)}
        onSubmit={(values) => {
          if (!appointmentToEdit) {
            return;
          }

          editMutation.mutate({ id: appointmentToEdit.id, input: values });
        }}
      />
      <ClientQuickCreateModal
        open={isQuickClientCreateOpen}
        onCancel={() => setQuickClientCreateOpen(false)}
        onCreated={(client) => {
          const option = { value: client.id, label: client.displayName };
          setCreatedClientOptions((current) => [option, ...current]);

          if (isCreateModalOpen) {
            form.setFieldValue("clientId", client.id);
          }

          if (appointmentToEdit) {
            editForm.setFieldValue("clientId", client.id);
          }

          setQuickClientCreateOpen(false);
        }}
      />
    </>
  );
}

function AppointmentEditModal({
  appointment,
  createdClientOptions,
  editPending,
  form,
  lockedProviderId,
  onCreateClient,
  onCancel,
  onSubmit,
}: {
  appointment: Appointment | null;
  createdClientOptions: DefaultOptionType[];
  editPending: boolean;
  form: FormInstance<AppointmentEditFormValues>;
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
    <Modal open={appointment !== null} title="Редактировать запись" onCancel={onCancel} onOk={() => form.submit()} confirmLoading={editPending} destroyOnHidden>
      {appointment ? (
        <Form<AppointmentEditFormValues> form={form} layout="vertical" requiredMark={false} onFinish={onSubmit}>
          <Form.Item name="clientId" label="Клиент" rules={[{ required: true }]}>
            <Space direction="vertical" size={8} className="wide">
              <ClientSelect extraOptions={createdClientOptions} />
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

function AppointmentCreateModal({
  createPending,
  createdClientOptions,
  form,
  initialClientId,
  lockedProviderId,
  onCreateClient,
  onCancel,
  onSubmit,
  open,
  recurrenceTypes,
  recurrenceTypesLoading,
}: {
  createPending: boolean;
  createdClientOptions: DefaultOptionType[];
  form: FormInstance<AppointmentFormValues>;
  initialClientId?: string;
  lockedProviderId?: string;
  onCreateClient: () => void;
  onCancel: () => void;
  onSubmit: (values: AppointmentFormValues) => void;
  open: boolean;
  recurrenceTypes: RecurrenceType[];
  recurrenceTypesLoading: boolean;
}) {
  const recurrenceTypeId = Form.useWatch("recurrenceTypeId", form);
  const startDate = Form.useWatch("startDate", form);
  const weeklyDays = Form.useWatch("weeklyDays", form);
  const recurrenceType = recurrenceTypes.find((item) => item.id === recurrenceTypeId);
  const recurrenceKey = recurrenceType?.key;

  useEffect(() => {
    if (!open) {
      return;
    }

    form.setFieldsValue({
      clientId: initialClientId,
      providerId: lockedProviderId,
      startDate: form.getFieldValue("startDate") ?? dayjs(),
    });
  }, [form, initialClientId, lockedProviderId, open]);

  const handleRecurrenceTypeChange = (value?: string) => {
    form.setFieldValue("recurrenceTypeId", value);

    if (!value) {
      form.setFieldsValue({ patternEndDate: undefined, weeklyDays: undefined });
      return;
    }

    const nextType = recurrenceTypes.find((item) => item.id === value);
    if (nextType?.key === "weekly") {
      const nextStartDate = form.getFieldValue("startDate") ?? dayjs();
      const selectedDays = form.getFieldValue("weeklyDays");
      if (!selectedDays?.length) {
        form.setFieldValue("weeklyDays", [getWeeklyBitmaskValue(nextStartDate)]);
      }
    } else {
      form.setFieldValue("weeklyDays", undefined);
    }
  };

  return (
    <Modal open={open} title="Новая запись" onCancel={onCancel} onOk={() => form.submit()} confirmLoading={createPending} destroyOnHidden>
      <Form<AppointmentFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ startDate: dayjs() }}
        onFinish={onSubmit}
      >
        <Form.Item name="clientId" label="Клиент" rules={[{ required: true }]}>
          <Space direction="vertical" size={8} className="wide">
            <ClientSelect extraOptions={createdClientOptions} />
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
                  const nextStartDate = startDate ?? dayjs();
                  return current.isBefore(nextStartDate.startOf("day"));
                }}
              />
            </Form.Item>
            {recurrenceKey === "weekly" ? (
              <Form.Item
                name="weeklyDays"
                label="Дни недели"
                rules={[
                  {
                    validator: async (_, value?: number[]) => {
                      if (value?.length) {
                        return;
                      }
                      throw new Error("Выберите хотя бы один день недели");
                    },
                  },
                ]}
              >
                <Checkbox.Group className="schedule-weekly-days" options={weeklyDayOptions} />
              </Form.Item>
            ) : null}
            <div className="schedule-recurrence-hint">
              <Typography.Text type="secondary">
                {getRecurrenceSummary(recurrenceKey, startDate, weeklyDays)}
              </Typography.Text>
            </div>
          </>
        ) : null}
      </Form>
    </Modal>
  );
}

function AppointmentsCalendar({
  appointments,
  loading,
  range,
  onCreateAt,
  onSelect,
  selectedAppointmentId,
}: {
  appointments: Appointment[];
  loading: boolean;
  range: [Dayjs, Dayjs];
  onCreateAt: (startDate: Dayjs) => void;
  onSelect: (appointment: Appointment) => void;
  selectedAppointmentId: string | null;
}) {
  const days = getDays(range);
  const hours = getHours();
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
                <button
                  type="button"
                  className="schedule-hour-line schedule-hour-slot-button"
                  key={hour}
                  aria-label={`Создать запись на ${formatDate(day)} ${hour.toString().padStart(2, "0")}:00`}
                  onClick={() => onCreateAt(day.hour(hour).minute(0).second(0).millisecond(0))}
                />
              ))}
              {groupAppointmentsBySlot(appointmentsByDay.get(day.format("YYYY-MM-DD")) ?? []).map((appointmentsInSlot) => (
                <AppointmentStack
                  appointments={appointmentsInSlot}
                  day={day}
                  startHour={hours[0]}
                  key={appointmentsInSlot.map((appointment) => appointment.id).join(":")}
                  onSelect={onSelect}
                  selectedAppointmentId={selectedAppointmentId}
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
              <div className={day.isSame(dayjs(), "day") ? "schedule-agenda-heading schedule-agenda-heading-today" : "schedule-agenda-heading"}>
                <Typography.Text strong>{formatDate(day)}</Typography.Text>
                <Typography.Text type="secondary">{formatWeekday(day)}</Typography.Text>
              </div>
              {dayAppointments.length > 0 ? (
                dayAppointments.map((appointment) => (
                  <AppointmentAgendaItem
                    appointment={appointment}
                    isSelected={appointment.id === selectedAppointmentId}
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

function buildCreateAppointmentPayload(values: AppointmentFormValues, recurrenceTypes: RecurrenceType[]) {
  const recurrenceType = recurrenceTypes.find((item) => item.id === values.recurrenceTypeId);

  return {
    clientId: values.clientId,
    serviceId: values.serviceId,
    providerId: values.providerId,
    startDate: values.startDate.toISOString(),
    recurrenceTypeId: recurrenceType?.id,
    patternEndDate: recurrenceType ? values.patternEndDate?.endOf("day").toISOString() : undefined,
    recurrencePattern: recurrenceType ? getRecurrencePattern(recurrenceType.key, values.startDate, values.weeklyDays) : undefined,
  };
}

function getRecurrencePattern(key: RecurrenceType["key"], startDate: Dayjs, weeklyDays?: number[]) {
  if (key === "daily") {
    return 1;
  }

  if (key === "weekly") {
    return (weeklyDays ?? []).reduce((sum, day) => sum + day, 0);
  }

  return startDate.date();
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

  return `Будет создаваться ${startDate.date()} числа каждого месяца в это же время.`;
}

function getWeeklyBitmaskValue(date: Dayjs) {
  const day = date.day();

  if (day === 0) {
    return 64;
  }

  return 2 ** (day - 1);
}

function AppointmentStack({
  appointments,
  day,
  startHour,
  onSelect,
  selectedAppointmentId,
}: {
  appointments: Appointment[];
  day: Dayjs;
  startHour: number;
  onSelect: (appointment: Appointment) => void;
  selectedAppointmentId: string | null;
}) {
  const appointment = appointments[0];
  const start = dayjs(appointment.startDate);
  const longestEnd = appointments.reduce((latest, current) => {
    const currentEnd = dayjs(current.endDate);
    return currentEnd.isAfter(latest) ? currentEnd : latest;
  }, dayjs(appointment.endDate));
  const top = Math.max(0, start.diff(day.hour(startHour).minute(0).second(0), "minute") / 60 * hourHeight);
  const height = Math.max(48, longestEnd.diff(start, "minute") / 60 * hourHeight);
  const totalOffset = appointments.length > 1 ? stackOffset * (appointments.length - 1) : 0;
  const cardHeight = Math.max(48, height - totalOffset);
  const expandedOffset = 56;
  const slotTop = Math.floor(top / hourHeight) * hourHeight;

  return (
    <div
      className="schedule-stack"
      style={{
        "--event-top": `${top}px`,
        "--event-height": `${height}px`,
        "--stack-size": appointments.length,
        "--stack-expanded-height": `${height + expandedOffset * (appointments.length - 1)}px`,
        "--badge-top": `${slotTop - top + 4}px`,
      } as CSSProperties}
    >
      {appointments.length > 1 ? <div className="schedule-stack-badge">{appointments.length}</div> : null}
      {appointments.map((item, index) => (
        <article
          role="button"
          tabIndex={0}
          className={`schedule-entry schedule-event schedule-event-stacked ${getAppointmentClassName(item)}${item.id === selectedAppointmentId ? " schedule-entry-selected" : ""}`}
          style={{
            "--stack-index": index,
            "--stack-top": `${index * stackOffset}px`,
            "--stack-card-height": `${cardHeight}px`,
            ...getServiceColorVars(item),
          } as CSSProperties}
          key={item.id}
          onClick={() => onSelect(item)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(item);
            }
          }}
        >
          <AppointmentContent appointment={item} density={getStackDensity(appointments.length)} />
        </article>
      ))}
    </div>
  );
}

function AppointmentAgendaItem({
  appointment,
  isSelected,
  onSelect,
}: {
  appointment: Appointment;
  isSelected: boolean;
  onSelect: (appointment: Appointment) => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      className={`schedule-entry schedule-agenda-item ${getAppointmentClassName(appointment)}${isSelected ? " schedule-entry-selected" : ""}`}
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

function AppointmentContent({
  appointment,
  density = "full",
}: {
  appointment: Appointment;
  density?: "full" | "compact" | "dense";
}) {
  const start = dayjs(appointment.startDate);
  const end = dayjs(appointment.endDate);
  const clientName = [appointment.client.lastName, appointment.client.firstName].filter(Boolean).join(" ");
  const showProvider = density === "full" && appointment.provider;
  const showService = density !== "dense";

  return (
      <div className={`schedule-event-content schedule-event-content-${density}`}>
      <div className="schedule-event-topline">
        <div className="schedule-event-time">{start.format(TIME_FORMAT)} - {end.format(TIME_FORMAT)}</div>
        <div className="schedule-event-icons">
          <span className="schedule-event-status-icon" title={getAppointmentStatusLabel(appointment)}>
            {renderAppointmentStatusIcon(appointment)}
          </span>
          {appointment.recurringRule ? (
            <span className="schedule-event-status-icon schedule-event-recurring-icon" title="Повторяющаяся запись">
              <SyncOutlined />
            </span>
          ) : null}
        </div>
      </div>
      <div className="schedule-event-title">{clientName}</div>
      {showService ? (
        <div className="schedule-event-service">
          {appointment.service.name}
          {showProvider ? ` · ${appointment.provider!.lastName} ${appointment.provider!.firstName}` : ""}
        </div>
      ) : null}
    </div>
  );
}

function RecurringDeleteModal({
  appointment,
  deletePending,
  onCancel,
  onDelete,
}: {
  appointment: Appointment | null;
  deletePending: boolean;
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
        <Space direction="vertical" size={16} className="wide">
          <Typography.Text>
            Выберите, как удалить запись на {formatDateTime(dayjs(appointment.startDate))}.
          </Typography.Text>
          <Space direction="vertical" className="wide recurring-delete-actions">
            <Button danger block loading={deletePending} onClick={() => onDelete(appointment, "single")}>
              Только эту запись
            </Button>
            <Button danger block loading={deletePending} onClick={() => onDelete(appointment, "this-and-following")}>
              Эту и следующие
            </Button>
            <Button danger block loading={deletePending} onClick={() => onDelete(appointment, "all")}>
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

function AppointmentDetailsModal({
  appointment,
  onClose,
  onEdit,
  onComplete,
  onCancel,
  onRestore,
  onDelete,
}: {
  appointment: Appointment | null;
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
      <Space direction="vertical" size={18} className="wide">
        <div className="schedule-details-header">
          <div>
            <Typography.Title level={3}>{clientName}</Typography.Title>
            <Typography.Text type="secondary">{formatDateTime(start)} - {end.format(TIME_FORMAT)}</Typography.Text>
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
          {recurrenceSummary ? (
            <div>
              <div className="schedule-detail-value">{recurrenceSummary}</div>
              <Typography.Text type="secondary">Повторение</Typography.Text>
            </div>
          ) : null}
        </div>
        <Space wrap>
          <Button icon={<EditOutlined />} onClick={() => onEdit(appointment)}>
            Изменить
          </Button>
          {isPlanned ? (
            <Button icon={<CheckOutlined />} onClick={() => onComplete(appointment)}>
              Завершить
            </Button>
          ) : null}
          {isPlanned || isCompleted ? (
            <Button icon={<CloseOutlined />} onClick={() => onCancel(appointment)}>
              Отменить
            </Button>
          ) : null}
          {!isPlanned ? (
            <Button icon={<RedoOutlined />} onClick={() => onRestore(appointment)}>
              Вернуть в запланированные
            </Button>
          ) : null}
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

function getHours() {
  return Array.from({ length: defaultEndHour - defaultStartHour }, (_, index) => defaultStartHour + index);
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

function groupAppointmentsBySlot(appointments: Appointment[]) {
  const groups = new Map<string, Appointment[]>();

  for (const appointment of appointments) {
    const key = dayjs(appointment.startDate).format("YYYY-MM-DDTHH:mm");
    const items = groups.get(key) ?? [];
    items.push(appointment);
    groups.set(key, items);
  }

  return [...groups.values()].map((items) =>
    items.sort((left, right) => {
      if (left.isCanceled !== right.isCanceled) {
        return Number(left.isCanceled) - Number(right.isCanceled);
      }

      if (left.isCompleted !== right.isCompleted) {
        return Number(left.isCompleted) - Number(right.isCompleted);
      }

      return dayjs(left.endDate).valueOf() - dayjs(right.endDate).valueOf();
    }),
  );
}

function formatWeekday(day: Dayjs) {
  return day.format("dd").toUpperCase();
}

function getStackDensity(stackSize: number): "compact" | "dense" {
  return stackSize >= 3 ? "dense" : "compact";
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
  return `Каждый месяц ${dayOfMonth} числа с ${ruleStart.format(DATE_FORMAT)}${until}`;
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
