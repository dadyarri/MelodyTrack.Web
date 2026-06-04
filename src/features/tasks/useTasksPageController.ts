import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import { useMemo, useState } from "react";
import { tasksApi } from "@/api/crm";
import { getApiErrorMessages } from "@/api/http";
import { queryKeys } from "@/api/queryKeys";
import type { RecurringTask, RecurringTaskListStatus, RecurringTaskRule, RecurringTaskType, Ulid } from "@/api/types";
import { downloadBlob } from "@/utils/download";
import { findItemInQueryData, handleStaleEntityConflict, isActivityStale } from "@/utils/staleEntity";

export type RecurringTaskRuleFormValues = {
  isEnabled: boolean;
  messageTemplate: string;
  offsetMinutes?: number | null;
  cooldownDays?: number | null;
};

export function useTasksPageController() {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [status, setStatus] = useState<RecurringTaskListStatus>("open");
  const [type, setType] = useState<RecurringTaskType | "all">("all");
  const [activeTab, setActiveTab] = useState<"tasks" | "rules">("tasks");
  const [editingRule, setEditingRule] = useState<RecurringTaskRule | null>(null);
  const [editingRuleBaselineActivityId, setEditingRuleBaselineActivityId] = useState<Ulid | null | undefined>();
  const [ruleForm] = Form.useForm<RecurringTaskRuleFormValues>();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();

  const query = useQuery({
    queryKey: queryKeys.tasks.due(timezone, status, type === "all" ? null : type),
    queryFn: () => tasksApi.due({ timezone, status, type }),
  });
  const rulesQuery = useQuery({
    queryKey: queryKeys.tasks.rules,
    queryFn: () => tasksApi.rules(),
  });
  const currentEditingRule = editingRule ? (rulesQuery.data?.find((rule) => rule.id === editingRule.id) ?? editingRule) : null;
  const isEditingRuleStale = currentEditingRule ? isActivityStale(currentEditingRule.lastActivity?.id, editingRuleBaselineActivityId) : false;

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
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    onError: (error) => {
      for (const errorMessage of getApiErrorMessages(error)) {
        void message.error(errorMessage);
      }
    },
  });

  const skipMutation = useMutation({
    mutationFn: (task: RecurringTask) =>
      tasksApi.skip({
        timezone,
        ruleId: task.ruleId,
        type: task.type,
        deduplicationKey: task.deduplicationKey,
        clientId: task.clientId,
        teacherId: task.teacherId,
        appointmentId: task.appointmentId,
      }),
    onSuccess: async () => {
      void message.success("Задача пропущена");
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.rules });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: queryKeys.tasks.rules,
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
            findItemInQueryData(queryClient, queryKeys.tasks.rules, (data) => data as RecurringTaskRule[] | undefined, variables.id) ??
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
    editingRule,
    currentEditingRule,
    isEditingRuleStale,
    updateRuleMutation,
    completeTask: (task: RecurringTask) => {
      modal.confirm({
        title: "Завершить задачу?",
        content: "Задача будет отмечена как выполненная и больше не появится в этом периоде.",
        okText: "Завершить",
        cancelText: "Отмена",
        onOk: async () => {
          await completeMutation.mutateAsync(task);
        },
      });
    },
    skipTask: (task: RecurringTask) => {
      modal.confirm({
        title: "Пропустить задачу?",
        content: "Задача не будет показываться повторно в этом периоде.",
        okText: "Пропустить",
        cancelText: "Отмена",
        onOk: async () => {
          await skipMutation.mutateAsync(task);
        },
      });
    },
    completeMutation,
    skipMutation,
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
