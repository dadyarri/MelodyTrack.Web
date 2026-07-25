import { describe, expect, it } from "vitest";

import { discardLegacyHttpCache } from "./http";

describe("HTTP persistence cleanup", () => {
  it("removes only generic legacy response-cache entries", () => {
    localStorage.setItem("melodytrack:http-cache:get:/client-portal/auth/link/secret-token", "{}");
    localStorage.setItem("melodytrack.theme", "dark");

    discardLegacyHttpCache(localStorage);

    expect(localStorage.getItem("melodytrack:http-cache:get:/client-portal/auth/link/secret-token")).toBeNull();
    expect(localStorage.getItem("melodytrack.theme")).toBe("dark");
  });
});
