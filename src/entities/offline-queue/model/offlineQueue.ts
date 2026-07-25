import axios from "axios";

import { createReplayKey } from "@/shared/lib";
import { formatDateTime } from "@/shared/lib/date";

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

export interface OfflineQueueRepository {
  list: () => Promise<OfflineQueuedCreate[]>;
  enqueue: <TInput extends OfflineQueuedCreateInput>(item: TInput) => Promise<QueuedCreateFromInput<TInput>>;
  complete: (id: string, tempIdReplacement?: { temporaryId: string; serverId: string }) => Promise<void>;
  markAttemptFailed: (id: string, error: string, attemptedAtUtc: string) => Promise<void>;
  clear: () => Promise<void>;
  resolveId: (id: string) => Promise<string>;
}

const offlineQueueStorageKey = "melodytrack:offline-queue";
export const offlineQueueChangedEventName = "melodytrack:offline-queue-changed";
let ownerUserIdProvider: () => string | null = () => null;

export function configureOfflineQueueOwner(provider: () => string | null) {
  ownerUserIdProvider = provider;
}

export function discardLegacyOfflineQueue(storage: Storage) {
  storage.removeItem(offlineQueueStorageKey);
}

async function getDefaultRepository() {
  const ownerUserId = ownerUserIdProvider();
  if (!ownerUserId) {
    throw new Error("Offline storage requires an authenticated user.");
  }
  const { createDefaultOfflineQueueRepository } = await import("./indexedDbOfflineQueueRepository");
  return createDefaultOfflineQueueRepository(ownerUserId);
}

export async function loadOfflineQueue() {
  return (await getDefaultRepository()).list();
}

export async function enqueueOfflineCreate<TInput extends OfflineQueuedCreateInput>(item: TInput): Promise<QueuedCreateFromInput<TInput>> {
  return (await getDefaultRepository()).enqueue(item);
}

export async function getOfflineQueueRepository() {
  return getDefaultRepository();
}

export async function clearOfflineQueue() {
  await (await getDefaultRepository()).clear();
}

export function shouldQueueOfflineError(error: unknown) {
  return axios.isAxiosError(error) && !axios.isCancel(error) && !error.response;
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

export function createOfflineId(kind: string) {
  return `offline:${kind}:${createReplayKey()}`;
}

function formatPaymentLikeLabel(clientId: string, clientLabel: string | undefined, amount: number, date: string) {
  return `${clientLabel ?? clientId} · ${String(amount)} ₽ · ${formatDateTime(date)}`;
}

export function normalizeQueueItem(value: unknown): OfflineQueuedCreate | null {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
