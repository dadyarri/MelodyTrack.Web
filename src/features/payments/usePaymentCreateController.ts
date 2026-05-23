import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { queryKeys } from "@/api/queryKeys";
import { paymentsApi } from "@/api/crm";
import { getApiErrorMessages } from "@/api/http";
import { useDraftFormState } from "@/features/drafts/useDraftFormState";
import { useOpenCreateRouteIntent } from "@/features/navigation/useOpenCreateRouteIntent";
import { createOrQueueOffline } from "@/features/offline/createOrQueueOffline";
import { useCreatedReferenceOptions } from "@/features/reference-books/useCreatedReferenceOptions";
import type { PaymentCreateFormValues } from "@/features/payments/PaymentCreateModal";

export type PaymentDraftValues = {
  clientId?: string;
  serviceId?: string;
  quantity?: number;
  amount?: number;
  date?: string;
  description?: string;
};

type PaymentCreatePrefill = {
  clientId?: string;
  serviceId?: string;
};

const PAYMENT_CREATE_DRAFT_KEY = "draft:payments:create";

export function usePaymentCreateController({ useRouteIntent = false }: { useRouteIntent?: boolean } = {}) {
  const { hasSavedDraft, replayKeyRef, isHydratingRef, loadDraftValues, withHydration, resetStoredDraft, saveDraftValues } =
    useDraftFormState<PaymentDraftValues>(PAYMENT_CREATE_DRAFT_KEY);
  const [isOpen, setOpen] = useState(() => hasSavedDraft);
  const [localPrefill, setLocalPrefill] = useState<PaymentCreatePrefill | null>(null);
  const [isQuickClientCreateOpen, setQuickClientCreateOpen] = useState(false);
  const createdClientOptions = useCreatedReferenceOptions("client");
  const [createClientLabel, setCreateClientLabel] = useState<string | undefined>();
  const [createServiceLabel, setCreateServiceLabel] = useState<string | undefined>();
  const [selectedServicePrice, setSelectedServicePrice] = useState<number | undefined>();
  const [form] = Form.useForm<PaymentCreateFormValues>();
  const selectedCreateServiceId = Form.useWatch("serviceId", form);
  const selectedCreateQuantity = Form.useWatch("quantity", form) ?? 1;
  const routeIntent = useOpenCreateRouteIntent();
  const queryClient = useQueryClient();
  const { message } = AntdApp.useApp();

  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };

  const routePrefillClientId = useRouteIntent && routeIntent.hasOpenCreateIntent ? routeIntent.prefillClientId : undefined;
  const routePrefillServiceId = useRouteIntent && routeIntent.hasOpenCreateIntent ? routeIntent.prefillServiceId : undefined;
  const createPrefillClientId = localPrefill?.clientId ?? routePrefillClientId;
  const createPrefillServiceId = localPrefill?.serviceId ?? routePrefillServiceId;
  const isCreateModalOpen = isOpen || (useRouteIntent && routeIntent.hasOpenCreateIntent);

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

  const openCreateModal = useCallback((prefill?: PaymentCreatePrefill) => {
    setLocalPrefill(prefill ?? null);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    const draftValues = loadDraftValues() ?? {};
    withHydration(() => {
      form.setFieldsValue({
        clientId: draftValues.clientId ?? createPrefillClientId,
        serviceId: draftValues.serviceId ?? createPrefillServiceId,
        quantity: draftValues.quantity ?? 1,
        amount: draftValues.amount,
        date: draftValues.date ? dayjs(draftValues.date) : dayjs(),
        description: draftValues.description,
      });
    });
  }, [createPrefillClientId, createPrefillServiceId, form, isCreateModalOpen, loadDraftValues, withHydration]);

  useEffect(() => {
    if (!selectedCreateServiceId || selectedServicePrice === undefined || isHydratingRef.current) {
      return;
    }

    form.setFieldValue("amount", selectedServicePrice * selectedCreateQuantity);
  }, [form, isHydratingRef, selectedCreateQuantity, selectedCreateServiceId, selectedServicePrice]);

  function closeCreateModal() {
    setOpen(false);
    setLocalPrefill(null);
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
    if (useRouteIntent) {
      routeIntent.clearOpenCreateIntent();
    }
  }

  function handleClearCreateDraft() {
    resetStoredDraft(() => {
      form.setFieldsValue({
        clientId: createPrefillClientId,
        serviceId: createPrefillServiceId,
        quantity: 1,
        amount: undefined,
        date: dayjs(),
        description: undefined,
      });
    });
    setSelectedServicePrice(undefined);
  }

  return {
    form,
    draftHydrationRef: isHydratingRef,
    selectedCreateServiceId,
    selectedServicePrice,
    setSelectedServicePrice,
    createdClientOptions: createdClientOptions.createdOptions,
    hasCreateDraft: hasSavedDraft,
    isCreateModalOpen,
    isQuickClientCreateOpen,
    setQuickClientCreateOpen,
    createMutation,
    openCreateModal,
    closeCreateModal,
    handleClearCreateDraft,
    setCreateClientLabel,
    setCreateServiceLabel,
    onCreateValuesChange: (_: Partial<PaymentCreateFormValues>, values: PaymentCreateFormValues) => {
      saveDraftValues({
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
