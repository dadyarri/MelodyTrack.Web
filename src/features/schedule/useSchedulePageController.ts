import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { scheduleApi } from "../../api/crm";
import type { Appointment, RecurrenceType, Ulid } from "../../api/types";
import { getApiErrorMessages } from "../../api/http";
import { useAuth } from "../../features/auth/useAuth";
import { getDraftReplayKey, hasDraft, loadDraft, resetDraft, saveDraftValues, withDraftHydration } from "../../utils/drafts";
import { enqueueOfflineCreate, shouldQueueOfflineError } from "../../utils/offlineQueue";
import { isShortcutTarget, matchesPlainKey } from "../../utils/shortcuts";
import { findItemInQueryData, handleStaleEntityConflict, isActivityStale } from "../../utils/staleEntity";
import type { AppointmentDeleteScope, AppointmentEditFormValues, AppointmentFormValues } from "./ScheduleModals";

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const APPOINTMENT_CREATE_DRAFT_KEY = "draft:appointments:create";

type SchedulePageLocationState = {
  openCreate?: boolean;
  clientId?: string;
};

export type AppointmentDraftValues = {
  clientId?: string;
  serviceId?: string;
  providerId?: string;
  startDate?: string;
  recurrenceTypeId?: string;
  patternEndDate?: string;
  weeklyDays?: number[];
};

export function useSchedulePageController() {
  const [weekStart, setWeekStart] = useState(dayjs().startOf("week"));
  const hasCreateDraft = hasDraft(APPOINTMENT_CREATE_DRAFT_KEY);
  const [isOpen, setOpen] = useState(() => hasCreateDraft);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedAppointmentBaselineActivityId, setSelectedAppointmentBaselineActivityId] = useState<Ulid | null | undefined>();
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [appointmentToEditBaselineActivityId, setAppointmentToEditBaselineActivityId] = useState<Ulid | null | undefined>();
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [appointmentToDeleteBaselineActivityId, setAppointmentToDeleteBaselineActivityId] = useState<Ulid | null | undefined>();
  const [isQuickClientCreateOpen, setQuickClientCreateOpen] = useState(false);
  const [createdClientOptions, setCreatedClientOptions] = useState<DefaultOptionType[]>([]);
  const [providerFilterId, setProviderFilterId] = useState<string | undefined>();
  const [pendingCreateStartDate, setPendingCreateStartDate] = useState<Dayjs | null>(null);
  const draftReplayKeyRef = useRef(getDraftReplayKey<AppointmentDraftValues>(APPOINTMENT_CREATE_DRAFT_KEY));
  const isDraftHydratingRef = useRef(false);
  const [createClientLabel, setCreateClientLabel] = useState<string | undefined>();
  const [createServiceLabel, setCreateServiceLabel] = useState<string | undefined>();
  const [createProviderLabel, setCreateProviderLabel] = useState<string | undefined>();
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
  const lockedProviderId = isSpecialistFilterLocked ? auth.user?.id : undefined;
  const locationState = (location.state ?? null) as SchedulePageLocationState | null;
  const createPrefillClientId = locationState?.openCreate ? locationState.clientId : undefined;
  const isCreateModalOpen = isOpen || Boolean(locationState?.openCreate);

  const openCreateModal = useCallback(() => {
    setPendingCreateStartDate(null);
    setOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (matchesPlainKey(event, "arrowleft")) {
        event.preventDefault();
        setWeekStart((value) => value.subtract(1, "week"));
        return;
      }

      if (matchesPlainKey(event, "arrowright")) {
        event.preventDefault();
        setWeekStart((value) => value.add(1, "week"));
        return;
      }

      if (matchesPlainKey(event, "home")) {
        event.preventDefault();
        setWeekStart(dayjs().startOf("week"));
        return;
      }

      if (matchesPlainKey(event, "a")) {
        event.preventDefault();
        openCreateModal();
        return;
      }

      if (matchesPlainKey(event, "m") && !isSpecialistFilterLocked && auth.user?.id) {
        event.preventDefault();
        setProviderFilterId((current) => (current === auth.user?.id ? undefined : auth.user?.id));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [auth.user?.id, isSpecialistFilterLocked, openCreateModal]);

  const query = useQuery({
    queryKey: ["appointments", range[0].toISOString(), range[1].toISOString()],
    queryFn: () => scheduleApi.list({ timezone, startDate: range[0].toISOString(), endDate: range[1].toISOString() }),
    refetchInterval: selectedAppointment || appointmentToEdit || appointmentToDelete ? 5000 : false,
  });
  const recurrenceTypesQuery = useQuery({
    queryKey: ["appointments", "recurrenceTypes"],
    queryFn: scheduleApi.recurrenceTypes,
  });

  const filteredAppointments = (query.data ?? []).filter((appointment) => {
    if (effectiveProviderFilterId && appointment.provider?.id !== effectiveProviderFilterId) {
      return false;
    }
    return true;
  });

  const currentSelectedAppointment = selectedAppointment ? (query.data ?? []).find((item) => item.id === selectedAppointment.id) ?? selectedAppointment : null;
  const currentEditingAppointment = appointmentToEdit ? (query.data ?? []).find((item) => item.id === appointmentToEdit.id) ?? appointmentToEdit : null;
  const currentDeletingAppointment = appointmentToDelete ? (query.data ?? []).find((item) => item.id === appointmentToDelete.id) ?? appointmentToDelete : null;
  const isSelectedAppointmentStale = currentSelectedAppointment
    ? isActivityStale(currentSelectedAppointment.lastActivity?.id, selectedAppointmentBaselineActivityId)
    : false;
  const isEditingAppointmentStale = currentEditingAppointment
    ? isActivityStale(currentEditingAppointment.lastActivity?.id, appointmentToEditBaselineActivityId)
    : false;
  const isDeletingAppointmentStale = currentDeletingAppointment
    ? isActivityStale(currentDeletingAppointment.lastActivity?.id, appointmentToDeleteBaselineActivityId)
    : false;

  const createMutation = useMutation({
    mutationFn: async (values: AppointmentFormValues) => {
      const input = buildCreateAppointmentPayload(values, recurrenceTypesQuery.data ?? []);
      try {
        return { input, offline: false as const, response: await scheduleApi.create(input, { replayKey: draftReplayKeyRef.current }) };
      } catch (error) {
        if (!shouldQueueOfflineError(error)) {
          throw error;
        }

        enqueueOfflineCreate({
          kind: "appointments:create",
          replayKey: draftReplayKeyRef.current,
          payload: {
            ...input,
            clientLabel: createClientLabel,
            serviceLabel: createServiceLabel,
            providerLabel: createProviderLabel,
          },
        });
        return { input, offline: true as const, response: null };
      }
    },
    onSuccess: async (result) => {
      message.success(result.offline ? "Запись сохранена локально" : "Запись создана");
      if (result.offline) {
        queryClient.setQueriesData<Appointment[]>({ queryKey: ["appointments"] }, (current) => {
          if (!current) {
            return current;
          }

          const optimisticAppointment = buildOptimisticOfflineAppointment(
            result.input,
            draftReplayKeyRef.current,
            recurrenceTypesQuery.data?.find((item) => item.id === result.input.recurrenceTypeId)?.key,
            createClientLabel,
            createServiceLabel,
            createProviderLabel,
          );

          return [...current, optimisticAppointment];
        });
      }
      closeCreateModal();
      resetDraft(APPOINTMENT_CREATE_DRAFT_KEY, draftReplayKeyRef);
      if (!result.offline) {
        await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      }
    },
    onError: showErrors,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input, expectedActivityId }: { id: string; input: { isCompleted?: boolean; isCanceled?: boolean }; expectedActivityId?: Ulid }) =>
      scheduleApi.update(id, { ...input, expectedActivityId }),
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
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: ["appointments"],
        showErrors,
        title: "Запись уже изменена",
        okText: "Повторить поверх новой версии",
        cancelText: "Обновить данные",
        onConfirm: (conflict) => updateMutation.mutate({ ...variables, expectedActivityId: conflict.currentActivity?.id }),
        onReload: () => {
          const freshAppointment = findItemInQueryData(queryClient, ["appointments"], (data: Appointment[] | undefined) => data, variables.id);
          if (!freshAppointment) {
            return;
          }

          setSelectedAppointment(freshAppointment);
          setSelectedAppointmentBaselineActivityId(freshAppointment.lastActivity?.id ?? null);
        },
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, input, expectedActivityId }: { id: string; input: AppointmentEditFormValues; expectedActivityId?: Ulid }) =>
      scheduleApi.update(id, {
        clientId: input.clientId,
        serviceId: input.serviceId,
        providerId: input.providerId,
        startDate: input.startDate.toISOString(),
        expectedActivityId,
      }),
    onSuccess: async () => {
      message.success("Запись обновлена");
      setAppointmentToEdit(null);
      setAppointmentToEditBaselineActivityId(undefined);
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: async (error, variables) => {
      if (!appointmentToEdit) {
        showErrors(error);
        return;
      }

      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: ["appointments"],
        showErrors,
        title: "Запись уже изменена",
        okText: "Перезаписать",
        cancelText: "Обновить форму",
        onConfirm: (nextConflict) => editMutation.mutate({ ...variables, expectedActivityId: nextConflict.currentActivity?.id }),
        onReload: () => {
          const freshAppointment = findItemInQueryData(queryClient, ["appointments"], (data: Appointment[] | undefined) => data, appointmentToEdit.id) ?? currentEditingAppointment;
          if (!freshAppointment) {
            return;
          }

          setAppointmentToEdit(freshAppointment);
          setAppointmentToEditBaselineActivityId(freshAppointment.lastActivity?.id ?? null);
          editForm.setFieldsValue({
            clientId: freshAppointment.client.id,
            serviceId: freshAppointment.service.id,
            providerId: lockedProviderId ?? freshAppointment.provider?.id,
            startDate: dayjs(freshAppointment.startDate),
          });
        },
      });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ appointment, startDate, expectedActivityId }: { appointment: Appointment; startDate: Dayjs; expectedActivityId?: Ulid }) =>
      scheduleApi.update(appointment.id, {
        startDate: startDate.toISOString(),
        expectedActivityId,
      }),
    onSuccess: async (_, variables) => {
      message.success("Запись перенесена");

      if (selectedAppointment?.id === variables.appointment.id) {
        setSelectedAppointment(null);
        setSelectedAppointmentBaselineActivityId(undefined);
      }

      if (appointmentToEdit?.id === variables.appointment.id) {
        setAppointmentToEdit(null);
        setAppointmentToEditBaselineActivityId(undefined);
      }

      if (appointmentToDelete?.id === variables.appointment.id) {
        setAppointmentToDelete(null);
        setAppointmentToDeleteBaselineActivityId(undefined);
      }

      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: ["appointments"],
        showErrors,
        title: "Запись уже изменена",
        okText: "Перенести поверх новой версии",
        cancelText: "Обновить данные",
        onConfirm: (conflict) => rescheduleMutation.mutate({ ...variables, expectedActivityId: conflict.currentActivity?.id }),
        onReload: () => {
          const freshAppointment = findItemInQueryData(queryClient, ["appointments"], (data: Appointment[] | undefined) => data, variables.appointment.id);
          if (!freshAppointment) {
            return;
          }

          if (selectedAppointment?.id === variables.appointment.id) {
            setSelectedAppointment(freshAppointment);
            setSelectedAppointmentBaselineActivityId(freshAppointment.lastActivity?.id ?? null);
          }

          if (appointmentToEdit?.id === variables.appointment.id) {
            setAppointmentToEdit(freshAppointment);
            setAppointmentToEditBaselineActivityId(freshAppointment.lastActivity?.id ?? null);
          }

          if (appointmentToDelete?.id === variables.appointment.id) {
            setAppointmentToDelete(freshAppointment);
            setAppointmentToDeleteBaselineActivityId(freshAppointment.lastActivity?.id ?? null);
          }
        },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, scope, expectedActivityId }: { id: string; scope?: AppointmentDeleteScope; expectedActivityId?: Ulid }) =>
      scheduleApi.remove(id, scope, { expectedActivityId }),
    onSuccess: async () => {
      message.success("Запись удалена");
      setSelectedAppointment(null);
      setSelectedAppointmentBaselineActivityId(undefined);
      setAppointmentToDelete(null);
      setAppointmentToDeleteBaselineActivityId(undefined);
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: ["appointments"],
        showErrors,
        title: "Запись уже изменена",
        okText: "Удалить все равно",
        cancelText: "Обновить данные",
        onConfirm: (conflict) => deleteMutation.mutate({ ...variables, expectedActivityId: conflict.currentActivity?.id }),
        onReload: () => {
          const freshAppointment = findItemInQueryData(queryClient, ["appointments"], (data: Appointment[] | undefined) => data, variables.id);
          if (!freshAppointment) {
            return;
          }

          if (appointmentToDelete?.id === variables.id) {
            setAppointmentToDelete(freshAppointment);
            setAppointmentToDeleteBaselineActivityId(freshAppointment.lastActivity?.id ?? null);
          }

          setSelectedAppointment(freshAppointment);
          setSelectedAppointmentBaselineActivityId(freshAppointment.lastActivity?.id ?? null);
        },
      });
    },
  });

  const handleCreateDraftChange = useCallback((values: AppointmentFormValues) => {
    if (isDraftHydratingRef.current) {
      return;
    }

    saveDraftValues<AppointmentDraftValues>(APPOINTMENT_CREATE_DRAFT_KEY, draftReplayKeyRef.current, serializeAppointmentDraft(values));
  }, []);

  const openCreateModalAt = useCallback((startDate: Dayjs) => {
    setPendingCreateStartDate(startDate.second(0).millisecond(0));
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    const draft = loadDraft<AppointmentDraftValues>(APPOINTMENT_CREATE_DRAFT_KEY);
    const startDate = draft?.values.startDate ? dayjs(draft.values.startDate) : pendingCreateStartDate ?? dayjs();
    const providerId = isSpecialistFilterLocked ? auth.user?.id : draft?.values.providerId;

    draftReplayKeyRef.current = draft?.replayKey ?? getDraftReplayKey<AppointmentDraftValues>(APPOINTMENT_CREATE_DRAFT_KEY);
    withDraftHydration(isDraftHydratingRef, () => {
      form.setFieldsValue({
        clientId: draft?.values.clientId ?? createPrefillClientId,
        serviceId: draft?.values.serviceId,
        providerId,
        startDate,
        recurrenceTypeId: draft?.values.recurrenceTypeId,
        patternEndDate: draft?.values.patternEndDate ? dayjs(draft.values.patternEndDate) : undefined,
        weeklyDays: draft?.values.weeklyDays,
      });
    });
  }, [auth.user?.id, createPrefillClientId, form, isCreateModalOpen, isSpecialistFilterLocked, pendingCreateStartDate]);

  function clearCreateRouteState() {
    if (!location.state) {
      return;
    }

    navigate(location.pathname, { replace: true, state: null });
  }

  function closeCreateModal() {
    setOpen(false);
    setPendingCreateStartDate(null);
    withDraftHydration(isDraftHydratingRef, () => form.resetFields());
    clearCreateRouteState();
  }

  function handleClearCreateDraft() {
    resetDraft(APPOINTMENT_CREATE_DRAFT_KEY, draftReplayKeyRef);
    withDraftHydration(isDraftHydratingRef, () => {
      form.setFieldsValue({
        clientId: createPrefillClientId,
        serviceId: undefined,
        providerId: isSpecialistFilterLocked ? auth.user?.id : undefined,
        startDate: pendingCreateStartDate ?? dayjs(),
        recurrenceTypeId: undefined,
        patternEndDate: undefined,
        weeklyDays: undefined,
      });
    });
  }

  return {
    auth,
    weekStart,
    setWeekStart,
    query,
    recurrenceTypesQuery,
    filteredAppointments,
    currentSelectedAppointment,
    currentEditingAppointment,
    currentDeletingAppointment,
    isSelectedAppointmentStale,
    isEditingAppointmentStale,
    isDeletingAppointmentStale,
    selectedAppointment,
    selectedAppointmentBaselineActivityId,
    appointmentToEdit,
    appointmentToEditBaselineActivityId,
    appointmentToDeleteBaselineActivityId,
    isQuickClientCreateOpen,
    setQuickClientCreateOpen,
    createdClientOptions,
    setCreatedClientOptions,
    providerFilterId,
    setProviderFilterId,
    effectiveProviderFilterId,
    isSpecialistFilterLocked,
    lockedProviderId,
    form,
    editForm,
    hasCreateDraft,
    isCreateModalOpen,
    createMutation,
    updateMutation,
    editMutation,
    rescheduleMutation,
    deleteMutation,
    openCreateModal,
    openCreateModalAt,
    closeCreateModal,
    handleCreateDraftChange,
    handleClearCreateDraft,
    setSelectedAppointment,
    setSelectedAppointmentBaselineActivityId,
    setAppointmentToEdit,
    setAppointmentToEditBaselineActivityId,
    setAppointmentToDelete,
    setAppointmentToDeleteBaselineActivityId,
    setCreateClientLabel,
    setCreateServiceLabel,
    setCreateProviderLabel,
    createPrefillClientId,
    onQuickClientCreated: (client: { id: string; displayName: string; isOffline?: boolean }) => {
      const option = { value: client.id, label: client.isOffline ? `${client.displayName} (локально)` : client.displayName };
      setCreatedClientOptions((current) => [option, ...current]);
      setCreateClientLabel(client.displayName);

      if (isCreateModalOpen) {
        form.setFieldValue("clientId", client.id);
      }

      if (appointmentToEdit) {
        editForm.setFieldValue("clientId", client.id);
      }

      setQuickClientCreateOpen(false);
    },
    modal,
  };
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


function serializeAppointmentDraft(values: AppointmentFormValues): AppointmentDraftValues {
  return {
    clientId: values.clientId,
    serviceId: values.serviceId,
    providerId: values.providerId,
    startDate: values.startDate.toISOString(),
    recurrenceTypeId: values.recurrenceTypeId,
    patternEndDate: values.patternEndDate?.toISOString(),
    weeklyDays: values.weeklyDays,
  };
}

function buildOptimisticOfflineAppointment(
  input: ReturnType<typeof buildCreateAppointmentPayload>,
  replayKey: string,
  recurrenceKey: RecurrenceType["key"] | undefined,
  clientLabel?: string,
  serviceLabel?: string,
  providerLabel?: string,
): Appointment {
  const clientNameParts = (clientLabel ?? input.clientId).split(" ");
  const serviceName = serviceLabel ?? input.serviceId;
  const providerNameParts = (providerLabel ?? "").split(" ").filter(Boolean);
  const startDate = dayjs(input.startDate);
  const endDate = startDate.add(1, "hour");

  return {
    id: `offline:${replayKey}`,
    client: {
      id: input.clientId,
      firstName: clientNameParts[1] ?? clientNameParts[0] ?? "Клиент",
      lastName: clientNameParts[0] ?? "Клиент",
      patronymic: clientNameParts.slice(2).join(" ") || undefined,
    },
    service: {
      id: input.serviceId,
      name: serviceName,
    },
    provider: providerNameParts.length
      ? {
          id: input.providerId ?? "offline-provider",
          firstName: providerNameParts[1] ?? providerNameParts[0] ?? "Специалист",
          lastName: providerNameParts[0] ?? "Специалист",
          roleDisplayName: "",
        }
      : undefined,
    startDate: input.startDate,
    endDate: endDate.toISOString(),
    isCompleted: false,
    isCanceled: false,
    recurringRule: input.recurrenceTypeId
      ? {
          id: `offline-rule:${replayKey}`,
          startDate: input.startDate,
          endDate: input.patternEndDate ?? null,
          key: recurrenceKey ?? "daily",
          recurrencePattern: input.recurrencePattern ?? null,
        }
      : null,
    lastActivity: null,
  };
}
