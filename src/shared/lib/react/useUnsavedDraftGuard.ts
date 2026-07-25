import { useCallback, useEffect } from "react";
import { useBeforeUnload, useBlocker } from "react-router";

import type { DraftSaveStatus } from "./useDraftFormState";

export function getDraftGuardState(isActive: boolean, saveStatus: DraftSaveStatus) {
  return {
    blockClientNavigation: isActive && saveStatus === "failed",
    warnBeforeUnload: isActive && (saveStatus === "pending" || saveStatus === "failed"),
  };
}

export function useUnsavedDraftGuard(isActive: boolean, saveStatus: DraftSaveStatus) {
  const guard = getDraftGuardState(isActive, saveStatus);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      guard.blockClientNavigation && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search),
  );

  useBeforeUnload(
    useCallback(
      (event) => {
        if (guard.warnBeforeUnload) {
          event.preventDefault();
        }
      },
      [guard.warnBeforeUnload],
    ),
  );

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }

    if (window.confirm("Черновик не удалось сохранить. Покинуть страницу и потерять последние изменения?")) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);
}
