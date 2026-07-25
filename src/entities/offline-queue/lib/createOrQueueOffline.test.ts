import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { melodyTrackDatabase } from "@/shared/database";

import { configureOfflineQueueOwner } from "../model/offlineQueue";
import { createOrQueueOffline } from "./createOrQueueOffline";

beforeEach(async () => {
  configureOfflineQueueOwner(() => "user-1");
  await melodyTrackDatabase.table("offlineCommands").clear();
});

afterEach(async () => {
  configureOfflineQueueOwner(() => null);
  vi.restoreAllMocks();
  await melodyTrackDatabase.table("offlineCommands").clear();
});

describe("createOrQueueOffline", () => {
  it("queues immediately without starting an HTTP request when the browser is offline", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    const create = vi.fn(() => Promise.resolve({ id: "server-id" }));

    const result = await createOrQueueOffline({
      input: { name: "Lesson", price: 1500 },
      replayKey: "replay-1",
      create,
      buildQueueItem: (input, replayKey) => ({
        kind: "services:create" as const,
        replayKey,
        payload: input,
      }),
    });

    expect(result.offline).toBe(true);
    expect(create).not.toHaveBeenCalled();
    expect(result.queuedItem).toMatchObject({ kind: "services:create", replayKey: "replay-1" });
  });
});
