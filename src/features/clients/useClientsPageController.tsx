import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { clientsApi } from "../../api/crm";
import { getApiErrorMessages } from "../../api/http";
import type { Client, Ulid } from "../../api/types";
import { clearDraft, createReplayKey, loadDraft, saveDraft } from "../../utils/drafts";
import { enqueueOfflineCreate, shouldQueueOfflineError } from "../../utils/offlineQueue";
import { isShortcutTarget, matchesPlainKey } from "../../utils/shortcuts";
import { findItemInQueryData, handleStaleEntityConflict, isActivityStale } from "../../utils/staleEntity";
import type { ClientFormValues } from "./ClientEditorModal";
import { formatRussianPhone, getRussianPhoneDigits, normalizeRussianPhone, normalizeSocialLink } from "./clientContactUtils";

type ClientRow = Client & { telegram?: string | null; vk?: string | null; phone?: string | null };
type ClientSubmitInput = {
  firstName: string;
  lastName: string;
  patronymic?: string | null;
  telegram?: string;
  vk?: string;
  phone?: string;
};

type ClientDraftValues = {
  firstName?: string;
  lastName?: string;
  patronymic?: string | null;
  telegram?: string | null;
  vk?: string | null;
  phone?: string | null;
};

const CLIENT_CREATE_DRAFT_KEY = "draft:clients:create";
export function useClientsPageController() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [editingBaselineActivityId, setEditingBaselineActivityId] = useState<Ulid | null | undefined>();
  const hasCreateDraft = Boolean(loadDraft<ClientDraftValues>(CLIENT_CREATE_DRAFT_KEY));
  const [isCreateOpen, setCreateOpen] = useState(() => hasCreateDraft);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const draftReplayKeyRef = useRef(loadDraft<ClientDraftValues>(CLIENT_CREATE_DRAFT_KEY)?.replayKey ?? createReplayKey());
  const isDraftHydratingRef = useRef(false);
  const [createPhoneInputKey, setCreatePhoneInputKey] = useState(() => (hasCreateDraft ? 1 : 0));
  const [form] = Form.useForm<ClientFormValues>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));

  const query = useQuery({
    queryKey: ["clients", page, search],
    queryFn: () => clientsApi.list({ page, page_size: 10, search: search.trim() || undefined }),
    refetchInterval: isCreateOpen && Boolean(editing) ? 5000 : false,
  });
  const historyQuery = useQuery({
    queryKey: ["clients", "history", historyClient?.id],
    queryFn: () => clientsApi.history(historyClient!.id),
    enabled: Boolean(historyClient),
  });

  const currentEditingClient = editing ? query.data?.data.find((client) => client.id === editing.id) ?? editing : null;
  const isEditingClientStale = currentEditingClient
    ? isActivityStale(currentEditingClient.lastActivity?.id, editingBaselineActivityId)
    : false;

  const saveMutation = useMutation({
    mutationFn: async ({ values, expectedActivityId }: { values: ClientFormValues; expectedActivityId?: Ulid }) => {
      const input = prepareClientInput(values);
      if (editing) {
        return { offline: false as const, response: await clientsApi.update(editing.id, input, { expectedActivityId }) };
      }

      try {
        return {
          offline: false as const,
          response: await clientsApi.create(input, { replayKey: draftReplayKeyRef.current }),
        };
      } catch (error) {
        if (!shouldQueueOfflineError(error)) {
          throw error;
        }

        enqueueOfflineCreate({
          kind: "clients:create",
          replayKey: draftReplayKeyRef.current,
          tempId: `offline:client:${draftReplayKeyRef.current}`,
          payload: input,
        });
        return { offline: true as const, response: null };
      }
    },
    onSuccess: async (result) => {
      message.success(result.offline ? "Клиент сохранен локально" : "Клиент сохранен");
      setCreateOpen(false);
      setEditing(null);
      setEditingBaselineActivityId(undefined);
      clearDraft(CLIENT_CREATE_DRAFT_KEY);
      draftReplayKeyRef.current = createReplayKey();
      pauseDraftHydration(isDraftHydratingRef, () => form.resetFields());
      if (!result.offline) {
        await queryClient.invalidateQueries({ queryKey: ["clients"] });
      }
    },
    onError: async (error, variables) => {
      if (!editing) {
        showErrors(error);
        return;
      }

      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: ["clients"],
        showErrors,
        title: "Клиент уже изменен",
        okText: "Перезаписать",
        cancelText: "Обновить форму",
        onConfirm: (conflict) => {
          saveMutation.mutate({ values: variables.values, expectedActivityId: conflict.currentActivity?.id });
        },
        onReload: () => {
          const freshClient = findItemInQueryData(queryClient, ["clients"], (data: { data: Client[] } | undefined) => data?.data, editing.id) ?? currentEditingClient;
          if (!freshClient) {
            return;
          }

          setEditing(freshClient);
          setEditingBaselineActivityId(freshClient.lastActivity?.id ?? null);
          pauseDraftHydration(isDraftHydratingRef, () => {
            form.setFieldsValue({
              ...freshClient,
              telegram: getContactValue(freshClient, "telegram"),
              vk: getContactValue(freshClient, "vk"),
              phone: getRussianPhoneDigits(getContactValue(freshClient, "phone")),
            });
          });
        },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, expectedActivityId }: { id: Ulid; expectedActivityId?: Ulid }) => clientsApi.remove(id, { expectedActivityId }),
    onSuccess: async () => {
      message.success("Клиент удален");
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: ["clients"],
        showErrors,
        title: "Клиент уже изменен",
        okText: "Удалить все равно",
        cancelText: "Обновить список",
        onConfirm: (conflict) => deleteMutation.mutate({ id: variables.id, expectedActivityId: conflict.currentActivity?.id }),
        onReload: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
      });
    },
  });

  const openEditor = useCallback(
    (client?: Client) => {
      if (client) {
        setEditing(client);
        setEditingBaselineActivityId(client.lastActivity?.id ?? null);
        setCreateOpen(true);
        pauseDraftHydration(isDraftHydratingRef, () => {
          form.resetFields();
          form.setFieldsValue({
            ...client,
            telegram: getContactValue(client, "telegram"),
            vk: getContactValue(client, "vk"),
            phone: getRussianPhoneDigits(getContactValue(client, "phone")),
          });
        });
        return;
      }

      const draft = loadDraft<ClientDraftValues>(CLIENT_CREATE_DRAFT_KEY);
      setEditing(null);
      setEditingBaselineActivityId(undefined);
      setCreateOpen(true);
      draftReplayKeyRef.current = draft?.replayKey ?? createReplayKey();
      setCreatePhoneInputKey((current) => current + 1);
      pauseDraftHydration(isDraftHydratingRef, () => {
        form.resetFields();
        form.setFieldsValue(draft?.values ?? {});
      });
    },
    [form],
  );

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleClearCreateDraft = useCallback(() => {
    clearDraft(CLIENT_CREATE_DRAFT_KEY);
    draftReplayKeyRef.current = createReplayKey();
    setCreatePhoneInputKey((current) => current + 1);
    pauseDraftHydration(isDraftHydratingRef, () => form.resetFields());
  }, [form]);

  const closeEditor = useCallback(() => {
    setCreateOpen(false);
    setEditing(null);
    setEditingBaselineActivityId(undefined);
  }, []);

  useLayoutEffect(() => {
    if (isCreateOpen && !editing) {
      const draft = loadDraft<ClientDraftValues>(CLIENT_CREATE_DRAFT_KEY);
      if (draft) {
        pauseDraftHydration(isDraftHydratingRef, () => {
          form.setFieldsValue(draft.values);
        });
      }
    }
  }, [editing, form, isCreateOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (matchesPlainKey(event, "a")) {
        event.preventDefault();
        openEditor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openEditor]);

  return {
    page,
    setPage,
    query,
    historyQuery,
    historyClient,
    setHistoryClient,
    editing,
    isCreateOpen,
    hasCreateDraft,
    form,
    createPhoneInputKey,
    currentEditingClient,
    isEditingClientStale,
    editingBaselineActivityId,
    saveMutation,
    deleteMutation,
    openEditor,
    closeEditor,
    handleSearch,
    handleClearCreateDraft,
    onSubmit: (values: ClientFormValues) => saveMutation.mutate({ values, expectedActivityId: editingBaselineActivityId ?? undefined }),
    onValuesChange: (_: Partial<ClientFormValues>, values: ClientFormValues) => {
      if (editing || isDraftHydratingRef.current) {
        return;
      }

      saveDraft<ClientDraftValues>(CLIENT_CREATE_DRAFT_KEY, {
        replayKey: draftReplayKeyRef.current,
        updatedAtUtc: new Date().toISOString(),
        values,
      });
    },
    openClientHistoryFromDashboard: {
      onCreateAppointment: (client: Client) => navigate("/schedule", { state: { openCreate: true, clientId: client.id } }),
      onCreatePayment: (client: Client) => navigate("/payments", { state: { openCreate: true, clientId: client.id } }),
    },
    confirmDelete: (client: Client) => {
      modal.confirm({
        title: "Удалить клиента?",
        onOk: () => deleteMutation.mutate({ id: client.id, expectedActivityId: client.lastActivity?.id }),
      });
    },
  };
}

export function formatClientName(client: Pick<Client, "firstName" | "lastName" | "patronymic">) {
  return [client.lastName, client.firstName, client.patronymic].filter(Boolean).join(" ");
}

export function getContactValue(client: ClientRow, key: "telegram" | "vk" | "phone") {
  return client.contacts?.[key] ?? client[key] ?? undefined;
}

export function renderPhoneLink(value?: string | null) {
  const normalized = normalizeRussianPhone(value);
  if (!normalized) {
    return null;
  }

  return <a href={`tel:${normalized}`}>{formatRussianPhone(getRussianPhoneDigits(normalized))}</a>;
}

export function renderSocialLink(value: string | null | undefined, type: "telegram" | "vk") {
  const normalized = normalizeSocialLink(value, type);
  if (!normalized) {
    return null;
  }

  return (
    <a href={normalized} target="_blank" rel="noreferrer">
      @{getSocialHandle(normalized)}
    </a>
  );
}

function getSocialHandle(value: string) {
  return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[1] ?? "";
}

function prepareClientInput(values: ClientFormValues): ClientSubmitInput {
  const input: ClientSubmitInput = {
    firstName: values.firstName,
    lastName: values.lastName,
    patronymic: values.patronymic,
    phone: normalizeRussianPhone(values.phone),
    telegram: normalizeSocialLink(values.telegram, "telegram"),
    vk: normalizeSocialLink(values.vk, "vk"),
  };

  return omitEmptyContacts(input);
}

function omitEmptyContacts(input: ClientSubmitInput) {
  const result = { ...input };
  if (!result.phone) {
    delete result.phone;
  }
  if (!result.telegram) {
    delete result.telegram;
  }
  if (!result.vk) {
    delete result.vk;
  }

  return result;
}

function pauseDraftHydration(ref: { current: boolean }, action: () => void) {
  ref.current = true;
  action();
  queueMicrotask(() => {
    ref.current = false;
  });
}
