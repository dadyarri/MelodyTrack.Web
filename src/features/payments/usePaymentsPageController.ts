import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { paymentsApi } from "../../api/crm";
import { getApiErrorMessages } from "../../api/http";
import { getDraftReplayKey, hasDraft, loadDraft, resetDraft, saveDraftValues, withDraftHydration } from "../../utils/drafts";
import { downloadBlob } from "../../utils/download";
import { formatDateTime } from "../../utils/date";
import { enqueueOfflineCreate, shouldQueueOfflineError } from "../../utils/offlineQueue";
import { isShortcutTarget, matchesPlainKey } from "../../utils/shortcuts";
import { handleStaleEntityConflict } from "../../utils/staleEntity";
import type { PaymentCreateFormValues } from "./PaymentCreateModal";

type PaymentPageLocationState = {
  openCreate?: boolean;
  clientId?: string;
};

export type PaymentDraftValues = {
  clientId?: string;
  serviceId?: string;
  quantity?: number;
  amount?: number;
  date?: string;
  description?: string;
};

const PAYMENT_CREATE_DRAFT_KEY = "draft:payments:create";

export function usePaymentsPageController() {
  const [page, setPage] = useState(1);
  const hasCreateDraft = hasDraft(PAYMENT_CREATE_DRAFT_KEY);
  const [isOpen, setOpen] = useState(() => hasCreateDraft);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState<string | undefined>();
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [isQuickClientCreateOpen, setQuickClientCreateOpen] = useState(false);
  const [createdClientOptions, setCreatedClientOptions] = useState<DefaultOptionType[]>([]);
  const [createClientLabel, setCreateClientLabel] = useState<string | undefined>();
  const [createServiceLabel, setCreateServiceLabel] = useState<string | undefined>();
  const [selectedServicePrice, setSelectedServicePrice] = useState<number | undefined>();
  const draftReplayKeyRef = useRef(getDraftReplayKey<PaymentDraftValues>(PAYMENT_CREATE_DRAFT_KEY));
  const isDraftHydratingRef = useRef(false);
  const [form] = Form.useForm();
  const selectedCreateServiceId = Form.useWatch("serviceId", form);
  const selectedCreateQuantity = Form.useWatch("quantity", form) ?? 1;
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };
  const locationState = (location.state ?? null) as PaymentPageLocationState | null;
  const createPrefillClientId = locationState?.openCreate ? locationState.clientId : undefined;
  const isCreateModalOpen = isOpen || Boolean(locationState?.openCreate);

  const query = useQuery({
    queryKey: ["payments", page, search, clientId, serviceId, dateRange?.[0]?.toISOString(), dateRange?.[1]?.toISOString()],
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
    mutationFn: async (values: PaymentCreateFormValues) => {
      const input = {
        clientId: values.clientId,
        serviceId: values.serviceId,
        amount: values.amount,
        date: values.date.toISOString(),
        description: values.description,
      };
      try {
        return { offline: false as const, response: await paymentsApi.create(input, { replayKey: draftReplayKeyRef.current }) };
      } catch (error) {
        if (!shouldQueueOfflineError(error)) {
          throw error;
        }

        enqueueOfflineCreate({
          kind: "payments:create",
          replayKey: draftReplayKeyRef.current,
          payload: { ...input, clientLabel: createClientLabel, serviceLabel: createServiceLabel },
        });
        return { offline: true as const, response: null };
      }
    },
    onSuccess: async (result) => {
      message.success(result.offline ? "Платеж сохранен локально" : "Платеж создан");
      closeCreateModal();
      resetDraft(PAYMENT_CREATE_DRAFT_KEY, draftReplayKeyRef);
      if (!result.offline) {
        await queryClient.invalidateQueries({ queryKey: ["payments"] });
      }
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, expectedActivityId }: { id: string; expectedActivityId?: string }) => paymentsApi.remove(id, { expectedActivityId }),
    onSuccess: async () => {
      message.success("Платеж удален");
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: ["payments"],
        showErrors,
        title: "Платеж уже изменен",
        okText: "Удалить все равно",
        cancelText: "Обновить список",
        onConfirm: (conflict) => deleteMutation.mutate({ id: variables.id, expectedActivityId: conflict.currentActivity?.id }),
        onReload: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
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

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    const draft = loadDraft<PaymentDraftValues>(PAYMENT_CREATE_DRAFT_KEY);
    const draftValues = draft?.values ?? {};

    draftReplayKeyRef.current = draft?.replayKey ?? getDraftReplayKey<PaymentDraftValues>(PAYMENT_CREATE_DRAFT_KEY);
    withDraftHydration(isDraftHydratingRef, () => {
      form.setFieldsValue({
        clientId: draftValues.clientId ?? createPrefillClientId,
        serviceId: draftValues.serviceId,
        quantity: draftValues.quantity ?? 1,
        amount: draftValues.amount,
        date: draftValues.date ? dayjs(draftValues.date) : dayjs(),
        description: draftValues.description,
      });
    });
  }, [createPrefillClientId, form, isCreateModalOpen]);

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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exportMutation, openCreateModal]);

  useEffect(() => {
    if (!selectedCreateServiceId || selectedServicePrice === undefined || isDraftHydratingRef.current) {
      return;
    }

    form.setFieldValue("amount", selectedServicePrice * selectedCreateQuantity);
  }, [form, selectedCreateQuantity, selectedCreateServiceId, selectedServicePrice]);

  function clearCreateRouteState() {
    if (!location.state) {
      return;
    }

    navigate(location.pathname, { replace: true, state: null });
  }

  function closeCreateModal() {
    setOpen(false);
    withDraftHydration(isDraftHydratingRef, () => {
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
    clearCreateRouteState();
  }

  function handleClearCreateDraft() {
    resetDraft(PAYMENT_CREATE_DRAFT_KEY, draftReplayKeyRef);
    withDraftHydration(isDraftHydratingRef, () => {
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
    createdClientOptions,
    setCreatedClientOptions,
    createClientLabel,
    setCreateClientLabel,
    setCreateServiceLabel,
    selectedServicePrice,
    setSelectedServicePrice,
    form,
    draftHydrationRef: isDraftHydratingRef,
    selectedCreateServiceId,
    hasCreateDraft,
    isCreateModalOpen,
    query,
    createMutation,
    deleteMutation,
    exportMutation,
    openCreateModal,
    closeCreateModal,
    handleClearCreateDraft,
    onCreateValuesChange: (_: Partial<PaymentCreateFormValues>, values: PaymentCreateFormValues) => {
      saveDraftValues<PaymentDraftValues>(PAYMENT_CREATE_DRAFT_KEY, draftReplayKeyRef.current, {
        ...values,
        date: values.date ? values.date.toISOString() : undefined,
      });
    },
    onQuickClientCreated: (client: { id: string; displayName: string; isOffline?: boolean }) => {
      setCreatedClientOptions((current) => [
        { value: client.id, label: client.isOffline ? `${client.displayName} (локально)` : client.displayName },
        ...current,
      ]);
      setCreateClientLabel(client.displayName);
      form.setFieldValue("clientId", client.id);
      setQuickClientCreateOpen(false);
    },
  };
}

export function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Нет данных";
}
