import * as v from "valibot";

import { type MelodyTrackDatabase, melodyTrackDatabase, runReadWriteTransaction } from "@/shared/database";

import {
  createOfflineId,
  normalizeQueueItem,
  type OfflineCreateKind,
  offlineQueueChangedEventName,
  type OfflineQueuedCreate,
  type OfflineQueuedCreateInput,
  type OfflineQueueRepository,
  type QueuedCreateFromInput,
} from "./offlineQueue";

type OfflineCommandRecord = {
  schemaVersion: 1;
  ownerUserId: string;
  id: string;
  kind: OfflineCreateKind;
  createdAtUtc: string;
  updatedAtUtc: string;
  data: OfflineQueuedCreate;
};

type OfflineIdMappingRecord = {
  schemaVersion: 1;
  ownerUserId: string;
  temporaryId: string;
  serverId: string;
  updatedAtUtc: string;
};

const schemaVersion = 1;
const commandEnvelopeSchema = v.object({
  schemaVersion: v.literal(schemaVersion),
  ownerUserId: v.string(),
  updatedAtUtc: v.string(),
  data: v.unknown(),
});
const idMappingSchema = v.object({
  schemaVersion: v.literal(schemaVersion),
  ownerUserId: v.string(),
  temporaryId: v.string(),
  serverId: v.string(),
  updatedAtUtc: v.string(),
});

export function createDefaultOfflineQueueRepository(ownerUserId: string) {
  return createIndexedDbOfflineQueueRepository(melodyTrackDatabase, ownerUserId);
}

export function createIndexedDbOfflineQueueRepository(
  database: MelodyTrackDatabase,
  ownerUserId: string,
  dispatchChanged: () => void = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(offlineQueueChangedEventName));
    }
  },
): OfflineQueueRepository {
  const commands = database.table<OfflineCommandRecord, [string, string]>("offlineCommands");
  const idMappings = database.table<OfflineIdMappingRecord, [string, string]>("offlineIdMappings");

  return {
    async list() {
      const records = await commands.where("ownerUserId").equals(ownerUserId).sortBy("createdAtUtc");
      const validItems: OfflineQueuedCreate[] = [];
      const corruptKeys: Array<[string, string]> = [];
      for (const record of records) {
        const envelope = v.safeParse(commandEnvelopeSchema, record);
        const item = envelope.success ? normalizeQueueItem(envelope.output.data) : null;
        if (item && envelope.success && envelope.output.ownerUserId === ownerUserId) {
          validItems.push(item);
        } else {
          corruptKeys.push([ownerUserId, record.id]);
        }
      }
      if (corruptKeys.length > 0) {
        await commands.bulkDelete(corruptKeys);
      }
      return validItems;
    },
    async enqueue<TInput extends OfflineQueuedCreateInput>(item: TInput) {
      const now = new Date().toISOString();
      const queuedItem: OfflineQueuedCreate = {
        ...item,
        id: createOfflineId(item.kind),
        createdAtUtc: now,
        attemptCount: 0,
      };
      await commands.add({
        schemaVersion,
        ownerUserId,
        id: queuedItem.id,
        kind: queuedItem.kind,
        createdAtUtc: queuedItem.createdAtUtc,
        updatedAtUtc: now,
        data: queuedItem,
      });
      dispatchChanged();
      return queuedItem as QueuedCreateFromInput<TInput>;
    },
    async complete(id, tempIdReplacement) {
      await runReadWriteTransaction(database, ["offlineCommands", "offlineIdMappings"], async () => {
        await commands.delete([ownerUserId, id]);
        if (tempIdReplacement) {
          await idMappings.put({
            schemaVersion,
            ownerUserId,
            temporaryId: tempIdReplacement.temporaryId,
            serverId: tempIdReplacement.serverId,
            updatedAtUtc: new Date().toISOString(),
          });
        }
      });
      dispatchChanged();
    },
    async markAttemptFailed(id, error, attemptedAtUtc) {
      const record = await commands.get([ownerUserId, id]);
      const item = record ? normalizeQueueItem(record.data) : null;
      if (!record || !item) {
        return;
      }
      await commands.put({
        ...record,
        updatedAtUtc: attemptedAtUtc,
        data: {
          ...item,
          attemptCount: item.attemptCount + 1,
          lastAttemptAtUtc: attemptedAtUtc,
          lastError: error,
        },
      });
      dispatchChanged();
    },
    async clear() {
      await runReadWriteTransaction(database, ["offlineCommands", "offlineIdMappings"], async () => {
        await commands.where("ownerUserId").equals(ownerUserId).delete();
        await idMappings.where("ownerUserId").equals(ownerUserId).delete();
      });
      dispatchChanged();
    },
    async resolveId(id) {
      const record = await idMappings.get([ownerUserId, id]);
      const parsed = v.safeParse(idMappingSchema, record);
      return parsed.success && parsed.output.ownerUserId === ownerUserId ? parsed.output.serverId : id;
    },
  };
}
