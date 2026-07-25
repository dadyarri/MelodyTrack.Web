import { beforeEach, describe, expect, it } from "vitest";

import { authStore } from "./authStore";

describe("authStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and clears a complete session", () => {
    authStore.setSession("access", "refresh");

    expect(authStore.getAccessToken()).toBe("access");
    expect(authStore.getRefreshToken()).toBe("refresh");
    expect(authStore.hasSession()).toBe(true);

    authStore.clear();

    expect(authStore.getAccessToken()).toBeNull();
    expect(authStore.getRefreshToken()).toBeNull();
    expect(authStore.hasSession()).toBe(false);
  });

  it("does not treat a partial token pair as a session", () => {
    localStorage.setItem("melodytrack.accessToken", "access");

    expect(authStore.hasSession()).toBe(false);
  });
});
