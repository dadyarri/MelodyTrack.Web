import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { queryKeys } from "@/api/queryKeys";
import { scheduleApi, usersApi } from "@/api/crm";
import { getApiErrorMessages } from "@/api/http";
import type { Appointment, AppointmentStatus, RecurrenceType, Ulid } from "@/api/types";
import { hasAdminAccess } from "@/features/auth/access";
import { useDraftFormState } from "@/features/drafts/useDraftFormState";
import { useOpenCreateRouteIntent } from "@/features/navigation/useOpenCreateRouteIntent";
import { createOrQueueOffline } from "@/features/offline/createOrQueueOffline";
import { usePaymentCreateController } from "@/features/payments/usePaymentCreateController";
import { useCreatedReferenceOptions } from "@/features/reference-books/useCreatedReferenceOptions";
import { useAuth } from "@/features/auth/useAuth";
import type {
  AppointmentDeleteScope,
  AppointmentEditFormValues,
  AppointmentFormValues,
  AppointmentRescheduleScope,
} from "@/features/schedule/ScheduleModals";
import { getBackgroundRefetchInterval } from "@/utils/refetch";
import { isShortcutTarget, matchesPlainKey } from "@/utils/shortcuts";
import { findItemInQueryData, handleStaleEntityConflict, isActivityStale } from "@/utils/staleEntity";
import { getVisibleScheduleHours } from "@/utils/userAvailability";

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const APPOINTMENT_CREATE_DRAFT_KEY = "draft:appointments:create";

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
  const {
    hasSavedDraft,
    replayKeyRef: draftReplayKeyRef,
    loadDraftValues,
    withHydration,
    resetStoredDraft,
    saveDraftValues: saveCreateDraftValues,
  } = useDraftFormState<AppointmentDraftValues>(APPOINTMENT_CREATE_DRAFT_KEY);
  const [weekStart, setWeekStart] = useState(dayjs().startOf("week"));
  const hasCreateDraft = hasSavedDraft;
  const [isOpen, setOpen] = useState(() => hasCreateDraft);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedAppointmentBaselineActivityId, setSelectedAppointmentBaselineActivityId] = useState<Ulid | null | undefined>();
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [appointmentToEditBaselineActivityId, setAppointmentToEditBaselineActivityId] = useState<Ulid | null | undefined>();
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [appointmentToDeleteBaselineActivityId, setAppointmentToDeleteBaselineActivityId] = useState<Ulid | null | undefined>();
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [appointmentToRescheduleStartDate, setAppointmentToRescheduleStartDate] = useState<Dayjs | null>(null);
  const [appointmentToRescheduleBaselineActivityId, setAppointmentToRescheduleBaselineActivityId] = useState<Ulid | null | undefined>();
  const [isQuickClientCreateOpen, setQuickClientCreateOpen] = useState(false);
  const createdClientOptions = useCreatedReferenceOptions("client");
  const [providerFilterId, setProviderFilterId] = useState<string | undefined>();
  const [pendingCreateStartDate, setPendingCreateStartDate] = useState<Dayjs | null>(null);
  const [pendingCreateProviderId, setPendingCreateProviderId] = useState<string | undefined>();
  const [createClientLabel, setCreateClientLabel] = useState<string | undefined>();
  const [createServiceLabel, setCreateServiceLabel] = useState<string | undefined>();
  const [createProviderLabel, setCreateProviderLabel] = useState<string | undefined>();
  const auth = useAuth();
  const [form] = Form.useForm<AppointmentFormValues>();
  const [editForm] = Form.useForm<AppointmentEditFormValues>();
  const createRouteIntent = useOpenCreateRouteIntent();
  const paymentCreate = usePaymentCreateController();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };
  const range: [Dayjs, Dayjs] = [weekStart, weekStart.endOf("week")];
  const canCreateAppointments = hasAdminAccess(auth.user);
  const isSpecialistFilterLocked = Boolean(auth.user && !hasAdminAccess(auth.user));
  const effectiveProviderFilterId = isSpecialistFilterLocked ? auth.user?.id : providerFilterId;
  const lockedProviderId = isSpecialistFilterLocked ? auth.user?.id : undefined;
  const createPrefillClientId = createRouteIntent.prefillClientId;
  const isCreateModalOpen = canCreateAppointments && (isOpen || createRouteIntent.hasOpenCreateIntent);

  const openCreateModal = useCallback(() => {
    if (!canCreateAppointments) {
      return;
    }

    setPendingCreateStartDate(null);
    setPendingCreateProviderId(lockedProviderId ?? effectiveProviderFilterId);
    setOpen(true);
  }, [canCreateAppointments, effectiveProviderFilterId, lockedProviderId]);

  const openPaymentCreateForAppointment = useCallback(
    (appointment: Appointment) => {
      if (!canCreateAppointments) {
        return;
      }

      setSelectedAppointment(null);
      setSelectedAppointmentBaselineActivityId(undefined);
      paymentCreate.openCreateModal({
        clientId: appointment.client.id,
        serviceId: appointment.service.id,
      });
    },
    [canCreateAppointments, paymentCreate],
  );

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
        if (!canCreateAppointments) {
          return;
        }

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
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [auth.user?.id, canCreateAppointments, isSpecialistFilterLocked, openCreateModal]);

  const query = useQuery({
    queryKey: queryKeys.schedule.appointments(range[0].toISOString(), range[1].toISOString()),
    queryFn: () => scheduleApi.list({ timezone, startDate: range[0].toISOString(), endDate: range[1].toISOString() }),
    refetchInterval: getBackgroundRefetchInterval(
      Boolean(selectedAppointment || appointmentToEdit || appointmentToDelete || appointmentToReschedule),
    ),
  });
  const recurrenceTypesQuery = useQuery({
    queryKey: queryKeys.schedule.recurrenceTypes,
    queryFn: () => scheduleApi.recurrenceTypes(),
  });
  const providerAvailabilityQuery = useQuery({
    queryKey: queryKeys.schedule.availability(effectiveProviderFilterId),
    queryFn: () => {
      if (!effectiveProviderFilterId) {
        throw new Error("Provider is not selected.");
      }

      return usersApi.getAvailability(effectiveProviderFilterId);
    },
    enabled: Boolean(effectiveProviderFilterId),
    retry: false,
  });
  const allProvidersAvailabilityQuery = useQuery({
    queryKey: queryKeys.users.availabilities,
    queryFn: () => usersApi.listAvailabilities(),
    enabled: hasAdminAccess(auth.user) && !effectiveProviderFilterId,
    retry: false,
  });

  const visibleHours = effectiveProviderFilterId
    ? getVisibleScheduleHours([providerAvailabilityQuery.data])
    : getVisibleScheduleHours(allProvidersAvailabilityQuery.data ?? []);

  const filteredAppointments = (query.data ?? []).filter((appointment) => {
    if (effectiveProviderFilterId && appointment.provider?.id !== effectiveProviderFilterId) {
      return false;
    }
    return true;
  });

  const currentSelectedAppointment = selectedAppointment
    ? ((query.data ?? []).find((item) => item.id === selectedAppointment.id) ?? selectedAppointment)
    : null;
  const currentEditingAppointment = appointmentToEdit
    ? ((query.data ?? []).find((item) => item.id === appointmentToEdit.id) ?? appointmentToEdit)
    : null;
  const currentDeletingAppointment = appointmentToDelete
    ? ((query.data ?? []).find((item) => item.id === appointmentToDelete.id) ?? appointmentToDelete)
    : null;
  const currentReschedulingAppointment = appointmentToReschedule
    ? ((query.data ?? []).find((item) => item.id === appointmentToReschedule.id) ?? appointmentToReschedule)
    : null;
  const isSelectedAppointmentStale = currentSelectedAppointment
    ? isActivityStale(currentSelectedAppointment.lastActivity?.id, selectedAppointmentBaselineActivityId)
    : false;
  const isEditingAppointmentStale = currentEditingAppointment
    ? isActivityStale(currentEditingAppointment.lastActivity?.id, appointmentToEditBaselineActivityId)
    : false;
  const isDeletingAppointmentStale = currentDeletingAppointment
    ? isActivityStale(currentDeletingAppointment.lastActivity?.id, appointmentToDeleteBaselineActivityId)
    : false;
  const isReschedulingAppointmentStale = currentReschedulingAppointment
    ? isActivityStale(currentReschedulingAppointment.lastActivity?.id, appointmentToRescheduleBaselineActivityId)
    : false;

  const syncAppointmentBaseline = useCallback(
    (appointmentId: Ulid) => {
      const freshAppointment = findItemInQueryData(
        queryClient,
        queryKeys.schedule.appointmentsAll,
        (data) => data as Appointment[] | undefined,
        appointmentId,
      );
      if (!freshAppointment) {
        return;
      }

      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment(freshAppointment);
        setSelectedAppointmentBaselineActivityId(freshAppointment.lastActivity?.id ?? null);
      }

      if (appointmentToEdit?.id === appointmentId) {
        setAppointmentToEdit(freshAppointment);
        setAppointmentToEditBaselineActivityId(freshAppointment.lastActivity?.id ?? null);
      }

      if (appointmentToDelete?.id === appointmentId) {
        setAppointmentToDelete(freshAppointment);
        setAppointmentToDeleteBaselineActivityId(freshAppointment.lastActivity?.id ?? null);
      }

      if (appointmentToReschedule?.id === appointmentId) {
        setAppointmentToReschedule(freshAppointment);
        setAppointmentToRescheduleBaselineActivityId(freshAppointment.lastActivity?.id ?? null);
      }
    },
    [appointmentToDelete?.id, appointmentToEdit?.id, appointmentToReschedule?.id, queryClient, selectedAppointment?.id],
  );

  const createMutation = useMutation({
    mutationFn: (values: AppointmentFormValues) =>
      createOrQueueOffline({
        input: buildCreateAppointmentPayload(values, recurrenceTypesQuery.data ?? [], timezone),
        replayKey: draftReplayKeyRef.current,
        create: (input) => scheduleApi.create(input, { replayKey: draftReplayKeyRef.current }),
        buildQueueItem: (input, replayKey) => ({
          kind: "appointments:create",
          replayKey,
          payload: {
            ...input,
            clientLabel: createClientLabel,
            serviceLabel: createServiceLabel,
            providerLabel: createProviderLabel,
          },
        }),
      }),
    onSuccess: async (result) => {
      message.success(result.offline ? "Запись сохранена локально" : "Запись создана");
      if (result.offline) {
        queryClient.setQueriesData<Appointment[]>({ queryKey: queryKeys.schedule.appointmentsAll }, (current) => {
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
      resetStoredDraft();
      if (!result.offline) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.schedule.appointmentsAll });
      }
    },
    onError: showErrors,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input, expectedActivityId }: { id: string; input: { status?: AppointmentStatus }; expectedActivityId?: Ulid }) =>
      scheduleApi.update(id, { ...input, expectedActivityId }),
    onMutate: ({ id, input }) => {
      const nextState = (appointment: Appointment) =>
        appointment.id === id
          ? {
              ...appointment,
              ...(input.status !== undefined ? { status: input.status } : {}),
            }
          : appointment;

      setSelectedAppointment((current) => (current ? nextState(current) : current));
      queryClient.setQueriesData<Appointment[]>({ queryKey: queryKeys.schedule.appointmentsAll }, (current) => {
        return current ? current.map(nextState) : current;
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.schedule.appointmentsAll });
      syncAppointmentBaseline(variables.id);
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: queryKeys.schedule.appointmentsAll,
        showErrors,
        title: "Запись уже изменена",
        okText: "Повторить поверх новой версии",
        cancelText: "Обновить данные",
        onConfirm: (conflict) => {
          updateMutation.mutate({ ...variables, expectedActivityId: conflict.currentActivity?.id });
        },
        onReload: () => {
          const freshAppointment = findItemInQueryData(
            queryClient,
            queryKeys.schedule.appointmentsAll,
            (data) => data as Appointment[] | undefined,
            variables.id,
          );
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
    mutationFn: ({ id, input, expectedActivityId }: { id: string; input: AppointmentEditFormValues; expectedActivityId?: Ulid }) => {
      return scheduleApi.update(id, {
        clientId: input.clientId,
        serviceId: input.serviceId,
        providerId: input.providerId,
        startDate: input.startDate.toISOString(),
        timezone,
        expectedActivityId,
      });
    },
    onSuccess: async () => {
      message.success("Запись обновлена");
      setAppointmentToEdit(null);
      setAppointmentToEditBaselineActivityId(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.schedule.appointmentsAll });
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
        invalidateQueryKey: queryKeys.schedule.appointmentsAll,
        showErrors,
        title: "Запись уже изменена",
        okText: "Перезаписать",
        cancelText: "Обновить форму",
        onConfirm: (nextConflict) => {
          editMutation.mutate({ ...variables, expectedActivityId: nextConflict.currentActivity?.id });
        },
        onReload: () => {
          const freshAppointment =
            findItemInQueryData(
              queryClient,
              queryKeys.schedule.appointmentsAll,
              (data) => data as Appointment[] | undefined,
              appointmentToEdit.id,
            ) ?? currentEditingAppointment;
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
    mutationFn: ({
      appointment,
      startDate,
      scope,
      expectedActivityId,
    }: {
      appointment: Appointment;
      startDate: Dayjs;
      scope?: AppointmentRescheduleScope;
      expectedActivityId?: Ulid;
    }) => {
      return scheduleApi.update(appointment.id, {
        startDate: startDate.toISOString(),
        timezone,
        scope,
        expectedActivityId,
      });
    },
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

      if (appointmentToReschedule?.id === variables.appointment.id) {
        setAppointmentToReschedule(null);
        setAppointmentToRescheduleStartDate(null);
        setAppointmentToRescheduleBaselineActivityId(undefined);
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.schedule.appointmentsAll });
      syncAppointmentBaseline(variables.appointment.id);
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: queryKeys.schedule.appointmentsAll,
        showErrors,
        title: "Запись уже изменена",
        okText: "Перенести поверх новой версии",
        cancelText: "Обновить данные",
        onConfirm: (conflict) => {
          rescheduleMutation.mutate({ ...variables, expectedActivityId: conflict.currentActivity?.id });
        },
        onReload: () => {
          const freshAppointment = findItemInQueryData(
            queryClient,
            queryKeys.schedule.appointmentsAll,
            (data) => data as Appointment[] | undefined,
            variables.appointment.id,
          );
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

          if (appointmentToReschedule?.id === variables.appointment.id) {
            setAppointmentToReschedule(freshAppointment);
            setAppointmentToRescheduleStartDate(variables.startDate);
            setAppointmentToRescheduleBaselineActivityId(freshAppointment.lastActivity?.id ?? null);
          }
        },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, scope, expectedActivityId }: { id: string; scope?: AppointmentDeleteScope; expectedActivityId?: Ulid }) => {
      return scheduleApi.remove(id, scope, { expectedActivityId });
    },
    onSuccess: async () => {
      message.success("Запись удалена");
      setSelectedAppointment(null);
      setSelectedAppointmentBaselineActivityId(undefined);
      setAppointmentToDelete(null);
      setAppointmentToDeleteBaselineActivityId(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.schedule.appointmentsAll });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: queryKeys.schedule.appointmentsAll,
        showErrors,
        title: "Запись уже изменена",
        okText: "Удалить все равно",
        cancelText: "Обновить данные",
        onConfirm: (conflict) => {
          deleteMutation.mutate({ ...variables, expectedActivityId: conflict.currentActivity?.id });
        },
        onReload: () => {
          const freshAppointment = findItemInQueryData(
            queryClient,
            queryKeys.schedule.appointmentsAll,
            (data) => data as Appointment[] | undefined,
            variables.id,
          );
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

  const handleCreateDraftChange = useCallback(
    (values: AppointmentFormValues) => {
      saveCreateDraftValues(serializeAppointmentDraft(values));
    },
    [saveCreateDraftValues],
  );

  const openCreateModalAt = useCallback(
    (startDate: Dayjs) => {
      if (!canCreateAppointments) {
        return;
      }

      setPendingCreateStartDate(startDate.second(0).millisecond(0));
      setPendingCreateProviderId(lockedProviderId ?? effectiveProviderFilterId);
      setOpen(true);
    },
    [canCreateAppointments, effectiveProviderFilterId, lockedProviderId],
  );

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    const draftValues = loadDraftValues();
    const startDate = draftValues?.startDate ? dayjs(draftValues.startDate) : (pendingCreateStartDate ?? dayjs());
    const providerId = pendingCreateProviderId ?? lockedProviderId ?? draftValues?.providerId;

    withHydration(() => {
      form.setFieldsValue({
        clientId: draftValues?.clientId ?? createPrefillClientId,
        serviceId: draftValues?.serviceId,
        providerId,
        startDate,
        recurrenceTypeId: draftValues?.recurrenceTypeId,
        patternEndDate: draftValues?.patternEndDate ? dayjs(draftValues.patternEndDate) : undefined,
        weeklyDays: draftValues?.weeklyDays,
      });
    });
  }, [
    createPrefillClientId,
    form,
    isCreateModalOpen,
    loadDraftValues,
    lockedProviderId,
    pendingCreateProviderId,
    pendingCreateStartDate,
    withHydration,
  ]);

  function closeCreateModal() {
    setOpen(false);
    setPendingCreateStartDate(null);
    setPendingCreateProviderId(undefined);
    withHydration(() => {
      form.resetFields();
    });
    createRouteIntent.clearOpenCreateIntent();
  }

  function handleClearCreateDraft() {
    resetStoredDraft(() => {
      form.setFieldsValue({
        clientId: createPrefillClientId,
        serviceId: undefined,
        providerId: pendingCreateProviderId ?? lockedProviderId,
        startDate: pendingCreateStartDate ?? dayjs(),
        recurrenceTypeId: undefined,
        patternEndDate: undefined,
        weeklyDays: undefined,
      });
    });
  }

  return {
    auth,
    canCreateAppointments,
    weekStart,
    setWeekStart,
    query,
    recurrenceTypesQuery,
    providerAvailabilityQuery,
    allProvidersAvailabilityQuery,
    visibleHours,
    filteredAppointments,
    currentSelectedAppointment,
    currentEditingAppointment,
    currentDeletingAppointment,
    currentReschedulingAppointment,
    appointmentToRescheduleStartDate,
    isSelectedAppointmentStale,
    isEditingAppointmentStale,
    isDeletingAppointmentStale,
    isReschedulingAppointmentStale,
    selectedAppointment,
    selectedAppointmentBaselineActivityId,
    appointmentToEdit,
    appointmentToEditBaselineActivityId,
    appointmentToDeleteBaselineActivityId,
    isQuickClientCreateOpen,
    setQuickClientCreateOpen,
    createdClientOptions: createdClientOptions.createdOptions,
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
    setAppointmentToReschedule,
    setAppointmentToRescheduleStartDate,
    setAppointmentToRescheduleBaselineActivityId,
    setCreateClientLabel,
    setCreateServiceLabel,
    setCreateProviderLabel,
    openPaymentCreateForAppointment,
    paymentCreate,
    createPrefillClientId,
    onQuickClientCreated: (client: { id: string; displayName: string; isOffline?: boolean }) => {
      createdClientOptions.addCreatedOption({
        id: client.id,
        label: client.displayName,
        optionLabel: client.isOffline ? `${client.displayName} (локально)` : client.displayName,
      });
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

function buildCreateAppointmentPayload(values: AppointmentFormValues, recurrenceTypes: RecurrenceType[], timezone: string) {
  const recurrenceType = recurrenceTypes.find((item) => item.id === values.recurrenceTypeId);

  return {
    clientId: values.clientId,
    serviceId: values.serviceId,
    providerId: values.providerId,
    startDate: values.startDate.toISOString(),
    timezone,
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
      firstName: clientNameParts[1] ?? clientNameParts[0],
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
          firstName: providerNameParts[1] ?? providerNameParts[0],
          lastName: providerNameParts[0] ?? "Преподаватель",
          roleDisplayName: "",
        }
      : undefined,
    startDate: input.startDate,
    endDate: endDate.toISOString(),
    status: "planned",
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
