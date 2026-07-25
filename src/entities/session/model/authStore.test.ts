import { beforeEach, describe, expect, it, vi } from "vitest";

import { authStore } from "./authStore";

describe("authStore", () => {
  beforeEach(() => {
    authStore.clear();
    localStorage.clear();
  });

  it("keeps the access token in memory and persists only the refresh token", () => {
    authStore.setSession("access", "refresh");

    expect(authStore.getAccessToken()).toBe("access");
    expect(authStore.getRefreshToken()).toBe("refresh");
    expect(authStore.hasSession()).toBe(true);
    expect(localStorage.getItem("melodytrack.accessToken")).toBeNull();

    authStore.clear();

    expect(authStore.getAccessToken()).toBeNull();
    expect(authStore.getRefreshToken()).toBeNull();
    expect(authStore.hasSession()).toBe(false);
  });

  it("removes a legacy persisted access token and does not treat it as a session", () => {
    localStorage.setItem("melodytrack.accessToken", "access");

    expect(authStore.hasSession()).toBe(false);
    authStore.clear();
    expect(localStorage.getItem("melodytrack.accessToken")).toBeNull();
  });

  it("observes refresh rotation and logout performed by another tab", () => {
    const listener = vi.fn();
    const unsubscribe = authStore.subscribe(listener);
    authStore.setSession("access", "refresh-1");
    listener.mockClear();

    localStorage.setItem("melodytrack.refreshToken", "refresh-2");
    window.dispatchEvent(new StorageEvent("storage", { key: "melodytrack.refreshToken", newValue: "refresh-2" }));

    expect(authStore.getAccessToken()).toBeNull();
    expect(authStore.getRefreshToken()).toBe("refresh-2");
    expect(listener).toHaveBeenLastCalledWith({ hasSession: true, source: "external" });

    localStorage.removeItem("melodytrack.refreshToken");
    window.dispatchEvent(new StorageEvent("storage", { key: "melodytrack.refreshToken", newValue: null }));

    expect(authStore.hasSession()).toBe(false);
    expect(listener).toHaveBeenLastCalledWith({ hasSession: false, source: "external" });
    unsubscribe();
  });
});
