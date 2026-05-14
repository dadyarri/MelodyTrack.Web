import axios from "axios";
import type { Client } from "../api/types";
import type { DefaultOptionType } from "antd/es/select";
import { formatDateTime } from "./date";
import { createReplayKey } from "./drafts";

export type OfflineCreateKind = "clients:create" | "services:create" | "payments:create" | "expenses:create" | "appointments:create";

export type OfflineQueuedCreate =
  | {
      id: string;
      kind: "clients:create";
      tempId: string;
      replayKey: string;
      createdAtUtc: string;
      payload: {
        firstName: string;
        lastName: string;
        patronymic?: string | null;
        telegram?: string;
        vk?: string;
        phone?: string;
      };
    }
  | {
      id: string;
      kind: "services:create";
      replayKey: string;
      createdAtUtc: string;
      payload: {
        name: string;
        description?: string;
        price: number;
      };
    }
  | {
      id: string;
      kind: "payments:create";
      replayKey: string;
      createdAtUtc: string;
      payload: {
        clientId: string;
        clientLabel?: string;
        serviceId?: string;
        serviceLabel?: string;
        amount: number;
        date: string;
        description?: string;
      };
    }
  | {
      id: string;
      kind: "expenses:create";
      replayKey: string;
      createdAtUtc: string;
      payload: {
        description: string;
        amount: number;
      };
    }
  | {
      id: string;
      kind: "appointments:create";
      replayKey: string;
      createdAtUtc: string;
      payload: {
        clientId: string;
        clientLabel?: string;
        serviceId: string;
        serviceLabel?: string;
        providerId?: string;
        providerLabel?: string;
        startDate: string;
        patternEndDate?: string;
        recurrencePattern?: number;
      };
    };

export type OfflineQueuedCreateInput =
  | Omit<Extract<OfflineQueuedCreate, { kind: "clients:create" }>, "id" | "createdAtUtc">
  | Omit<Extract<OfflineQueuedCreate, { kind: "services:create" }>, "id" | "createdAtUtc">
  | Omit<Extract<OfflineQueuedCreate, { kind: "payments:create" }>, "id" | "createdAtUtc">
  | Omit<Extract<OfflineQueuedCreate, { kind: "expenses:create" }>, "id" | "createdAtUtc">
  | Omit<Extract<OfflineQueuedCreate, { kind: "appointments:create" }>, "id" | "createdAtUtc">;

const offlineQueueStorageKey = "melodytrack:offline-queue";
export const offlineQueueChangedEventName = "melodytrack:offline-queue-changed";

export function loadOfflineQueue() {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(offlineQueueStorageKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as OfflineQueuedCreate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueuedCreate[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(offlineQueueStorageKey, JSON.stringify(queue));
  window.dispatchEvent(new Event(offlineQueueChangedEventName));
}

export function enqueueOfflineCreate(item: OfflineQueuedCreateInput) {
  const queue = loadOfflineQueue();
  const queuedItem: OfflineQueuedCreate = {
    ...item,
    id: createOfflineId(item.kind),
    createdAtUtc: new Date().toISOString(),
  } as OfflineQueuedCreate;

  queue.push(queuedItem);
  saveOfflineQueue(queue);
  return queuedItem;
}

export function removeOfflineQueueItem(id: string) {
  const queue = loadOfflineQueue().filter((item) => item.id !== id);
  saveOfflineQueue(queue);
}

export function clearOfflineQueue() {
  saveOfflineQueue([]);
}

export function shouldQueueOfflineError(error: unknown) {
  return axios.isAxiosError(error) && !error.response;
}

export function getQueuedClientOption(value?: string) {
  if (!value) {
    return null;
  }

  const item = loadOfflineQueue().find(
    (entry): entry is Extract<OfflineQueuedCreate, { kind: "clients:create" }> => entry.kind === "clients:create" && entry.tempId === value,
  );
  if (!item) {
    return null;
  }

  return {
    value: item.tempId,
    label: formatQueuedClientLabel(item.payload),
  } satisfies DefaultOptionType;
}

export function formatOfflineQueueItem(item: OfflineQueuedCreate) {
  if (item.kind === "clients:create") {
    return `Клиент: ${formatQueuedClientLabel(item.payload)} (локально)`;
  }

  if (item.kind === "services:create") {
    return `Услуга: ${item.payload.name} (локально)`;
  }

  if (item.kind === "payments:create") {
    return `Платеж: ${formatPaymentLikeLabel(item.payload.clientId, item.payload.clientLabel, item.payload.amount, item.payload.date)} (локально)`;
  }

  if (item.kind === "expenses:create") {
    return `Расход: ${item.payload.description} (локально)`;
  }

  const service = item.payload.serviceLabel ?? item.payload.serviceId;
  const provider = item.payload.providerLabel ?? item.payload.providerId;
  const providerPart = provider ? ` · ${provider}` : "";
  return `Запись: ${item.payload.clientLabel ?? item.payload.clientId} · ${service}${providerPart} · ${formatDateTime(item.payload.startDate)} (локально)`;
}

export function createOfflineTempId(kind: string) {
  return `offline:${kind}:${createReplayKey()}`;
}

export function formatQueuedClientLabel(client: Pick<Client, "firstName" | "lastName" | "patronymic">) {
  return [client.lastName, client.firstName, client.patronymic].filter(Boolean).join(" ");
}

function createOfflineId(kind: string) {
  return `offline:${kind}:${createReplayKey()}`;
}

function formatPaymentLikeLabel(clientId: string, clientLabel: string | undefined, amount: number, date: string) {
  return `${clientLabel ?? clientId} · ${amount} ₽ · ${formatDateTime(date)}`;
}
