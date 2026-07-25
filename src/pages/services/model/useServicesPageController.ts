import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import { useEffect, useState } from "react";
import * as v from "valibot";

import { createOrQueueOffline } from "@/entities/offline-queue";
import { type Service, serviceQueryKeys, servicesApi } from "@/entities/service";
import { hasAdminAccess, useAuth } from "@/entities/session";
import { getApiErrorMessages } from "@/shared/api";
import { isShortcutTarget, matchesPlainKey } from "@/shared/lib";
import { readPositiveInteger, useDraftFormState, useUrlState } from "@/shared/lib/react";

type ServiceDraftValues = {
  name?: string;
  publicName?: string;
  description?: string;
  isConsultation?: boolean;
  price?: number;
};

type ServiceCreateInput = {
  name: string;
  publicName?: string;
  description?: string;
  isConsultation: boolean;
  price: number;
};

type ServicePriceFormValues = {
  price: number;
};

type ServiceEditFormValues = {
  name: string;
  publicName?: string;
  description?: string;
  isConsultation: boolean;
};

const SERVICE_CREATE_DRAFT_KEY = "draft:services:create";
const serviceDraftSchema = v.object({
  name: v.optional(v.string()),
  publicName: v.optional(v.string()),
  description: v.optional(v.string()),
  isConsultation: v.optional(v.boolean()),
  price: v.optional(v.number()),
});
const isServiceDraft = (value: unknown): value is ServiceDraftValues => v.safeParse(serviceDraftSchema, value).success;

export function useServicesPageController() {
  const { searchParams, setUrlState } = useUrlState();
  const auth = useAuth();
  const {
    hasSavedDraft,
    replayKeyRef,
    loadDraftValues,
    withHydration,
    resetStoredDraft,
    saveDraftValues: saveDraftFormValues,
  } = useDraftFormState<ServiceDraftValues>(SERVICE_CREATE_DRAFT_KEY, isServiceDraft);
  const page = readPositiveInteger(searchParams.get("page"));
  const setPage = (nextPage: number) => {
    setUrlState({ page: nextPage === 1 ? null : nextPage });
  };
  const hasCreateDraft = hasSavedDraft;
  const [isCreateRequestedOpen, setCreateOpen] = useState(false);
  const isCreateOpen = isCreateRequestedOpen || hasCreateDraft;
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
    queryKey: serviceQueryKeys.list(page),
    queryFn: () => servicesApi.list({ page, page_size: 10 }),
    placeholderData: keepPreviousData,
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
        await queryClient.invalidateQueries({ queryKey: serviceQueryKeys.all });
      }
    },
    onError: showErrors,
  });

  const priceMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) => servicesApi.updatePrice(id, price),
    onSuccess: async () => {
      message.success("Цена обновлена");
      setPricing(null);
      await queryClient.invalidateQueries({ queryKey: serviceQueryKeys.all });
    },
    onError: showErrors,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ServiceEditFormValues }) => servicesApi.update(id, values),
    onSuccess: async () => {
      message.success("Услуга обновлена");
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: serviceQueryKeys.all });
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => servicesApi.remove(id),
    onSuccess: async () => {
      message.success("Услуга удалена");
      await queryClient.invalidateQueries({ queryKey: serviceQueryKeys.all });
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
      publicName: editing.publicName ?? undefined,
      description: editing.description ?? undefined,
      isConsultation: editing.isConsultation,
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
        publicName: values.publicName,
        description: values.description,
        isConsultation: values.isConsultation ?? false,
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
