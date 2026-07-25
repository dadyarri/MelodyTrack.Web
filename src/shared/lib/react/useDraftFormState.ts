import { useCallback, useEffect, useRef, useState } from "react";

import { clearDraft, loadDraft, saveDraftValues, withDraftHydration } from "../storage/drafts";
import { createReplayKey } from "../storage/replayKey";

export type DraftSaveStatus = "loading" | "saved" | "pending" | "failed";

export function useDraftFormState<TValues>(storageKey: string, validateValues: (value: unknown) => value is TValues) {
  const [draft, setDraft] = useState<Awaited<ReturnType<typeof loadDraft<TValues>>>>(null);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>("loading");
  const [isDraftRestored, setDraftRestored] = useState(false);
  const replayKeyRef = useRef(createReplayKey());
  const draftRef = useRef(draft);
  const isHydratingRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const pendingValuesRef = useRef<TValues | null>(null);
  const saveRevisionRef = useRef(0);
  const persistenceQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let isActive = true;
    void loadDraft(storageKey, validateValues)
      .then((loadedDraft) => {
        if (!isActive) {
          return;
        }
        if (saveRevisionRef.current === 0) {
          setDraft(loadedDraft);
          draftRef.current = loadedDraft;
          replayKeyRef.current = loadedDraft?.replayKey ?? createReplayKey();
          setDraftRestored(loadedDraft !== null);
          setSaveStatus("saved");
        }
      })
      .catch(() => {
        if (isActive && saveRevisionRef.current === 0) {
          setSaveStatus("failed");
        }
      });
    return () => {
      isActive = false;
    };
  }, [storageKey, validateValues]);

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      if (pendingValuesRef.current) {
        const pendingValues = pendingValuesRef.current;
        persistenceQueueRef.current = persistenceQueueRef.current
          .catch(() => undefined)
          .then(() => saveDraftValues(storageKey, replayKeyRef.current, pendingValues));
      }
    },
    [storageKey],
  );

  const loadDraftValues = useCallback(() => draftRef.current?.values, []);

  const withHydration = useCallback((action: () => void) => {
    withDraftHydration(isHydratingRef, action);
  }, []);

  const resetStoredDraft = useCallback(
    (action?: () => void) => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      pendingValuesRef.current = null;
      saveRevisionRef.current += 1;
      setDraft(null);
      draftRef.current = null;
      setDraftRestored(false);
      replayKeyRef.current = createReplayKey();
      setSaveStatus("saved");
      const resetRevision = saveRevisionRef.current;
      const clearOperation = persistenceQueueRef.current.catch(() => undefined).then(() => clearDraft(storageKey));
      persistenceQueueRef.current = clearOperation;
      void clearOperation.catch(() => {
        if (resetRevision === saveRevisionRef.current) {
          setSaveStatus("failed");
        }
      });
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

      pendingValuesRef.current = values;
      const saveRevision = saveRevisionRef.current + 1;
      saveRevisionRef.current = saveRevision;
      setDraftRestored(false);
      setSaveStatus("pending");
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        const pendingValues = pendingValuesRef.current;
        if (!pendingValues) {
          return;
        }
        const saveOperation = persistenceQueueRef.current
          .catch(() => undefined)
          .then(() => saveDraftValues(storageKey, replayKeyRef.current, pendingValues));
        persistenceQueueRef.current = saveOperation;
        void saveOperation
          .then((savedDraft) => {
            if (saveRevision !== saveRevisionRef.current) {
              return;
            }
            pendingValuesRef.current = null;
            setDraft(savedDraft);
            draftRef.current = savedDraft;
            setSaveStatus("saved");
          })
          .catch(() => {
            if (saveRevision === saveRevisionRef.current) {
              setSaveStatus("failed");
            }
          });
      }, 400);
    },
    [storageKey],
  );

  return {
    hasSavedDraft: draft !== null,
    isDraftRestored,
    isDraftReady: saveStatus !== "loading",
    saveStatus,
    replayKeyRef,
    isHydratingRef,
    loadDraftValues,
    withHydration,
    resetStoredDraft,
    saveDraftValues: saveCurrentDraftValues,
  };
}
