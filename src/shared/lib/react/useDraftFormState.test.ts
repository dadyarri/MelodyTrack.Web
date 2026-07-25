import "fake-indexeddb/auto";

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { melodyTrackDatabase } from "@/shared/database";
import { configureDraftOwner } from "@/shared/lib/storage";
import * as draftStorage from "@/shared/lib/storage/drafts";

import { useDraftFormState } from "./useDraftFormState";

const key = "draft:hook:test";
const isValues = (value: unknown): value is { name?: string } =>
  typeof value === "object" && value !== null && (!("name" in value) || typeof value.name === "string");

beforeEach(async () => {
  configureDraftOwner(() => "user-1");
  await melodyTrackDatabase.table("drafts").clear();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await melodyTrackDatabase.table("drafts").clear();
});

describe("useDraftFormState", () => {
  it("keeps the draft reader stable when a pending write completes", async () => {
    const { result } = renderHook(() => useDraftFormState(key, isValues));
    await waitFor(() => {
      expect(result.current.saveStatus).toBe("saved");
    });
    const initialReader = result.current.loadDraftValues;

    act(() => {
      result.current.saveDraftValues({ name: "Persisted" });
    });
    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe("saved");
        expect(result.current.hasSavedDraft).toBe(true);
      },
      { timeout: 1500 },
    );

    expect(result.current.loadDraftValues).toBe(initialReader);
    expect(result.current.loadDraftValues()).toEqual({ name: "Persisted" });
  });

  it("marks only hydrated data as restored and switches to saved after an edit", async () => {
    await draftStorage.saveDraftValues(key, "replay-1", { name: "Existing" });
    const { result } = renderHook(() => useDraftFormState(key, isValues));

    await waitFor(() => {
      expect(result.current.isDraftRestored).toBe(true);
    });

    act(() => {
      result.current.saveDraftValues({ name: "Edited" });
    });
    expect(result.current.isDraftRestored).toBe(false);
    expect(result.current.saveStatus).toBe("pending");

    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe("saved");
      },
      { timeout: 1500 },
    );
    expect(result.current.isDraftRestored).toBe(false);
  });

  it("serializes writes so an older write cannot overwrite a newer saved draft", async () => {
    const originalSaveDraftValues = draftStorage.saveDraftValues;
    let releaseFirstWrite: (() => void) | undefined;
    const firstWriteBlocked = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve;
    });
    const saveDraftSpy = vi.spyOn(draftStorage, "saveDraftValues").mockImplementationOnce(async (...args) => {
      await firstWriteBlocked;
      return originalSaveDraftValues(...args);
    });
    const { result } = renderHook(() => useDraftFormState(key, isValues));
    await waitFor(() => {
      expect(result.current.saveStatus).toBe("saved");
    });

    act(() => {
      result.current.saveDraftValues({ name: "First" });
    });
    await waitFor(() => {
      expect(saveDraftSpy).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.saveDraftValues({ name: "Second" });
    });
    releaseFirstWrite?.();
    await waitFor(
      () => {
        expect(saveDraftSpy).toHaveBeenCalledTimes(2);
        expect(result.current.saveStatus).toBe("saved");
      },
      { timeout: 1500 },
    );

    expect(result.current.loadDraftValues()).toEqual({ name: "Second" });
    expect((await draftStorage.loadDraft(key, isValues))?.values).toEqual({ name: "Second" });
  });
});
