import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { queryKeys } from "@/api/queryKeys";
import { paymentsApi } from "@/api/crm";
import { getApiErrorMessages } from "@/api/http";
import { useDraftFormState } from "@/features/drafts/useDraftFormState";
import { createOrQueueOffline } from "@/features/offline/createOrQueueOffline";
import { useCreatedReferenceOptions } from "@/features/reference-books/useCreatedReferenceOptions";
import { useOpenCreateRouteIntent } from "@/features/navigation/useOpenCreateRouteIntent";
import { formatDateTime } from "@/utils/date";
import { downloadBlob } from "@/utils/download";
import { isShortcutTarget, matchesPlainKey } from "@/utils/shortcuts";
import { handleStaleEntityConflict } from "@/utils/staleEntity";
import type { PaymentCreateFormValues } from "@/features/payments/PaymentCreateModal";

export type PaymentDraftValues = {
  clientId?: string;
  serviceId?: string;
  quantity?: number;
  amount?: number;
  date?: string;
  description?: string;
};

const PAYMENT_CREATE_DRAFT_KEY = "draft:payments:create";
const getDefaultPaymentsDateRange = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export function usePaymentsPageController() {
  const {
    hasSavedDraft,
    replayKeyRef,
    isHydratingRef,
    loadDraftValues,
    withHydration,
    resetStoredDraft,
    saveDraftValues: saveDraftFormValues,
  } = useDraftFormState<PaymentDraftValues>(PAYMENT_CREATE_DRAFT_KEY);
  const [page, setPage] = useState(1);
  const hasCreateDraft = hasSavedDraft;
  const [isOpen, setOpen] = useState(() => hasCreateDraft);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState<string | undefined>();
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(() => getDefaultPaymentsDateRange());
  const [isQuickClientCreateOpen, setQuickClientCreateOpen] = useState(false);
  const createdClientOptions = useCreatedReferenceOptions("client");
  const [createClientLabel, setCreateClientLabel] = useState<string | undefined>();
  const [createServiceLabel, setCreateServiceLabel] = useState<string | undefined>();
  const [selectedServicePrice, setSelectedServicePrice] = useState<number | undefined>();
  const [form] = Form.useForm<PaymentCreateFormValues>();
  const selectedCreateServiceId = Form.useWatch("serviceId", form);
  const selectedCreateQuantity = Form.useWatch("quantity", form) ?? 1;
  const draftHydrationRef = isHydratingRef;
  const createRouteIntent = useOpenCreateRouteIntent();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };
  const createPrefillClientId = createRouteIntent.prefillClientId;
  const isCreateModalOpen = isOpen || createRouteIntent.hasOpenCreateIntent;
  const listQueryKey = queryKeys.payments.list(page, search, clientId, serviceId, dateRange?.[0], dateRange?.[1]);

  const query = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      paymentsApi.list({
        page,
        page_size: 10,
        search: search.trim() || undefined,
        clientId,
        serviceId,
        start: dateRange?.[0]?.startOf("day").toISOString(),
        end: dateRange?.[1]?.endOf("day").toISOString(),
      }),
  });

  const createMutation = useMutation({
    mutationFn: (values: PaymentCreateFormValues) =>
      createOrQueueOffline({
        input: {
          clientId: values.clientId,
          serviceId: values.serviceId,
          amount: values.amount,
          date: values.date.toISOString(),
          description: values.description,
        },
        replayKey: replayKeyRef.current,
        create: (input) => paymentsApi.create(input, { replayKey: replayKeyRef.current }),
        buildQueueItem: (input, replayKey) => ({
          kind: "payments:create",
          replayKey,
          payload: { ...input, clientLabel: createClientLabel, serviceLabel: createServiceLabel },
        }),
      }),
    onSuccess: async (result) => {
      message.success(result.offline ? "Платеж сохранен локально" : "Платеж создан");
      closeCreateModal();
      resetStoredDraft();
      if (!result.offline) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      }
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, expectedActivityId }: { id: string; expectedActivityId?: string }) => {
      return paymentsApi.remove(id, { expectedActivityId });
    },
    onSuccess: async () => {
      message.success("Платеж удален");
      await queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: queryKeys.payments.all,
        showErrors,
        title: "Платеж уже изменен",
        okText: "Удалить все равно",
        cancelText: "Обновить список",
        onConfirm: (conflict) => {
          deleteMutation.mutate({ id: variables.id, expectedActivityId: conflict.currentActivity?.id });
        },
        onReload: () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
        },
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      paymentsApi.export({
        search: search.trim() || undefined,
        clientId,
        serviceId,
        start: dateRange?.[0]?.startOf("day").toISOString(),
        end: dateRange?.[1]?.endOf("day").toISOString(),
      }),
    onSuccess: (blob) => {
      downloadBlob(blob, `payments_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
      message.success("Экспорт готов");
    },
    onError: showErrors,
  });

  const openCreateModal = useCallback(() => {
    setOpen(true);
  }, []);

  const resetFilters = useCallback(() => {
    setSearch("");
    setClientId(undefined);
    setServiceId(undefined);
    setDateRange(getDefaultPaymentsDateRange());
    setPage(1);
  }, []);

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    const draftValues = loadDraftValues() ?? {};
    withHydration(() => {
      form.setFieldsValue({
        clientId: draftValues.clientId ?? createPrefillClientId,
        serviceId: draftValues.serviceId,
        quantity: draftValues.quantity ?? 1,
        amount: draftValues.amount,
        date: draftValues.date ? dayjs(draftValues.date) : dayjs(),
        description: draftValues.description,
      });
    });
  }, [createPrefillClientId, form, isCreateModalOpen, loadDraftValues, withHydration]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (matchesPlainKey(event, "a")) {
        event.preventDefault();
        openCreateModal();
        return;
      }

      if (matchesPlainKey(event, "x")) {
        event.preventDefault();
        exportMutation.mutate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [exportMutation, openCreateModal]);

  useEffect(() => {
    if (!selectedCreateServiceId || selectedServicePrice === undefined || draftHydrationRef.current) {
      return;
    }

    form.setFieldValue("amount", selectedServicePrice * selectedCreateQuantity);
  }, [draftHydrationRef, form, selectedCreateQuantity, selectedCreateServiceId, selectedServicePrice]);

  function closeCreateModal() {
    setOpen(false);
    withHydration(() => {
      form.setFieldsValue({
        clientId: undefined,
        serviceId: undefined,
        quantity: 1,
        amount: undefined,
        date: dayjs(),
        description: undefined,
      });
    });
    setSelectedServicePrice(undefined);
    createRouteIntent.clearOpenCreateIntent();
  }

  function handleClearCreateDraft() {
    resetStoredDraft(() => {
      form.setFieldsValue({
        clientId: createPrefillClientId,
        serviceId: undefined,
        quantity: 1,
        amount: undefined,
        date: dayjs(),
        description: undefined,
      });
    });
    setSelectedServicePrice(undefined);
  }

  return {
    page,
    setPage,
    search,
    setSearch,
    clientId,
    setClientId,
    serviceId,
    setServiceId,
    dateRange,
    setDateRange,
    isQuickClientCreateOpen,
    setQuickClientCreateOpen,
    createdClientOptions: createdClientOptions.createdOptions,
    createClientLabel,
    setCreateClientLabel,
    setCreateServiceLabel,
    selectedServicePrice,
    setSelectedServicePrice,
    form,
    draftHydrationRef,
    selectedCreateServiceId,
    hasCreateDraft,
    isCreateModalOpen,
    query,
    createMutation,
    deleteMutation,
    exportMutation,
    openCreateModal,
    closeCreateModal,
    resetFilters,
    handleClearCreateDraft,
    onCreateValuesChange: (_: Partial<PaymentCreateFormValues>, values: PaymentCreateFormValues) => {
      saveDraftFormValues({
        ...values,
        date: values.date.toISOString(),
      });
    },
    onQuickClientCreated: (client: { id: string; displayName: string; isOffline?: boolean }) => {
      createdClientOptions.addCreatedOption({
        id: client.id,
        label: client.displayName,
        optionLabel: client.isOffline ? `${client.displayName} (локально)` : client.displayName,
      });
      setCreateClientLabel(client.displayName);
      form.setFieldValue("clientId", client.id);
      setQuickClientCreateOpen(false);
    },
  };
}

export function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Нет данных";
}
