import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import type { Dayjs } from "dayjs";
import { useMemo, useState } from "react";

import { getSocialHandle } from "@/entities/client";
import {
  type RecurringTask,
  type RecurringTaskListStatus,
  type RecurringTaskRule,
  type RecurringTaskType,
  taskQueryKeys,
  tasksApi,
} from "@/entities/task";
import type { Ulid } from "@/shared/api";
import { getApiErrorMessages } from "@/shared/api";
import { downloadBlob } from "@/shared/lib";
import { getBackgroundRefetchInterval } from "@/shared/lib";
import { findItemInQueryData, handleStaleEntityConflict, isActivityStale } from "@/shared/lib";
import { useUrlState } from "@/shared/lib/react";

export type RecurringTaskRuleFormValues = {
  isEnabled: boolean;
  messageTemplate: string;
  offsetMinutes?: number | null;
  cooldownDays?: number | null;
};

type DelayTaskFormValues = {
  delayUntil: Dayjs;
};

export type CustomTaskFormValues = {
  recipientMode: "client" | "external";
  clientId?: string;
  recipientName?: string;
  phone?: string;
  telegram?: string;
  vk?: string;
  title: string;
  messageText: string;
  dueAt: Dayjs;
};

export function useTasksPageController() {
  const { searchParams, setUrlState } = useUrlState();
  const taskAutoRefreshMs = 30_000;
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const status = readTaskStatus(searchParams.get("status"));
  const type = readTaskType(searchParams.get("type"));
  const activeTab = searchParams.get("tab") === "rules" ? "rules" : "tasks";
  const setStatus = (nextStatus: RecurringTaskListStatus) => {
    setUrlState({ status: nextStatus === "open" ? null : nextStatus });
  };
  const setType = (nextType: RecurringTaskType | "all") => {
    setUrlState({ type: nextType === "all" ? null : nextType });
  };
  const setActiveTab = (nextTab: "tasks" | "rules") => {
    setUrlState({ tab: nextTab === "tasks" ? null : nextTab });
  };
  const [editingRule, setEditingRule] = useState<RecurringTaskRule | null>(null);
  const [editingRuleBaselineActivityId, setEditingRuleBaselineActivityId] = useState<Ulid | null | undefined>();
  const [ruleForm] = Form.useForm<RecurringTaskRuleFormValues>();
  const [customTaskForm] = Form.useForm<CustomTaskFormValues>();
  const [delayTaskForm] = Form.useForm<DelayTaskFormValues>();
  const [delayingTask, setDelayingTask] = useState<RecurringTask | null>(null);
  const [isCustomTaskModalOpen, setIsCustomTaskModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();

  const query = useQuery({
    queryKey: taskQueryKeys.due(timezone, status, type === "all" ? null : type),
    queryFn: () => tasksApi.due({ timezone, status, type }),
    refetchInterval: getBackgroundRefetchInterval(
      activeTab !== "tasks" || Boolean(editingRule || delayingTask) || isCustomTaskModalOpen,
      taskAutoRefreshMs,
    ),
  });
  const rulesQuery = useQuery({
    queryKey: taskQueryKeys.rules,
    queryFn: () => tasksApi.rules(),
  });
  const currentEditingRule = editingRule ? (rulesQuery.data?.find((rule) => rule.id === editingRule.id) ?? editingRule) : null;
  const isEditingRuleStale = currentEditingRule
    ? isActivityStale(currentEditingRule.lastActivity?.id, editingRuleBaselineActivityId)
    : false;

  const completeMutation = useMutation({
    mutationFn: (task: RecurringTask) =>
      tasksApi.complete({
        timezone,
        ruleId: task.ruleId,
        type: task.type,
        deduplicationKey: task.deduplicationKey,
        clientId: task.clientId,
        teacherId: task.teacherId,
        appointmentId: task.appointmentId,
        preparedMessage: task.preparedMessage,
      }),
    onSuccess: async () => {
      void message.success("Задача отмечена выполненной");
      await queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
    },
    onError: (error) => {
      for (const errorMessage of getApiErrorMessages(error)) {
        void message.error(errorMessage);
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (task: RecurringTask) =>
      tasksApi.cancel({
        timezone,
        ruleId: task.ruleId,
        type: task.type,
        deduplicationKey: task.deduplicationKey,
        clientId: task.clientId,
        teacherId: task.teacherId,
        appointmentId: task.appointmentId,
      }),
    onSuccess: async () => {
      void message.success("Задача отменена");
      await queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
    },
    onError: (error) => {
      for (const errorMessage of getApiErrorMessages(error)) {
        void message.error(errorMessage);
      }
    },
  });

  const delayMutation = useMutation({
    mutationFn: ({ task, delayUntil }: { task: RecurringTask; delayUntil: Dayjs }) =>
      tasksApi.delay({
        timezone,
        ruleId: task.ruleId,
        type: task.type,
        deduplicationKey: task.deduplicationKey,
        delayUntilUtc: delayUntil.toISOString(),
        clientId: task.clientId,
        teacherId: task.teacherId,
        appointmentId: task.appointmentId,
      }),
    onSuccess: async () => {
      void message.success("Задача отложена");
      setDelayingTask(null);
      delayTaskForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
    },
    onError: (error) => {
      for (const errorMessage of getApiErrorMessages(error)) {
        void message.error(errorMessage);
      }
    },
  });
  const updateRuleMutation = useMutation({
    mutationFn: ({ id, values, expectedActivityId }: { id: Ulid; values: RecurringTaskRuleFormValues; expectedActivityId?: Ulid }) =>
      tasksApi.updateRule(
        id,
        {
          isEnabled: values.isEnabled,
          messageTemplate: values.messageTemplate.trim(),
          offsetMinutes: values.offsetMinutes ?? null,
          cooldownDays: values.cooldownDays ?? null,
        },
        { expectedActivityId },
      ),
    onSuccess: async () => {
      void message.success("Правило обновлено");
      setEditingRule(null);
      setEditingRuleBaselineActivityId(undefined);
      ruleForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: taskQueryKeys.rules });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: taskQueryKeys.rules,
        showErrors: (currentError) => {
          for (const errorMessage of getApiErrorMessages(currentError)) {
            void message.error(errorMessage);
          }
        },
        title: "Правило уже изменено",
        okText: "Сохранить все равно",
        cancelText: "Обновить данные",
        onConfirm: (conflict) => {
          updateRuleMutation.mutate({
            id: variables.id,
            values: variables.values,
            expectedActivityId: conflict.currentActivity?.id,
          });
        },
        onReload: () => {
          const freshRule =
            findItemInQueryData(queryClient, taskQueryKeys.rules, (data) => data as RecurringTaskRule[] | undefined, variables.id) ??
            currentEditingRule;
          if (!freshRule) {
            return;
          }

          setEditingRule(freshRule);
          setEditingRuleBaselineActivityId(freshRule.lastActivity?.id ?? null);
          ruleForm.setFieldsValue({
            isEnabled: freshRule.isEnabled,
            messageTemplate: freshRule.messageTemplate,
            offsetMinutes: freshRule.offsetMinutes ?? undefined,
            cooldownDays: freshRule.cooldownDays ?? undefined,
          });
        },
      });
    },
  });
  const createCustomTaskMutation = useMutation({
    mutationFn: (values: CustomTaskFormValues) =>
      tasksApi.createCustom({
        clientId: values.recipientMode === "client" ? (values.clientId ?? null) : null,
        recipientName: values.recipientMode === "external" ? (values.recipientName?.trim() ?? null) : null,
        phone: values.recipientMode === "external" ? (values.phone?.trim() ?? null) : null,
        telegram: values.recipientMode === "external" ? (values.telegram?.trim() ?? null) : null,
        vk: values.recipientMode === "external" ? (values.vk?.trim() ?? null) : null,
        title: values.title.trim(),
        messageText: values.messageText.trim(),
        dueAtUtc: values.dueAt.toISOString(),
      }),
    onSuccess: async () => {
      void message.success("Пользовательская задача создана");
      setIsCustomTaskModalOpen(false);
      customTaskForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
    },
    onError: (error) => {
      for (const errorMessage of getApiErrorMessages(error)) {
        void message.error(errorMessage);
      }
    },
  });

  const getFreshTask = async (task: RecurringTask) => {
    const refreshedTasks = await queryClient.fetchQuery({
      queryKey: taskQueryKeys.due(timezone, status, type === "all" ? null : type),
      queryFn: () => tasksApi.due({ timezone, status, type }),
    });

    return (
      refreshedTasks.find((item) => item.deduplicationKey === task.deduplicationKey) ??
      refreshedTasks.find(
        (item) =>
          item.ruleId === task.ruleId &&
          item.type === task.type &&
          item.clientId === task.clientId &&
          item.teacherId === task.teacherId &&
          item.appointmentId === task.appointmentId,
      ) ??
      null
    );
  };

  return {
    activeTab,
    setActiveTab,
    status,
    setStatus,
    type,
    setType,
    query,
    tasks: query.data ?? [],
    rulesQuery,
    rules: rulesQuery.data ?? [],
    ruleForm,
    customTaskForm,
    editingRule,
    currentEditingRule,
    isEditingRuleStale,
    updateRuleMutation,
    createCustomTaskMutation,
    isCustomTaskModalOpen,
    openCustomTaskModal: () => {
      setIsCustomTaskModalOpen(true);
      customTaskForm.setFieldsValue({
        recipientMode: "client",
        clientId: undefined,
        recipientName: undefined,
        phone: undefined,
        telegram: undefined,
        vk: undefined,
        title: "",
        messageText: "",
        dueAt: undefined,
      });
    },
    closeCustomTaskModal: () => {
      setIsCustomTaskModalOpen(false);
      customTaskForm.resetFields();
    },
    submitCustomTask: async (values: CustomTaskFormValues) => {
      await createCustomTaskMutation.mutateAsync(values);
    },
    completeTask: (task: RecurringTask) => completeMutation.mutateAsync(task),
    cancelTask: (task: RecurringTask) => cancelMutation.mutateAsync(task),
    openDelayTask: (task: RecurringTask) => {
      setDelayingTask(task);
      delayTaskForm.setFieldsValue({
        delayUntil: undefined,
      });
    },
    closeDelayTask: () => {
      setDelayingTask(null);
      delayTaskForm.resetFields();
    },
    submitDelayTask: async (values: DelayTaskFormValues) => {
      if (!delayingTask) {
        return;
      }

      await delayMutation.mutateAsync({ task: delayingTask, delayUntil: values.delayUntil });
    },
    completeMutation,
    cancelMutation,
    delayMutation,
    delayTaskForm,
    delayingTask,
    copyTaskPreparedMessage: async (task: RecurringTask) => {
      const freshTask = await getFreshTask(task);
      if (!freshTask) {
        void message.error("Задача больше не актуальна.");
        return;
      }

      await navigator.clipboard.writeText(freshTask.preparedMessage);
      void message.success("Текст сообщения обновлён и скопирован.");
    },
    openTaskTelegram: async (task: RecurringTask) => {
      if (!task.telegram) {
        return;
      }

      const freshTask = await getFreshTask(task);
      if (!freshTask) {
        void message.error("Задача больше не актуальна.");
        return;
      }

      const telegramLink = buildTelegramLink(task.telegram, freshTask.preparedMessage);
      if (!telegramLink) {
        void message.error("Не удалось сформировать ссылку Telegram.");
        return;
      }

      window.location.href = telegramLink;
    },
    openTaskVk: async (task: RecurringTask) => {
      if (!task.vk) {
        return;
      }

      const freshTask = await getFreshTask(task);
      if (!freshTask) {
        void message.error("Задача больше не актуальна.");
        return;
      }

      const vkLink = buildVkLink(task.vk);
      if (!vkLink) {
        void message.error("Не удалось сформировать ссылку VK.");
        return;
      }

      await navigator.clipboard.writeText(freshTask.preparedMessage);
      void message.success("Текст сообщения обновлён и скопирован.");
      window.open(vkLink, "_blank", "noopener,noreferrer");
    },
    downloadTeacherSchedule: async (task: RecurringTask) => {
      if (!task.teacherId) {
        void message.error("Не указан преподаватель для расписания.");
        return;
      }

      try {
        const blob = await tasksApi.teacherScheduleImage({
          teacherId: task.teacherId,
          date: task.businessDate,
          timezone,
        });

        downloadBlob(blob, `teacher_schedule_${task.businessDate}_${task.teacherId}.png`);
      } catch (error) {
        for (const errorMessage of getApiErrorMessages(error)) {
          void message.error(errorMessage);
        }
      }
    },
    openTeacherScheduleMessenger: async (task: RecurringTask, messengerUrl: string) => {
      if (!task.teacherId) {
        void message.error("Не указан преподаватель для расписания.");
        return;
      }

      if (typeof ClipboardItem === "undefined" || !("clipboard" in navigator) || typeof navigator.clipboard.write !== "function") {
        void message.error("Браузер не поддерживает копирование изображения в буфер обмена.");
        return;
      }

      try {
        const blob = await tasksApi.teacherScheduleImage({
          teacherId: task.teacherId,
          date: task.businessDate,
          timezone,
        });

        const imageBlob = blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" });
        await navigator.clipboard.write([
          new ClipboardItem({
            [imageBlob.type]: imageBlob,
          }),
        ]);

        void message.success("Изображение расписания скопировано в буфер обмена.");
        if (messengerUrl.startsWith("tg://")) {
          window.location.href = messengerUrl;
          return;
        }

        window.open(messengerUrl, "_blank", "noopener,noreferrer");
      } catch (error) {
        for (const errorMessage of getApiErrorMessages(error)) {
          void message.error(errorMessage);
        }
      }
    },
    openRuleEditor: (rule: RecurringTaskRule) => {
      setEditingRule(rule);
      setEditingRuleBaselineActivityId(rule.lastActivity?.id ?? null);
      ruleForm.setFieldsValue({
        isEnabled: rule.isEnabled,
        messageTemplate: rule.messageTemplate,
        offsetMinutes: rule.offsetMinutes ?? undefined,
        cooldownDays: rule.cooldownDays ?? undefined,
      });
    },
    closeRuleEditor: () => {
      setEditingRule(null);
      setEditingRuleBaselineActivityId(undefined);
      ruleForm.resetFields();
    },
    submitRuleEditor: (values: RecurringTaskRuleFormValues) => {
      if (!editingRule) {
        return;
      }

      updateRuleMutation.mutate({
        id: editingRule.id,
        values,
        expectedActivityId: editingRuleBaselineActivityId ?? undefined,
      });
    },
  };
}

const taskStatuses = new Set<RecurringTaskListStatus>(["open", "completed", "cancelled", "delayed"]);
const taskTypes = new Set<RecurringTaskType>([
  "appointment-reminder",
  "birthday-greeting",
  "trial-follow-up",
  "inactive-client-reminder",
  "teacher-daily-schedule",
  "debtor-reminder",
  "custom-task",
]);

function readTaskStatus(value: string | null): RecurringTaskListStatus {
  return value && taskStatuses.has(value as RecurringTaskListStatus) ? (value as RecurringTaskListStatus) : "open";
}

function readTaskType(value: string | null): RecurringTaskType | "all" {
  return value && taskTypes.has(value as RecurringTaskType) ? (value as RecurringTaskType) : "all";
}

function buildTelegramLink(value: string, message: string) {
  const handle = getSocialHandle(value, "telegram");
  return handle ? `tg://resolve?domain=${encodeURIComponent(handle)}&text=${encodeURIComponent(message)}` : undefined;
}

function buildVkLink(value: string) {
  const handle = getSocialHandle(value, "vk");
  return handle ? `https://vk.me/${handle}` : undefined;
}
