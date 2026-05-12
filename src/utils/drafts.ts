export type FormDraft<TValues> = {
  replayKey: string;
  updatedAtUtc: string;
  values: TValues;
};

export function createReplayKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

export function saveDraft<TValues>(storageKey: string, draft: FormDraft<TValues>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(draft));
}

export function clearDraft(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}
