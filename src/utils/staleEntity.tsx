import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { Space, Typography } from "antd";
import type { HookAPI } from "antd/es/modal/useModal";
import { getStaleEntityConflict } from "../api/http";
import type { RecordActivity, StaleEntityConflict, Ulid } from "../api/types";
import { formatDateTime } from "./date";

export function formatRecordActivitySummary(activity?: RecordActivity | null) {
  if (!activity) {
    return "Последнее изменение недоступно.";
  }

  const actor = activity.actorDisplayName ?? activity.actorEmail ?? "Другой пользователь";
  const details = activity.details ? ` ${activity.details}` : "";
  return `${actor} изменил запись ${formatDateTime(activity.createdAtUtc)}.${details}`.trim();
}

export function openStaleEntityConflictModal({
  modal,
  title,
  conflict,
  okText,
  cancelText,
  onConfirm,
  onReload,
}: {
  modal: HookAPI;
  title: string;
  conflict: StaleEntityConflict;
  okText: string;
  cancelText: string;
  onConfirm: () => void;
  onReload: () => void;
}) {
  modal.confirm({
    title,
    content: (
      <Space orientation="vertical" size={8}>
        <Typography.Text>{conflict.message}</Typography.Text>
        <Typography.Text type="secondary">{formatRecordActivitySummary(conflict.currentActivity)}</Typography.Text>
      </Space>
    ),
    okText,
    cancelText,
    onOk: onConfirm,
    onCancel: onReload,
  });
}

export function isActivityStale(currentActivityId: Ulid | null | undefined, baselineActivityId: Ulid | null | undefined) {
  return baselineActivityId !== undefined && (currentActivityId ?? null) !== baselineActivityId;
}

export async function handleStaleEntityConflict<TError>({
  error,
  modal,
  queryClient,
  invalidateQueryKey,
  showErrors,
  title,
  okText,
  cancelText,
  onConfirm,
  onReload,
}: {
  error: TError;
  modal: HookAPI;
  queryClient: QueryClient;
  invalidateQueryKey: QueryKey;
  showErrors: (error: TError) => void;
  title: string;
  okText: string;
  cancelText: string;
  onConfirm: (conflict: StaleEntityConflict) => void;
  onReload: (conflict: StaleEntityConflict) => void;
}) {
  const conflict = getStaleEntityConflict(error);
  if (!conflict) {
    showErrors(error);
    return false;
  }

  await queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
  openStaleEntityConflictModal({
    modal,
    title,
    okText,
    cancelText,
    conflict,
    onConfirm: () => { onConfirm(conflict); },
    onReload: () => { onReload(conflict); },
  });
  return true;
}

export function findItemInQueryData<TItem extends { id: Ulid }, TData>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  getItems: (data: TData) => TItem[] | undefined,
  id: Ulid,
) {
  const queryData = queryClient.getQueriesData<TData>({ queryKey });
  for (const [, data] of queryData) {
    const item = getItems(data as TData)?.find((entry) => entry.id === id);
    if (item) {
      return item;
    }
  }

  return null;
}
