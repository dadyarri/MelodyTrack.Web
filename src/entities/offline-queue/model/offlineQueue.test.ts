import "fake-indexeddb/auto";

import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MelodyTrackDatabase } from "@/shared/database";

import { createIndexedDbOfflineQueueRepository } from "./indexedDbOfflineQueueRepository";
import { discardLegacyOfflineQueue } from "./offlineQueue";
import { replayOfflineQueue } from "./replayOfflineQueue";

let database: MelodyTrackDatabase;

beforeEach(() => {
  database = new MelodyTrackDatabase(`melodytrack-test-${crypto.randomUUID()}`);
  localStorage.clear();
});

afterEach(async () => {
  database.close();
  await database.delete();
});

describe("offline queue persistence", () => {
  it("discards the legacy Web Storage queue without migration", () => {
    localStorage.setItem("melodytrack:offline-queue", JSON.stringify([{ id: "legacy-command" }]));

    discardLegacyOfflineQueue(localStorage);

    expect(localStorage.getItem("melodytrack:offline-queue")).toBeNull();
  });

  it("preserves a versioned user partition across repository restarts", async () => {
    const firstRepository = createIndexedDbOfflineQueueRepository(database, "user-1", vi.fn());
    await firstRepository.enqueue({
      kind: "expenses:create",
      replayKey: "replay-1",
      payload: {
        description: "Strings",
        amount: 1200,
        date: "2026-07-25T10:00:00.000Z",
      },
    });

    const restartedRepository = createIndexedDbOfflineQueueRepository(database, "user-1", vi.fn());
    expect(await restartedRepository.list()).toEqual(await firstRepository.list());
    expect(await createIndexedDbOfflineQueueRepository(database, "user-2", vi.fn()).list()).toEqual([]);
  });

  it("discards corrupt records instead of replaying unvalidated data", async () => {
    await database.table("offlineCommands").add({
      schemaVersion: 1,
      ownerUserId: "user-1",
      id: "corrupt",
      kind: "clients:create",
      createdAtUtc: "2026-07-25T10:00:00.000Z",
      updatedAtUtc: "2026-07-25T10:00:00.000Z",
      data: { id: "corrupt", kind: "clients:create", payload: { firstName: "Missing metadata" } },
    });
    const repository = createIndexedDbOfflineQueueRepository(database, "user-1", vi.fn());

    expect(await repository.list()).toEqual([]);
    expect(await database.table("offlineCommands").count()).toBe(0);
  });

  it("reports IndexedDB write failures instead of claiming an offline save", async () => {
    const repository = createIndexedDbOfflineQueueRepository(database, "user-1", vi.fn());
    database.close();

    await expect(
      repository.enqueue({
        kind: "services:create",
        replayKey: "service-1",
        payload: { name: "Piano", price: 1000 },
      }),
    ).rejects.toThrow();
  });
});

describe("offline queue replay", () => {
  it("commits temporary-ID replacement with command completion across partial failure and restart", async () => {
    const repository = createIndexedDbOfflineQueueRepository(database, "user-1", vi.fn());
    const temporaryClientId = "offline:client:1";
    await repository.enqueue({
      kind: "clients:create",
      tempId: temporaryClientId,
      replayKey: "client-replay",
      payload: { firstName: "Ada", lastName: "Lovelace" },
    });
    await repository.enqueue({
      kind: "payments:create",
      replayKey: "payment-replay",
      payload: {
        clientId: temporaryClientId,
        amount: 5000,
        date: "2026-07-25T10:00:00.000Z",
      },
    });

    const offlineError = new AxiosError("offline", AxiosError.ERR_NETWORK);
    const firstResult = await replayOfflineQueue({
      repository,
      execute: (item) => {
        if (item.kind === "clients:create") {
          return Promise.resolve({
            tempIdReplacement: { temporaryId: item.tempId, serverId: "server-client-1" },
          });
        }
        return Promise.reject(offlineError);
      },
      isRetryableError: (error) => error === offlineError,
      now: () => new Date("2026-07-25T11:00:00.000Z"),
    });

    expect(firstResult).toMatchObject({ status: "pending", syncedCount: 1, remainingCount: 1 });
    expect((await repository.list())[0]).toMatchObject({
      attemptCount: 1,
      lastAttemptAtUtc: "2026-07-25T11:00:00.000Z",
      lastError: "offline",
    });

    const restartedRepository = createIndexedDbOfflineQueueRepository(database, "user-1", vi.fn());
    let replayedClientId: string | undefined;
    const retryResult = await replayOfflineQueue({
      repository: restartedRepository,
      execute: async (item, resolveId) => {
        if (item.kind === "payments:create") {
          replayedClientId = await resolveId(item.payload.clientId);
        }
      },
      isRetryableError: () => false,
    });

    expect(replayedClientId).toBe("server-client-1");
    expect(retryResult).toMatchObject({ status: "synced", syncedCount: 1, remainingCount: 0 });
  });

  it("stops on a permanent conflict and preserves the failed item and later work", async () => {
    const repository = createIndexedDbOfflineQueueRepository(database, "user-1", vi.fn());
    await repository.enqueue({
      kind: "services:create",
      replayKey: "service-1",
      payload: { name: "First", price: 1000 },
    });
    await repository.enqueue({
      kind: "services:create",
      replayKey: "service-2",
      payload: { name: "Second", price: 2000 },
    });
    const conflict = new Error("stale conflict");

    const result = await replayOfflineQueue({
      repository,
      execute: () => Promise.reject(conflict),
      isRetryableError: () => false,
      now: () => new Date("2026-07-25T12:00:00.000Z"),
    });

    expect(result).toMatchObject({
      status: "error",
      syncedCount: 0,
      remainingCount: 2,
      error: conflict,
    });
    expect(await repository.list()).toMatchObject([
      { replayKey: "service-1", attemptCount: 1, lastError: "stale conflict" },
      { replayKey: "service-2", attemptCount: 0 },
    ]);
  });
});
