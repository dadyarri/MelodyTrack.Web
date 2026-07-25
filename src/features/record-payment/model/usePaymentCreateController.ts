import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import * as v from "valibot";

import { clientQueryKeys } from "@/entities/client";
import { createOrQueueOffline } from "@/entities/offline-queue";
import { type Payment, paymentQueryKeys, paymentsApi } from "@/entities/payment";
import type { Ulid } from "@/shared/api";
import { getApiErrorMessages } from "@/shared/api";
import { useOpenCreateRouteIntent } from "@/shared/lib";
import { useCreatedReferenceOptions } from "@/shared/lib";
import { findItemInQueryData, handleStaleEntityConflict, isActivityStale } from "@/shared/lib";
import { useDraftFormState } from "@/shared/lib/react";

import type { PaymentCreateFormValues } from "../ui/PaymentCreateModal";

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
const paymentDraftSchema = v.object({
  clientId: v.optional(v.string()),
  serviceId: v.optional(v.string()),
  quantity: v.optional(v.number()),
  amount: v.optional(v.number()),
  date: v.optional(v.string()),
  description: v.optional(v.string()),
});
const isPaymentDraft = (value: unknown): value is PaymentDraftValues => v.safeParse(paymentDraftSchema, value).success;

export function usePaymentCreateController({ useRouteIntent = false }: { useRouteIntent?: boolean } = {}) {
  const {
    hasSavedDraft,
    isDraftRestored,
    saveStatus: createDraftSaveStatus,
    replayKeyRef,
    isHydratingRef,
    loadDraftValues,
    withHydration,
    resetStoredDraft,
    saveDraftValues,
  } = useDraftFormState<PaymentDraftValues>(PAYMENT_CREATE_DRAFT_KEY, isPaymentDraft);
  const [isOpen, setOpen] = useState(false);
  const [localPrefill, setLocalPrefill] = useState<PaymentCreatePrefill | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingBaselineActivityId, setEditingBaselineActivityId] = useState<Ulid | null | undefined>();
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
  const { message, modal } = AntdApp.useApp();

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
  const currentEditingPayment = editingPayment;
  const isEditingPaymentStale = currentEditingPayment
    ? isActivityStale(currentEditingPayment.lastActivity?.id, editingBaselineActivityId)
    : false;

  const saveMutation = useMutation<{ offline: boolean }, unknown, { values: PaymentCreateFormValues; expectedActivityId?: Ulid }>({
    mutationFn: ({ values, expectedActivityId }) => {
      if (!values.date) {
        throw new Error("Укажите дату платежа.");
      }

      const input = {
        clientId: values.clientId,
        serviceId: values.serviceId,
        amount: values.amount,
        date: values.date.toISOString(),
        description: values.description?.trim() || undefined,
      };

      if (editingPayment) {
        return paymentsApi.update(editingPayment.id, input, { expectedActivityId }).then(() => ({ offline: false }));
      }

      return createOrQueueOffline({
        input,
        replayKey: replayKeyRef.current,
        create: (createInput) => paymentsApi.create(createInput, { replayKey: replayKeyRef.current }),
        buildQueueItem: (createInput, replayKey) => ({
          kind: "payments:create",
          replayKey,
          payload: { ...createInput, clientLabel: createClientLabel, serviceLabel: createServiceLabel },
        }),
      });
    },
    onSuccess: async (result) => {
      message.success(result.offline ? "Платеж сохранен локально" : "Платеж сохранен");
      closeCreateModal();
      resetStoredDraft();
      if (!result.offline) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: paymentQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: clientQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: clientQueryKeys.history() }),
        ]);
      }
    },
    onError: async (error, variables) => {
      if (!editingPayment) {
        showErrors(error);
        return;
      }

      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: paymentQueryKeys.all,
        showErrors,
        title: "Платеж уже изменен",
        okText: "Перезаписать",
        cancelText: "Обновить форму",
        onConfirm: (conflict) => {
          saveMutation.mutate({
            values: variables.values,
            expectedActivityId: conflict.currentActivity?.id,
          });
        },
        onReload: () => {
          const freshPayment =
            findItemInQueryData(
              queryClient,
              paymentQueryKeys.all,
              (data) => (data as { data: Payment[] } | undefined)?.data,
              editingPayment.id,
            ) ?? currentEditingPayment;

          if (!freshPayment) {
            return;
          }

          setEditingPayment(freshPayment);
          setEditingBaselineActivityId(freshPayment.lastActivity?.id ?? null);
          setSelectedServicePrice(undefined);
          withHydration(() => {
            form.setFieldsValue({
              clientId: freshPayment.client.id,
              serviceId: freshPayment.service?.id,
              quantity: 1,
              amount: freshPayment.amount,
              date: dayjs(freshPayment.date),
              description: freshPayment.description ?? undefined,
            });
          });
        },
      });
    },
  });

  const openCreateModal = useCallback((prefill?: PaymentCreatePrefill) => {
    setEditingPayment(null);
    setEditingBaselineActivityId(undefined);
    setLocalPrefill(prefill ?? null);
    setOpen(true);
  }, []);

  const openEditModal = useCallback(
    (payment: Payment) => {
      setEditingPayment(payment);
      setEditingBaselineActivityId(payment.lastActivity?.id ?? null);
      setLocalPrefill(null);
      setSelectedServicePrice(undefined);
      setOpen(true);
      withHydration(() => {
        form.setFieldsValue({
          clientId: payment.client.id,
          serviceId: payment.service?.id,
          quantity: 1,
          amount: payment.amount,
          date: dayjs(payment.date),
          description: payment.description ?? undefined,
        });
      });
    },
    [form, withHydration],
  );

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    if (editingPayment) {
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
  }, [createPrefillClientId, createPrefillServiceId, editingPayment, form, isCreateModalOpen, loadDraftValues, withHydration]);

  useEffect(() => {
    if (!selectedCreateServiceId || selectedServicePrice === undefined || isHydratingRef.current) {
      return;
    }

    form.setFieldValue("amount", selectedServicePrice * selectedCreateQuantity);
  }, [form, isHydratingRef, selectedCreateQuantity, selectedCreateServiceId, selectedServicePrice]);

  function closeCreateModal() {
    setOpen(false);
    setLocalPrefill(null);
    setEditingPayment(null);
    setEditingBaselineActivityId(undefined);
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
    if (editingPayment) {
      return;
    }

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
    isCreateDraftRestored: isDraftRestored,
    createDraftSaveStatus,
    isCreateModalOpen,
    editingPayment,
    currentEditingPayment,
    isEditingPaymentStale,
    editingBaselineActivityId,
    isQuickClientCreateOpen,
    setQuickClientCreateOpen,
    saveMutation,
    openCreateModal,
    openEditModal,
    closeCreateModal,
    handleClearCreateDraft,
    setCreateClientLabel,
    setCreateServiceLabel,
    onCreateValuesChange: (_: Partial<PaymentCreateFormValues>, values: PaymentCreateFormValues) => {
      if (editingPayment) {
        return;
      }

      saveDraftValues({
        ...values,
        date: values.date?.toISOString(),
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
