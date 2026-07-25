import Dexie from "dexie";

export class MelodyTrackDatabase extends Dexie {
  constructor(name = "melodytrack") {
    super(name);
    this.version(1).stores({
      offlineCommands: "[ownerUserId+id], ownerUserId, createdAtUtc, kind",
      offlineIdMappings: "[ownerUserId+temporaryId], ownerUserId, updatedAtUtc",
      drafts: "[ownerUserId+key], ownerUserId, updatedAtUtc, expiresAtUtc",
      referenceData: "[ownerUserId+key], ownerUserId, updatedAtUtc, expiresAtUtc",
      readModels: "[ownerUserId+key], ownerUserId, updatedAtUtc, expiresAtUtc",
      storageMetadata: "key, updatedAtUtc",
    });
  }
}

export const melodyTrackDatabase = new MelodyTrackDatabase();

type ReadWriteTransaction = (mode: "rw", stores: string[], scope: () => Promise<void>) => Promise<void>;

export function runReadWriteTransaction(database: MelodyTrackDatabase, stores: string[], scope: () => Promise<void>) {
  const transaction = database.transaction.bind(database) as unknown as ReadWriteTransaction;
  return transaction("rw", stores, scope);
}
