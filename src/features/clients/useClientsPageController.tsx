import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router";
import { clientsApi, clientSourcesApi, courseEnrollmentsApi, coursesApi } from "@/api/crm";
import { queryKeys } from "@/api/queryKeys";
import type { Client, CourseEnrollment, CourseEnrollmentThemeProgressAction, Ulid } from "@/api/types";
import { getClientContactValue, normalizePhone, normalizeSocialLink } from "@/entities/client";
import { hasAdminAccess } from "@/features/auth/access";
import { useAuth } from "@/features/auth/useAuth";
import { getClientHistoryActions } from "@/features/clients/clientHistoryActions";
import { useDraftFormState } from "@/features/drafts/useDraftFormState";
import { createOrQueueOffline } from "@/features/offline/createOrQueueOffline";
import { useCreatedReferenceOptions } from "@/features/reference-books/useCreatedReferenceOptions";
import { createOfflineTempId } from "@/utils/offlineQueue";
import { getBackgroundRefetchInterval } from "@/utils/refetch";
import { isShortcutTarget, matchesPlainKey } from "@/utils/shortcuts";
import { findItemInQueryData, handleStaleEntityConflict, isActivityStale } from "@/utils/staleEntity";
import { getApiErrorMessages } from "../../api/http";
import type { ClientFormValues } from "./ClientEditorModal";

type ClientSubmitInput = {
  firstName: string;
  lastName: string;
  patronymic?: string | null;
  dateOfBirth?: string | null;
  telegram?: string;
  vk?: string;
  phone?: string;
  sourceId?: string;
};

type ClientDraftValues = {
  firstName?: string;
  lastName?: string;
  patronymic?: string | null;
  dateOfBirth?: string | null;
  telegram?: string | null;
  vk?: string | null;
  phone?: string | null;
};

const CLIENT_CREATE_DRAFT_KEY = "draft:clients:create";
const clientHistoryAppointmentsPageSize = 8;

export function useClientsPageController() {
  const {
    hasSavedDraft,
    replayKeyRef: draftReplayKeyRef,
    isHydratingRef: isDraftHydratingRef,
    loadDraftValues,
    withHydration,
    resetStoredDraft,
    saveDraftValues: saveDraftFormValues,
  } = useDraftFormState<ClientDraftValues>(CLIENT_CREATE_DRAFT_KEY);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [editingBaselineActivityId, setEditingBaselineActivityId] = useState<Ulid | null | undefined>();
  const hasCreateDraft = hasSavedDraft;
  const [isCreateOpen, setCreateOpen] = useState(() => hasCreateDraft);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [historyAppointmentsPage, setHistoryAppointmentsPage] = useState(1);
  const [isSourceCreateOpen, setSourceCreateOpen] = useState(false);
  const [isEnrollmentCreateOpen, setEnrollmentCreateOpen] = useState(false);
  const createdSourceOptions = useCreatedReferenceOptions("client-source");
  const [form] = Form.useForm<ClientFormValues>();
  const navigate = useNavigate();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();

  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };

  const canCreateClients = hasAdminAccess(auth.user);

  const query = useQuery({
    queryKey: queryKeys.clients.list(page, search),
    queryFn: () =>
      clientsApi.list({
        page,
        page_size: 10,
        search: search.trim() || undefined,
      }),
    refetchInterval: getBackgroundRefetchInterval(isCreateOpen && Boolean(editing)),
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.clients.history(historyClient?.id, historyAppointmentsPage, clientHistoryAppointmentsPageSize),
    queryFn: () => {
      const clientId = historyClient?.id;
      if (!clientId) {
        throw new Error("History client is not selected.");
      }

      return clientsApi.history(clientId, {
        page: historyAppointmentsPage,
        page_size: clientHistoryAppointmentsPageSize,
      });
    },
    enabled: Boolean(historyClient),
    placeholderData: keepPreviousData,
  });

  const courseEnrollmentsQuery = useQuery({
    queryKey: queryKeys.courseEnrollments.list(historyClient?.id),
    queryFn: () => {
      const clientId = historyClient?.id;
      if (!clientId) {
        throw new Error("Enrollment client is not selected.");
      }

      return courseEnrollmentsApi.list({ clientId });
    },
    enabled: Boolean(historyClient),
  });

  const coursesCatalogQuery = useQuery({
    queryKey: queryKeys.courses.list(""),
    queryFn: () => coursesApi.list(),
    enabled: Boolean(historyClient),
    staleTime: 60_000,
  });

  const currentEditingClient = editing ? (query.data?.data.find((client) => client.id === editing.id) ?? editing) : null;
  const isEditingClientStale = currentEditingClient
    ? isActivityStale(currentEditingClient.lastActivity?.id, editingBaselineActivityId)
    : false;

  const saveMutation = useMutation<{ offline: boolean }, unknown, { values: ClientFormValues; expectedActivityId?: Ulid }>({
    mutationFn: ({ values, expectedActivityId }) => {
      const input = prepareClientInput(values);
      if (editing) {
        return clientsApi.update(editing.id, input, { expectedActivityId }).then(() => ({ offline: false as const, response: null }));
      }

      return createOrQueueOffline({
        input,
        replayKey: draftReplayKeyRef.current,
        create: (createInput) =>
          clientsApi.create(createInput, {
            replayKey: draftReplayKeyRef.current,
          }),
        buildQueueItem: (createInput, replayKey) => ({
          kind: "clients:create",
          replayKey,
          tempId: createOfflineTempId("client"),
          payload: createInput,
        }),
      }).then((result) => ({ offline: result.offline }));
    },
    onSuccess: async (result) => {
      message.success(result.offline ? "Клиент сохранен локально" : "Клиент сохранен");
      setCreateOpen(false);
      setEditing(null);
      setEditingBaselineActivityId(undefined);
      resetStoredDraft(() => {
        form.resetFields();
      });
      if (!result.offline) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.clients.all,
        });
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
        invalidateQueryKey: queryKeys.clients.all,
        showErrors,
        title: "Клиент уже изменен",
        okText: "Перезаписать",
        cancelText: "Обновить форму",
        onConfirm: (conflict) => {
          saveMutation.mutate({
            values: variables.values,
            expectedActivityId: conflict.currentActivity?.id,
          });
        },
        onReload: () => {
          const freshClient =
            findItemInQueryData(queryClient, queryKeys.clients.all, (data) => (data as { data: Client[] } | undefined)?.data, editing.id) ??
            currentEditingClient;
          if (!freshClient) {
            return;
          }

          setEditing(freshClient);
          setEditingBaselineActivityId(freshClient.lastActivity?.id ?? null);
          withHydration(() => {
            form.setFieldsValue({
              ...freshClient,
              telegram: getClientContactValue(freshClient, "telegram"),
              vk: getClientContactValue(freshClient, "vk"),
              phone: getClientContactValue(freshClient, "phone"),
            });
          });
        },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, expectedActivityId }: { id: Ulid; expectedActivityId?: Ulid }) => {
      return clientsApi.remove(id, { expectedActivityId });
    },
    onSuccess: async () => {
      message.success("Клиент удален");
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: queryKeys.clients.all,
        showErrors,
        title: "Клиент уже изменен",
        okText: "Удалить все равно",
        cancelText: "Обновить список",
        onConfirm: (conflict) => {
          deleteMutation.mutate({
            id: variables.id,
            expectedActivityId: conflict.currentActivity?.id,
          });
        },
        onReload: () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.clients.all,
          });
        },
      });
    },
  });

  const openEditor = useCallback(
    (client?: Client) => {
      if (client) {
        setEditing(client);
        setEditingBaselineActivityId(client.lastActivity?.id ?? null);
        setCreateOpen(true);
        withHydration(() => {
          form.resetFields();
          form.setFieldsValue({
            ...client,
            telegram: getClientContactValue(client, "telegram"),
            vk: getClientContactValue(client, "vk"),
            phone: getClientContactValue(client, "phone"),
          });
        });
        return;
      }

      if (!canCreateClients) {
        return;
      }

      const draftValues = loadDraftValues();
      setEditing(null);
      setEditingBaselineActivityId(undefined);
      setCreateOpen(true);
      withHydration(() => {
        form.resetFields();
        form.setFieldsValue(draftValues ?? {});
      });
    },
    [canCreateClients, form, loadDraftValues, withHydration],
  );

  const createSourceMutation = useMutation({
    mutationFn: (values: { name: string }) => clientSourcesApi.create(values),
    onSuccess: async (result, values) => {
      message.success("Источник создан");
      createdSourceOptions.addCreatedOption({
        id: result.id,
        label: values.name.trim(),
      });
      form.setFieldValue("sourceId", result.id);
      setSourceCreateOpen(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.clients.sources,
      });
    },
    onError: showErrors,
  });

  const createEnrollmentMutation = useMutation({
    mutationFn: (courseId: Ulid) => {
      const clientId = historyClient?.id;
      if (!clientId) {
        throw new Error("Клиент не выбран.");
      }

      return courseEnrollmentsApi.create({
        clientId,
        courseId,
      });
    },
    onSuccess: async () => {
      message.success("Курс назначен");
      setEnrollmentCreateOpen(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courseEnrollments.list(historyClient?.id),
      });
    },
    onError: showErrors,
  });

  const deleteEnrollmentMutation = useMutation({
    mutationFn: (enrollmentId: Ulid) => courseEnrollmentsApi.remove(enrollmentId),
    onSuccess: async () => {
      message.success("Курс снят с клиента");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courseEnrollments.list(historyClient?.id),
      });
    },
    onError: showErrors,
  });

  const updateThemeProgressMutation = useMutation({
    mutationFn: ({ themeId, action }: { themeId: Ulid; action: CourseEnrollmentThemeProgressAction }) =>
      courseEnrollmentsApi.updateThemeProgress(themeId, action),
    onSuccess: async (_, variables) => {
      message.success(getThemeProgressSuccessMessage(variables.action));
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courseEnrollments.list(historyClient?.id),
      });
    },
    onError: showErrors,
  });

  const clientHistoryActions = getClientHistoryActions(auth.user, navigate);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const openHistoryClient = useCallback((client: Client) => {
    setHistoryAppointmentsPage(1);
    setHistoryClient(client);
  }, []);

  const closeHistoryClient = useCallback(() => {
    setHistoryClient(null);
    setHistoryAppointmentsPage(1);
    setEnrollmentCreateOpen(false);
  }, []);

  const handleClearCreateDraft = useCallback(() => {
    resetStoredDraft(() => {
      form.resetFields();
    });
  }, [form, resetStoredDraft]);

  const closeEditor = useCallback(() => {
    setCreateOpen(false);
    setEditing(null);
    setEditingBaselineActivityId(undefined);
  }, []);

  useLayoutEffect(() => {
    if (isCreateOpen && !editing) {
      const draftValues = loadDraftValues();
      if (draftValues) {
        withHydration(() => {
          form.setFieldsValue(draftValues);
        });
      }
    }
  }, [editing, form, isCreateOpen, loadDraftValues, withHydration]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (matchesPlainKey(event, "a")) {
        if (!canCreateClients) {
          return;
        }

        event.preventDefault();
        openEditor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canCreateClients, openEditor]);

  return {
    canCreateClients,
    page,
    setPage,
    query,
    clients: query.data?.data,
    pagination: {
      current: query.data?.info.page ?? page,
      pageSize: query.data?.info.pageSize ?? 10,
      total: query.data?.info.total,
    },
    historyQuery,
    historyClient,
    historyAppointmentsPage,
    courseEnrollmentsQuery,
    coursesCatalogQuery,
    setHistoryAppointmentsPage,
    setHistoryClient: openHistoryClient,
    closeHistoryClient,
    editing,
    isCreateOpen,
    hasCreateDraft,
    form,
    currentEditingClient,
    isEditingClientStale,
    editingBaselineActivityId,
    isSourceCreateOpen,
    isEnrollmentCreateOpen,
    createdSourceOptions: createdSourceOptions.createdOptions,
    saveMutation,
    createSourceMutation,
    createEnrollmentMutation,
    deleteEnrollmentMutation,
    updateThemeProgressMutation,
    deleteMutation,
    openEditor,
    closeEditor,
    handleSearch,
    handleClearCreateDraft,
    onSubmit: (values: ClientFormValues) => {
      saveMutation.mutate({
        values,
        expectedActivityId: editingBaselineActivityId ?? undefined,
      });
    },
    onValuesChange: (_: Partial<ClientFormValues>, values: ClientFormValues) => {
      if (editing || isDraftHydratingRef.current) {
        return;
      }

      saveDraftFormValues(values);
    },
    clientHistoryActions,
    confirmDelete: (client: Client) => {
      modal.confirm({
        title: "Удалить клиента?",
        onOk: () => {
          deleteMutation.mutate({
            id: client.id,
            expectedActivityId: client.lastActivity?.id,
          });
        },
      });
    },
    openSourceCreate: () => {
      if (!canCreateClients) {
        return;
      }

      setSourceCreateOpen(true);
    },
    closeSourceCreate: () => {
      setSourceCreateOpen(false);
    },
    openEnrollmentCreate: () => {
      if (!historyClient || !canCreateClients) {
        return;
      }

      setEnrollmentCreateOpen(true);
    },
    closeEnrollmentCreate: () => {
      setEnrollmentCreateOpen(false);
    },
    availableEnrollmentCourses: buildAvailableEnrollmentCourses(coursesCatalogQuery.data ?? [], courseEnrollmentsQuery.data ?? []),
    onCreateSource: (values: { name: string }) => {
      createSourceMutation.mutate(values);
    },
    onCreateEnrollment: (courseId: Ulid) => {
      createEnrollmentMutation.mutate(courseId);
    },
    onDeleteEnrollment: (enrollmentId: Ulid) => {
      modal.confirm({
        title: "Снять клиента с курса?",
        onOk: () => {
          deleteEnrollmentMutation.mutate(enrollmentId);
        },
      });
    },
    onUpdateThemeProgress: (themeId: Ulid, action: CourseEnrollmentThemeProgressAction) => {
      if (action === "pass-homework") {
        modal.confirm({
          title: "Принять домашнее задание и завершить тему?",
          onOk: () => {
            updateThemeProgressMutation.mutate({
              themeId,
              action,
            });
          },
        });
        return;
      }

      updateThemeProgressMutation.mutate({
        themeId,
        action,
      });
    },
    onSourceLabelChange: (_label?: string) => {},
  };
}

function getThemeProgressSuccessMessage(action: CourseEnrollmentThemeProgressAction) {
  switch (action) {
    case "unlock":
      return "Тема открыта";
    case "start":
      return "Тема переведена в работу";
    case "send-to-homework":
      return "Тема отправлена на домашнее задание";
    case "pass-homework":
      return "Домашнее задание принято, тема завершена";
    case "return-to-progress":
      return "Тема возвращена в работу";
  }
}

function buildAvailableEnrollmentCourses(courses: Array<{ id: Ulid; name: string }>, enrollments: CourseEnrollment[]) {
  const enrolledCourseIds = new Set(enrollments.map((enrollment) => enrollment.courseId));
  return courses
    .filter((course) => !enrolledCourseIds.has(course.id))
    .map((course) => ({
      value: course.id,
      label: course.name,
    }));
}

function prepareClientInput(values: ClientFormValues): ClientSubmitInput {
  const input: ClientSubmitInput = {
    firstName: values.firstName,
    lastName: values.lastName,
    patronymic: values.patronymic,
    dateOfBirth: values.dateOfBirth || undefined,
    phone: normalizePhone(values.phone),
    telegram: normalizeSocialLink(values.telegram, "telegram"),
    vk: normalizeSocialLink(values.vk, "vk"),
    sourceId: values.sourceId ?? undefined,
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
