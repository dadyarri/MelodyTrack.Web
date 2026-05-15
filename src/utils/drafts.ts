export type FormDraft<TValues> = {
  replayKey: string;
  updatedAtUtc: string;
  values: TValues;
};

export type DraftHydrationRef = {
  current: boolean;
};

export function createReplayKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${String(Date.now())}-${Math.random().toString(16).slice(2)}`;
}

export function loadDraft<TValues>(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as FormDraft<TValues>;
  } catch {
    return null;
  }
}

export function hasDraft(storageKey: string) {
  return loadDraft(storageKey) !== null;
}

export function getDraftReplayKey(storageKey: string) {
  return loadDraft(storageKey)?.replayKey ?? createReplayKey();
}

export function saveDraft<TValues>(storageKey: string, draft: FormDraft<TValues>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(draft));
}

export function saveDraftValues(storageKey: string, replayKey: string, values: unknown) {
  saveDraft(storageKey, {
    replayKey,
    updatedAtUtc: new Date().toISOString(),
    values,
  });
}

export function clearDraft(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}

export function resetDraft(storageKey: string, replayKeyRef: { current: string }) {
  clearDraft(storageKey);
  replayKeyRef.current = createReplayKey();
}

export function withDraftHydration(ref: DraftHydrationRef, action: () => void) {
  ref.current = true;
  action();
  queueMicrotask(() => {
    ref.current = false;
  });
}
