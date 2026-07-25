import {
  enqueueOfflineCreate,
  type OfflineQueuedCreate,
  type OfflineQueuedCreateInput,
  type QueuedCreateFromInput,
  shouldQueueOfflineError,
} from "../model/offlineQueue";

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
  const queueCreate = async (): Promise<OfflineCreateResult<TInput, TResponse, TQueued>> => ({
    input,
    offline: true,
    response: null,
    queuedItem: await enqueueOfflineCreate(buildQueueItem(input, replayKey)),
  });

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueCreate();
  }

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

    return queueCreate();
  }
}

export function isQueuedClientCreate(
  queuedItem: OfflineQueuedCreate,
): queuedItem is Extract<OfflineQueuedCreate, { kind: "clients:create" }> {
  return queuedItem.kind === "clients:create";
}
