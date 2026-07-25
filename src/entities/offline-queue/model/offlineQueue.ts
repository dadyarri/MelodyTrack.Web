import type { DefaultOptionType } from "antd/es/select";
import axios from "axios";

import { formatDateTime } from "@/shared/lib";
import { createReplayKey } from "@/shared/lib";

export type OfflineCreateKind = "clients:create" | "services:create" | "payments:create" | "expenses:create" | "appointments:create";

export type OfflineQueuedCreate =
  | {
      id: string;
      kind: "clients:create";
      tempId: string;
      replayKey: string;
      createdAtUtc: string;
      attemptCount: number;
      lastAttemptAtUtc?: string;
      lastError?: string;
      payload: {
        firstName: string;
        lastName: string;
        patronymic?: string | null;
        telegram?: string;
        vk?: string;
        phone?: string;
        sourceId?: string;
      };
    }
  | {
      id: string;
      kind: "services:create";
      replayKey: string;
      createdAtUtc: string;
      attemptCount: number;
      lastAttemptAtUtc?: string;
      lastError?: string;
      payload: {
        name: string;
        description?: string;
        isConsultation?: boolean;
        price: number;
      };
    }
  | {
      id: string;
      kind: "payments:create";
      replayKey: string;
      createdAtUtc: string;
      attemptCount: number;
      lastAttemptAtUtc?: string;
      lastError?: string;
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
      attemptCount: number;
      lastAttemptAtUtc?: string;
      lastError?: string;
      payload: {
        description: string;
        amount: number;
        date: string;
        categoryId?: string;
      };
    }
  | {
      id: string;
      kind: "appointments:create";
      replayKey: string;
      createdAtUtc: string;
      attemptCount: number;
      lastAttemptAtUtc?: string;
      lastError?: string;
      payload: {
        clientId: string;
        clientLabel?: string;
        serviceId: string;
        serviceLabel?: string;
        providerId?: string;
        providerLabel?: string;
        startDate: string;
        timezone: string;
        patternEndDate?: string;
        recurrencePattern?: number;
      };
    };

export type OfflineQueuedCreateInput =
  | Omit<
      Extract<OfflineQueuedCreate, { kind: "clients:create" }>,
      "id" | "createdAtUtc" | "attemptCount" | "lastAttemptAtUtc" | "lastError"
    >
  | Omit<
      Extract<OfflineQueuedCreate, { kind: "services:create" }>,
      "id" | "createdAtUtc" | "attemptCount" | "lastAttemptAtUtc" | "lastError"
    >
  | Omit<
      Extract<OfflineQueuedCreate, { kind: "payments:create" }>,
      "id" | "createdAtUtc" | "attemptCount" | "lastAttemptAtUtc" | "lastError"
    >
  | Omit<
      Extract<OfflineQueuedCreate, { kind: "expenses:create" }>,
      "id" | "createdAtUtc" | "attemptCount" | "lastAttemptAtUtc" | "lastError"
    >
  | Omit<
      Extract<OfflineQueuedCreate, { kind: "appointments:create" }>,
      "id" | "createdAtUtc" | "attemptCount" | "lastAttemptAtUtc" | "lastError"
    >;

export type QueuedCreateFromInput<TInput extends OfflineQueuedCreateInput> = Extract<OfflineQueuedCreate, { kind: TInput["kind"] }>;

type OfflineQueueSnapshot = {
  schemaVersion: 1;
  revision: number;
  items: OfflineQueuedCreate[];
  tempIdMap: Record<string, string>;
};

export interface OfflineQueueRepository {
  list: () => OfflineQueuedCreate[];
  enqueue: <TInput extends OfflineQueuedCreateInput>(item: TInput) => QueuedCreateFromInput<TInput>;
  complete: (id: string, tempIdReplacement?: { temporaryId: string; serverId: string }) => void;
  markAttemptFailed: (id: string, error: string, attemptedAtUtc: string) => void;
  clear: () => void;
  resolveId: (id: string) => string;
}

const currentSchemaVersion = 1;
const offlineQueueStorageKey = "melodytrack:offline-queue";
export const offlineQueueChangedEventName = "melodytrack:offline-queue-changed";

export function createLocalStorageOfflineQueueRepository(
  storage: Storage,
  dispatchChanged: () => void = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(offlineQueueChangedEventName));
    }
  },
): OfflineQueueRepository {
  const read = (): OfflineQueueSnapshot => {
    const raw = storage.getItem(offlineQueueStorageKey);
    if (!raw) {
      return emptySnapshot();
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      const snapshot = parseSnapshot(parsed);
      if (snapshot) {
        return snapshot;
      }
    } catch {
      // Invalid persisted state is discarded below.
    }

    storage.removeItem(offlineQueueStorageKey);
    return emptySnapshot();
  };

  const write = (snapshot: OfflineQueueSnapshot) => {
    storage.setItem(offlineQueueStorageKey, JSON.stringify(snapshot));
    dispatchChanged();
  };

  return {
    list: () => read().items,
    enqueue<TInput extends OfflineQueuedCreateInput>(item: TInput) {
      const snapshot = read();
      const queuedItem: OfflineQueuedCreate = {
        ...item,
        id: createOfflineId(item.kind),
        createdAtUtc: new Date().toISOString(),
        attemptCount: 0,
      };
      snapshot.items.push(queuedItem);
      snapshot.revision += 1;
      write(snapshot);
      return queuedItem as QueuedCreateFromInput<TInput>;
    },
    complete(id, tempIdReplacement) {
      const snapshot = read();
      snapshot.items = snapshot.items.filter((item) => item.id !== id);
      if (tempIdReplacement) {
        snapshot.tempIdMap[tempIdReplacement.temporaryId] = tempIdReplacement.serverId;
      }
      snapshot.revision += 1;
      write(snapshot);
    },
    markAttemptFailed(id, error, attemptedAtUtc) {
      const snapshot = read();
      snapshot.items = snapshot.items.map((item) =>
        item.id === id
          ? {
              ...item,
              attemptCount: item.attemptCount + 1,
              lastAttemptAtUtc: attemptedAtUtc,
              lastError: error,
            }
          : item,
      );
      snapshot.revision += 1;
      write(snapshot);
    },
    clear() {
      write(emptySnapshot());
    },
    resolveId: (id) => read().tempIdMap[id] ?? id,
  };
}

function getDefaultRepository() {
  if (typeof window === "undefined") {
    return null;
  }

  return createLocalStorageOfflineQueueRepository(window.localStorage);
}

export function loadOfflineQueue() {
  return getDefaultRepository()?.list() ?? [];
}

export function enqueueOfflineCreate<TInput extends OfflineQueuedCreateInput>(item: TInput): QueuedCreateFromInput<TInput> {
  const repository = getDefaultRepository();
  if (!repository) {
    throw new Error("Offline queue storage is unavailable.");
  }
  return repository.enqueue(item);
}

export function getOfflineQueueRepository() {
  const repository = getDefaultRepository();
  if (!repository) {
    throw new Error("Offline queue storage is unavailable.");
  }
  return repository;
}

export function clearOfflineQueue() {
  getDefaultRepository()?.clear();
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

export function formatQueuedClientLabel(client: { firstName: string; lastName: string; patronymic?: string | null }) {
  return [client.lastName, client.firstName, client.patronymic].filter(Boolean).join(" ");
}

function createOfflineId(kind: string) {
  return `offline:${kind}:${createReplayKey()}`;
}

function formatPaymentLikeLabel(clientId: string, clientLabel: string | undefined, amount: number, date: string) {
  return `${clientLabel ?? clientId} · ${String(amount)} ₽ · ${formatDateTime(date)}`;
}

function emptySnapshot(): OfflineQueueSnapshot {
  return {
    schemaVersion: currentSchemaVersion,
    revision: 0,
    items: [],
    tempIdMap: {},
  };
}

function parseSnapshot(value: unknown): OfflineQueueSnapshot | null {
  if (!isRecord(value) || value.schemaVersion !== currentSchemaVersion || !Array.isArray(value.items) || !isStringRecord(value.tempIdMap)) {
    return null;
  }

  const items = value.items.map(normalizeQueueItem);
  if (!items.every((item): item is OfflineQueuedCreate => item !== null)) {
    return null;
  }

  return {
    schemaVersion: currentSchemaVersion,
    revision: typeof value.revision === "number" && Number.isSafeInteger(value.revision) ? value.revision : 0,
    items,
    tempIdMap: value.tempIdMap,
  };
}

function normalizeQueueItem(value: unknown): OfflineQueuedCreate | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.replayKey !== "string" ||
    typeof value.createdAtUtc !== "string" ||
    !isRecord(value.payload)
  ) {
    return null;
  }

  const metadata = {
    attemptCount: typeof value.attemptCount === "number" && value.attemptCount >= 0 ? value.attemptCount : 0,
    ...(typeof value.lastAttemptAtUtc === "string" ? { lastAttemptAtUtc: value.lastAttemptAtUtc } : {}),
    ...(typeof value.lastError === "string" ? { lastError: value.lastError } : {}),
  };
  const base = {
    id: value.id,
    replayKey: value.replayKey,
    createdAtUtc: value.createdAtUtc,
    ...metadata,
  };

  if (
    value.kind === "clients:create" &&
    typeof value.tempId === "string" &&
    hasStrings(value.payload, "firstName", "lastName") &&
    hasOptionalNullableString(value.payload, "patronymic") &&
    hasOptionalStrings(value.payload, "telegram", "vk", "phone", "sourceId")
  ) {
    return {
      ...base,
      kind: value.kind,
      tempId: value.tempId,
      payload: value.payload as Extract<OfflineQueuedCreate, { kind: "clients:create" }>["payload"],
    };
  }
  if (
    value.kind === "services:create" &&
    hasStrings(value.payload, "name") &&
    typeof value.payload.price === "number" &&
    hasOptionalStrings(value.payload, "description") &&
    hasOptionalBoolean(value.payload, "isConsultation")
  ) {
    return {
      ...base,
      kind: value.kind,
      payload: value.payload as Extract<OfflineQueuedCreate, { kind: "services:create" }>["payload"],
    };
  }
  if (
    value.kind === "payments:create" &&
    hasStrings(value.payload, "clientId", "date") &&
    typeof value.payload.amount === "number" &&
    hasOptionalStrings(value.payload, "clientLabel", "serviceId", "serviceLabel", "description")
  ) {
    return {
      ...base,
      kind: value.kind,
      payload: value.payload as Extract<OfflineQueuedCreate, { kind: "payments:create" }>["payload"],
    };
  }
  if (
    value.kind === "expenses:create" &&
    hasStrings(value.payload, "description", "date") &&
    typeof value.payload.amount === "number" &&
    hasOptionalStrings(value.payload, "categoryId")
  ) {
    return {
      ...base,
      kind: value.kind,
      payload: value.payload as Extract<OfflineQueuedCreate, { kind: "expenses:create" }>["payload"],
    };
  }
  if (
    value.kind === "appointments:create" &&
    hasStrings(value.payload, "clientId", "serviceId", "startDate", "timezone") &&
    hasOptionalStrings(value.payload, "clientLabel", "serviceLabel", "providerId", "providerLabel", "patternEndDate") &&
    hasOptionalNumber(value.payload, "recurrencePattern")
  ) {
    return {
      ...base,
      kind: value.kind,
      payload: value.payload as Extract<OfflineQueuedCreate, { kind: "appointments:create" }>["payload"],
    };
  }
  return null;
}

function hasStrings(value: Record<string, unknown>, ...keys: string[]) {
  return keys.every((key) => typeof value[key] === "string");
}

function hasOptionalStrings(value: Record<string, unknown>, ...keys: string[]) {
  return keys.every((key) => value[key] === undefined || typeof value[key] === "string");
}

function hasOptionalNullableString(value: Record<string, unknown>, key: string) {
  return value[key] === undefined || value[key] === null || typeof value[key] === "string";
}

function hasOptionalBoolean(value: Record<string, unknown>, key: string) {
  return value[key] === undefined || typeof value[key] === "boolean";
}

function hasOptionalNumber(value: Record<string, unknown>, key: string) {
  return value[key] === undefined || typeof value[key] === "number";
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
