import * as v from "valibot";

import { melodyTrackDatabase } from "@/shared/database";

import { requireStorageOwnerUserId } from "./owner";

export type FormDraft<TValues> = {
  replayKey: string;
  updatedAtUtc: string;
  values: TValues;
};

export type DraftHydrationRef = {
  current: boolean;
};

type DraftRecord = {
  schemaVersion: 1;
  ownerUserId: string;
  key: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  expiresAtUtc: string;
  data: FormDraft<unknown>;
};

const schemaVersion = 1;
const retentionMs = 30 * 24 * 60 * 60 * 1000;
const draftEnvelopeSchema = v.object({
  schemaVersion: v.literal(schemaVersion),
  ownerUserId: v.string(),
  key: v.string(),
  createdAtUtc: v.string(),
  updatedAtUtc: v.string(),
  expiresAtUtc: v.string(),
  data: v.object({
    replayKey: v.string(),
    updatedAtUtc: v.string(),
    values: v.unknown(),
  }),
});
export async function loadDraft<TValues>(key: string, validateValues: (value: unknown) => value is TValues) {
  const ownerUserId = requireStorageOwnerUserId();
  const drafts = melodyTrackDatabase.table<DraftRecord, [string, string]>("drafts");
  const record = await drafts.get([ownerUserId, key]);
  if (record) {
    const parsed = v.safeParse(draftEnvelopeSchema, record);
    if (
      parsed.success &&
      parsed.output.ownerUserId === ownerUserId &&
      Date.parse(parsed.output.expiresAtUtc) > Date.now() &&
      validateValues(parsed.output.data.values)
    ) {
      return parsed.output.data as FormDraft<TValues>;
    }
    await drafts.delete([ownerUserId, key]);
  }

  return migrateLegacyDraft(key, validateValues);
}

export async function saveDraftValues<TValues>(key: string, replayKey: string, values: TValues) {
  const ownerUserId = requireStorageOwnerUserId();
  const drafts = melodyTrackDatabase.table<DraftRecord, [string, string]>("drafts");
  const now = new Date();
  const existing = await drafts.get([ownerUserId, key]);
  const draft: FormDraft<TValues> = {
    replayKey,
    updatedAtUtc: now.toISOString(),
    values,
  };
  await drafts.put({
    schemaVersion,
    ownerUserId,
    key,
    createdAtUtc: existing?.createdAtUtc ?? now.toISOString(),
    updatedAtUtc: now.toISOString(),
    expiresAtUtc: new Date(now.getTime() + retentionMs).toISOString(),
    data: draft,
  });
  return draft;
}

export async function clearDraft(key: string) {
  const ownerUserId = requireStorageOwnerUserId();
  await melodyTrackDatabase.table<DraftRecord, [string, string]>("drafts").delete([ownerUserId, key]);
}

export function withDraftHydration(ref: DraftHydrationRef, action: () => void) {
  ref.current = true;
  action();
  queueMicrotask(() => {
    ref.current = false;
  });
}

async function migrateLegacyDraft<TValues>(key: string, validateValues: (value: unknown) => value is TValues) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      !isRecord(parsed) ||
      typeof parsed.replayKey !== "string" ||
      typeof parsed.updatedAtUtc !== "string" ||
      !validateValues(parsed.values) ||
      Date.parse(parsed.updatedAtUtc) + retentionMs <= Date.now()
    ) {
      localStorage.removeItem(key);
      return null;
    }

    const draft = await saveDraftValues(key, parsed.replayKey, parsed.values);
    localStorage.removeItem(key);
    return draft;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
