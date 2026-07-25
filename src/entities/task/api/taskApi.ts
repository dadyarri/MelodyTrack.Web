import { type CreateEntityResponse, http, type Ulid } from "@/shared/api";

import type { CreateCustomTaskInput, RecurringTask, RecurringTaskListStatus, RecurringTaskRule, RecurringTaskType } from "../model/types";

interface TaskIdentity {
  timezone: string;
  ruleId: Ulid;
  type: RecurringTaskType;
  deduplicationKey: string;
  clientId?: Ulid | null;
  teacherId?: Ulid | null;
  appointmentId?: Ulid | null;
}

export const tasksApi = {
  due(params: { timezone: string; status?: RecurringTaskListStatus; type?: RecurringTaskType | "all" }) {
    return http
      .get<{ tasks: RecurringTask[] }>("/tasks/due", {
        params: { ...params, type: params.type && params.type !== "all" ? params.type : undefined },
      })
      .then((response) => response.data.tasks);
  },
  complete(input: TaskIdentity & { preparedMessage?: string | null }) {
    return http.post<unknown>("/tasks/complete", input).then(() => undefined);
  },
  cancel(input: TaskIdentity) {
    return http.post<unknown>("/tasks/cancel", input).then(() => undefined);
  },
  delay(input: TaskIdentity & { delayUntilUtc: string }) {
    return http.post<unknown>("/tasks/delay", input).then(() => undefined);
  },
  teacherScheduleImage(params: { teacherId: Ulid; date: string; timezone: string }) {
    return http.get<Blob>("/tasks/teacher-schedule-image", { params, responseType: "blob" }).then((response) => response.data);
  },
  rules() {
    return http.get<{ rules: RecurringTaskRule[] }>("/tasks/rules").then((response) => response.data.rules);
  },
  updateRule(
    id: Ulid,
    input: { isEnabled: boolean; messageTemplate: string; offsetMinutes?: number | null; cooldownDays?: number | null },
    options?: { expectedActivityId?: Ulid },
  ) {
    return http.put<unknown>(`/tasks/rules/${id}`, { ...input, expectedActivityId: options?.expectedActivityId }).then(() => undefined);
  },
  createCustom(input: CreateCustomTaskInput) {
    return http.post<CreateEntityResponse>("/tasks/custom", input).then((response) => response.data);
  },
};
