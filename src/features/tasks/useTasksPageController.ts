import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import { useMemo, useState } from "react";
import { tasksApi } from "@/api/crm";
import { getApiErrorMessages } from "@/api/http";
import { queryKeys } from "@/api/queryKeys";
import type { RecurringTask, RecurringTaskType } from "@/api/types";

export function useTasksPageController() {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [type, setType] = useState<RecurringTaskType | "all">("all");
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();

  const query = useQuery({
    queryKey: queryKeys.tasks.due(timezone, type === "all" ? null : type),
    queryFn: () => tasksApi.due({ timezone, type }),
  });

  const completeMutation = useMutation({
    mutationFn: (task: RecurringTask) =>
      tasksApi.complete({
        timezone,
        ruleId: task.ruleId,
        type: task.type,
        deduplicationKey: task.deduplicationKey,
        clientId: task.clientId,
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

  return {
    type,
    setType,
    query,
    tasks: query.data ?? [],
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
  };
}
