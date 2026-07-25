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
  execute: (item: OfflineQueuedCreate, resolveId: (id: string) => string) => Promise<OfflineReplayExecutionResult | undefined>;
  isRetryableError: (error: unknown) => boolean;
  now?: () => Date;
}): Promise<OfflineReplayResult> {
  let syncedCount = 0;

  for (const item of repository.list()) {
    try {
      const result = await execute(item, repository.resolveId);
      repository.complete(item.id, result?.tempIdReplacement);
      syncedCount += 1;
    } catch (error) {
      repository.markAttemptFailed(item.id, getErrorMessage(error), now().toISOString());
      return {
        status: isRetryableError(error) ? "pending" : "error",
        syncedCount,
        remainingCount: repository.list().length,
        failedItem: item,
        error,
      };
    }
  }

  return {
    status: repository.list().length === 0 ? "synced" : "pending",
    syncedCount,
    remainingCount: repository.list().length,
    failedItem: null,
    error: null,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
