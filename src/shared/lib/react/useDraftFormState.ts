import { useCallback, useEffect, useRef, useState } from "react";

import { clearDraft, loadDraft, saveDraftValues, withDraftHydration } from "../storage/drafts";
import { createReplayKey } from "../storage/replayKey";

export type DraftSaveStatus = "loading" | "saved" | "pending" | "failed";

export function useDraftFormState<TValues>(storageKey: string, validateValues: (value: unknown) => value is TValues) {
  const [draft, setDraft] = useState<Awaited<ReturnType<typeof loadDraft<TValues>>>>(null);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>("loading");
  const replayKeyRef = useRef(createReplayKey());
  const isHydratingRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const pendingValuesRef = useRef<TValues | null>(null);

  useEffect(() => {
    let isActive = true;
    void loadDraft(storageKey, validateValues)
      .then((loadedDraft) => {
        if (!isActive) {
          return;
        }
        setDraft(loadedDraft);
        replayKeyRef.current = loadedDraft?.replayKey ?? createReplayKey();
        setSaveStatus("saved");
      })
      .catch(() => {
        if (isActive) {
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
        void saveDraftValues(storageKey, replayKeyRef.current, pendingValuesRef.current);
      }
    },
    [storageKey],
  );

  const loadDraftValues = useCallback(() => draft?.values, [draft]);

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
      setDraft(null);
      replayKeyRef.current = createReplayKey();
      setSaveStatus("saved");
      void clearDraft(storageKey).catch(() => {
        setSaveStatus("failed");
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
        void saveDraftValues(storageKey, replayKeyRef.current, pendingValues)
          .then((savedDraft) => {
            pendingValuesRef.current = null;
            setDraft(savedDraft);
            setSaveStatus("saved");
          })
          .catch(() => {
            setSaveStatus("failed");
          });
      }, 400);
    },
    [storageKey],
  );

  return {
    hasSavedDraft: draft !== null,
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
