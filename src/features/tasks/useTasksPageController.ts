import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import { useMemo, useState } from "react";
import { tasksApi } from "@/api/crm";
import { getApiErrorMessages } from "@/api/http";
import { queryKeys } from "@/api/queryKeys";
import type { RecurringTask, RecurringTaskListStatus, RecurringTaskType } from "@/api/types";
import { downloadBlob } from "@/utils/download";

export function useTasksPageController() {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [status, setStatus] = useState<RecurringTaskListStatus>("open");
  const [type, setType] = useState<RecurringTaskType | "all">("all");
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();

  const query = useQuery({
    queryKey: queryKeys.tasks.due(timezone, status, type === "all" ? null : type),
    queryFn: () => tasksApi.due({ timezone, status, type }),
  });

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

  return {
    status,
    setStatus,
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
  };
}
