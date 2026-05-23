import {
  enqueueOfflineCreate,
  shouldQueueOfflineError,
  type OfflineQueuedCreate,
  type OfflineQueuedCreateInput,
  type QueuedCreateFromInput,
} from "@/utils/offlineQueue";

export type OfflineCreateResult<TInput, TResponse, TQueued extends OfflineQueuedCreateInput> =
  | {
      input: TInput;
      offline: false;
      response: TResponse;
      queuedItem: null;
    }
  | {
      input: TInput;
      offline: true;
      response: null;
      queuedItem: QueuedCreateFromInput<TQueued>;
    };

export async function createOrQueueOffline<TInput, TResponse, TQueued extends OfflineQueuedCreateInput>({
  input,
  replayKey,
  create,
  buildQueueItem,
}: {
  input: TInput;
  replayKey: string;
  create: (input: TInput) => Promise<TResponse>;
  buildQueueItem: (input: TInput, replayKey: string) => TQueued;
}): Promise<OfflineCreateResult<TInput, TResponse, TQueued>> {
  try {
    return {
      input,
      offline: false,
      response: await create(input),
      queuedItem: null,
    };
  } catch (error) {
    if (!shouldQueueOfflineError(error)) {
      throw error;
    }

    return {
      input,
      offline: true,
      response: null,
      queuedItem: enqueueOfflineCreate(buildQueueItem(input, replayKey)),
    };
  }
}

export function isQueuedClientCreate(
  queuedItem: OfflineQueuedCreate,
): queuedItem is Extract<OfflineQueuedCreate, { kind: "clients:create" }> {
  return queuedItem.kind === "clients:create";
}
