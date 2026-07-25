import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createLocalStorageOfflineQueueRepository } from "./offlineQueue";
import { replayOfflineQueue } from "./replayOfflineQueue";

describe("offline queue persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("discards the unversioned legacy array", () => {
    localStorage.setItem(
      "melodytrack:offline-queue",
      JSON.stringify([
        {
          id: "queue-1",
          kind: "expenses:create",
          replayKey: "replay-1",
          createdAtUtc: "2026-07-25T10:00:00.000Z",
          payload: {
            description: "Strings",
            amount: 1200,
            date: "2026-07-25T10:00:00.000Z",
          },
        },
      ]),
    );

    const repository = createLocalStorageOfflineQueueRepository(localStorage, vi.fn());

    expect(repository.list()).toEqual([]);
    expect(localStorage.getItem("melodytrack:offline-queue")).toBeNull();
  });

  it("preserves a versioned queue across repository restarts", () => {
    const firstRepository = createLocalStorageOfflineQueueRepository(localStorage, vi.fn());
    firstRepository.enqueue({
      kind: "expenses:create",
      replayKey: "replay-1",
      payload: {
        description: "Strings",
        amount: 1200,
        date: "2026-07-25T10:00:00.000Z",
      },
    });

    const restartedRepository = createLocalStorageOfflineQueueRepository(localStorage, vi.fn());
    expect(restartedRepository.list()).toEqual(firstRepository.list());
  });

  it("rejects a corrupt persisted schema instead of replaying unvalidated data", () => {
    localStorage.setItem(
      "melodytrack:offline-queue",
      JSON.stringify({
        schemaVersion: 1,
        revision: 2,
        tempIdMap: {},
        items: [{ kind: "clients:create", payload: { firstName: "Missing metadata" } }],
      }),
    );

    const repository = createLocalStorageOfflineQueueRepository(localStorage, vi.fn());

    expect(repository.list()).toEqual([]);
    expect(localStorage.getItem("melodytrack:offline-queue")).toBeNull();
  });
});

describe("offline queue replay", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists temporary-ID replacement across partial failure and restart", async () => {
    const repository = createLocalStorageOfflineQueueRepository(localStorage, vi.fn());
    const temporaryClientId = "offline:client:1";
    repository.enqueue({
      kind: "clients:create",
      tempId: temporaryClientId,
      replayKey: "client-replay",
      payload: { firstName: "Ada", lastName: "Lovelace" },
    });
    repository.enqueue({
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
    expect(repository.list()[0]).toMatchObject({
      attemptCount: 1,
      lastAttemptAtUtc: "2026-07-25T11:00:00.000Z",
      lastError: "offline",
    });

    const restartedRepository = createLocalStorageOfflineQueueRepository(localStorage, vi.fn());
    let replayedClientId: string | undefined;
    const retryResult = await replayOfflineQueue({
      repository: restartedRepository,
      execute: (item, resolveId) => {
        if (item.kind === "payments:create") {
          replayedClientId = resolveId(item.payload.clientId);
        }
        return Promise.resolve(undefined);
      },
      isRetryableError: () => false,
    });

    expect(replayedClientId).toBe("server-client-1");
    expect(retryResult).toMatchObject({ status: "synced", syncedCount: 1, remainingCount: 0 });
  });

  it("stops on a permanent conflict and preserves the failed item and later work", async () => {
    const repository = createLocalStorageOfflineQueueRepository(localStorage, vi.fn());
    repository.enqueue({
      kind: "services:create",
      replayKey: "service-1",
      payload: { name: "First", price: 1000 },
    });
    repository.enqueue({
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
    expect(repository.list()).toMatchObject([
      { replayKey: "service-1", attemptCount: 1, lastError: "stale conflict" },
      { replayKey: "service-2", attemptCount: 0 },
    ]);
  });
});
