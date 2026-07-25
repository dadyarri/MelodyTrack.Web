import "fake-indexeddb/auto";

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { melodyTrackDatabase } from "@/shared/database";
import { configureDraftOwner } from "@/shared/lib/storage";

import { useDraftFormState } from "./useDraftFormState";

const key = "draft:hook:test";
const isValues = (value: unknown): value is { name?: string } =>
  typeof value === "object" && value !== null && (!("name" in value) || typeof value.name === "string");

beforeEach(async () => {
  configureDraftOwner(() => "user-1");
  await melodyTrackDatabase.table("drafts").clear();
});

afterEach(async () => {
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
});
