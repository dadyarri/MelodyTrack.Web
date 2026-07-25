import { describe, expect, it, vi } from "vitest";

import { logoutSession } from "./logoutSession";

describe("logoutSession", () => {
  it("revokes the current refresh token and always clears local session state", async () => {
    const revoke = vi.fn().mockRejectedValue(new Error("backend unavailable"));
    const clear = vi.fn();

    await expect(
      logoutSession({
        getRefreshToken: () => "refresh-token",
        revoke,
        clear,
      }),
    ).rejects.toThrow("backend unavailable");

    expect(revoke).toHaveBeenCalledWith("refresh-token");
    expect(clear).toHaveBeenCalledOnce();
  });

  it("clears a local session without making an empty revocation request", async () => {
    const revoke = vi.fn();
    const clear = vi.fn();

    await logoutSession({
      getRefreshToken: () => null,
      revoke,
      clear,
    });

    expect(revoke).not.toHaveBeenCalled();
    expect(clear).toHaveBeenCalledOnce();
  });
});
