import type { OfflineQueuedCreate, OfflineQueueRepository } from "./offlineQueue";

export type OfflineReplayStatus = "synced" | "pending" | "error";

export type OfflineReplayExecutionResult = {
  tempIdReplacement?: {
    temporaryId: string;
    serverId: string;
  };
};

export type OfflineReplayResult = {
  status: OfflineReplayStatus;
  syncedCount: number;
  remainingCount: number;
  failedItem: OfflineQueuedCreate | null;
  error: unknown;
};

export async function replayOfflineQueue({
  repository,
  execute,
  isRetryableError,
  now = () => new Date(),
}: {
  repository: OfflineQueueRepository;
  execute: (item: OfflineQueuedCreate, resolveId: (id: string) => Promise<string>) => Promise<OfflineReplayExecutionResult | undefined>;
  isRetryableError: (error: unknown) => boolean;
  now?: () => Date;
}): Promise<OfflineReplayResult> {
  let syncedCount = 0;

  for (const item of await repository.list()) {
    try {
      const result = await execute(item, repository.resolveId);
      await repository.complete(item.id, result?.tempIdReplacement);
      syncedCount += 1;
    } catch (error) {
      await repository.markAttemptFailed(item.id, getErrorMessage(error), now().toISOString());
      return {
        status: isRetryableError(error) ? "pending" : "error",
        syncedCount,
        remainingCount: (await repository.list()).length,
        failedItem: item,
        error,
      };
    }
  }

  const remainingCount = (await repository.list()).length;
  return {
    status: remainingCount === 0 ? "synced" : "pending",
    syncedCount,
    remainingCount,
    failedItem: null,
    error: null,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
