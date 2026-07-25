import { useCallback, useRef } from "react";

import { getDraftReplayKey, hasDraft, loadDraft, resetDraft, saveDraftValues, withDraftHydration } from "@/shared/lib";

export function useDraftFormState<TValues>(storageKey: string) {
  const hasSavedDraft = hasDraft(storageKey);
  const replayKeyRef = useRef(getDraftReplayKey(storageKey));
  const isHydratingRef = useRef(false);
  const loadDraftValues = useCallback(() => {
    const draft = loadDraft<TValues>(storageKey);
    replayKeyRef.current = draft?.replayKey ?? getDraftReplayKey(storageKey);
    return draft?.values;
  }, [storageKey]);

  const withHydration = useCallback((action: () => void) => {
    withDraftHydration(isHydratingRef, action);
  }, []);

  const resetStoredDraft = useCallback(
    (action?: () => void) => {
      resetDraft(storageKey, replayKeyRef);
      if (action) {
        withDraftHydration(isHydratingRef, action);
      }
    },
    [storageKey],
  );

  const saveCurrentDraftValues = useCallback(
    (values: TValues) => {
      if (isHydratingRef.current) {
        return;
      }

      saveDraftValues(storageKey, replayKeyRef.current, values);
    },
    [storageKey],
  );

  return {
    hasSavedDraft,
    replayKeyRef,
    isHydratingRef,
    loadDraftValues,
    withHydration,
    resetStoredDraft,
    saveDraftValues: saveCurrentDraftValues,
  };
}
