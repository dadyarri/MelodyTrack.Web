import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import { useEffect, useState } from "react";
import { queryKeys } from "@/api/queryKeys";
import { servicesApi } from "@/api/crm";
import { getApiErrorMessages } from "@/api/http";
import type { Service } from "@/api/types";
import { hasAdminAccess } from "@/features/auth/access";
import { useDraftFormState } from "@/features/drafts/useDraftFormState";
import { createOrQueueOffline } from "@/features/offline/createOrQueueOffline";
import { useAuth } from "@/features/auth/useAuth";
import { isShortcutTarget, matchesPlainKey } from "@/utils/shortcuts";

type ServiceDraftValues = {
  name?: string;
  description?: string;
  price?: number;
};

type ServiceCreateInput = {
  name: string;
  description?: string;
  price: number;
};

type ServicePriceFormValues = {
  price: number;
};

type ServiceEditFormValues = {
  name: string;
  description?: string;
};

const SERVICE_CREATE_DRAFT_KEY = "draft:services:create";

export function useServicesPageController() {
  const auth = useAuth();
  const {
    hasSavedDraft,
    replayKeyRef,
    loadDraftValues,
    withHydration,
    resetStoredDraft,
    saveDraftValues: saveDraftFormValues,
  } = useDraftFormState<ServiceDraftValues>(SERVICE_CREATE_DRAFT_KEY);
  const [page, setPage] = useState(1);
  const hasCreateDraft = hasSavedDraft;
  const [isCreateOpen, setCreateOpen] = useState(() => hasCreateDraft);
  const [editing, setEditing] = useState<Service | null>(null);
  const [pricing, setPricing] = useState<Service | null>(null);
  const [form] = Form.useForm<ServiceDraftValues>();
  const [editForm] = Form.useForm<ServiceEditFormValues>();
  const [priceForm] = Form.useForm<ServicePriceFormValues>();
  const queryClient = useQueryClient();
  const { message } = AntdApp.useApp();
  const canManageServices = hasAdminAccess(auth.user);
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };
  const query = useQuery({
    queryKey: queryKeys.services.list(page),
    queryFn: () => servicesApi.list({ page, page_size: 10 }),
  });

  const createMutation = useMutation({
    mutationFn: (values: ServiceCreateInput) =>
      createOrQueueOffline({
        input: values,
        replayKey: replayKeyRef.current,
        create: (input) => servicesApi.create(input, { replayKey: replayKeyRef.current }),
        buildQueueItem: (input, replayKey) => ({
          kind: "services:create",
          replayKey,
          payload: input,
        }),
      }),
    onSuccess: async (result) => {
      message.success(result.offline ? "Услуга сохранена локально" : "Услуга создана");
      setCreateOpen(false);
      resetStoredDraft(() => {
        form.resetFields();
      });
      if (!result.offline) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      }
    },
    onError: showErrors,
  });

  const priceMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) => servicesApi.updatePrice(id, price),
    onSuccess: async () => {
      message.success("Цена обновлена");
      setPricing(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    },
    onError: showErrors,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ServiceEditFormValues }) => servicesApi.update(id, values),
    onSuccess: async () => {
      message.success("Услуга обновлена");
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => servicesApi.remove(id),
    onSuccess: async () => {
      message.success("Услуга удалена");
      await queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    },
    onError: showErrors,
  });

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    const draftValues = loadDraftValues();
    withHydration(() => {
      form.setFieldsValue(draftValues ?? {});
    });
  }, [form, isCreateOpen, loadDraftValues, withHydration]);

  useEffect(() => {
    if (!editing) {
      editForm.resetFields();
      return;
    }

    editForm.setFieldsValue({
      name: editing.name,
      description: editing.description ?? undefined,
    });
  }, [editForm, editing]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (!matchesPlainKey(event, "a") || !canManageServices) {
        return;
      }

      event.preventDefault();
      setCreateOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canManageServices]);

  return {
    canManageServices,
    page,
    setPage,
    query,
    editing,
    setEditing,
    pricing,
    setPricing,
    hasCreateDraft,
    isCreateOpen,
    setCreateOpen,
    form,
    editForm,
    priceForm,
    createMutation,
    priceMutation,
    updateMutation,
    deleteMutation,
    handleClearCreateDraft: () => {
      resetStoredDraft(() => {
        form.resetFields();
      });
    },
    onCreateSubmit: (values: ServiceDraftValues) => {
      if (!values.name || values.price === undefined) {
        return;
      }

      createMutation.mutate({
        name: values.name,
        description: values.description,
        price: values.price,
      });
    },
    onCreateValuesChange: (_: Partial<ServiceDraftValues>, values: ServiceDraftValues) => {
      saveDraftFormValues(values);
    },
    onPriceSubmit: (values: ServicePriceFormValues) => {
      if (!pricing) {
        return;
      }

      priceMutation.mutate({ id: pricing.id, price: values.price });
    },
    onEditSubmit: (values: ServiceEditFormValues) => {
      if (!editing) {
        return;
      }

      updateMutation.mutate({ id: editing.id, values });
    },
  };
}
