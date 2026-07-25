import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { authExpiredEventName, configureHttpSession, discardLegacyHttpCache, getApiErrorMessages, http } from "./index";

describe("shared HTTP transport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gets authentication from an injected session adapter", async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;
    configureHttpSession({
      clear: vi.fn(),
      getAccessToken: () => "access-token",
      getRefreshToken: () => "refresh-token",
      setTokens: vi.fn(),
    });

    await http.get("/test", {
      adapter: (config) => {
        capturedConfig = config;
        return Promise.resolve({
          config,
          data: null,
          headers: {},
          status: 200,
          statusText: "OK",
        });
      },
    });

    expect(capturedConfig?.headers.Authorization).toBe("Bearer access-token");
  });

  it("normalizes non-HTTP errors", () => {
    expect(getApiErrorMessages(new Error("Something failed"))).toEqual(["Something failed"]);
    expect(getApiErrorMessages("unknown")).toEqual(["Произошла неизвестная ошибка"]);
  });

  it("refreshes an expired access token and retries the original request once", async () => {
    let accessToken = "expired-access";
    let refreshToken = "refresh-1";
    const setTokens = vi.fn((nextAccessToken: string, nextRefreshToken: string) => {
      accessToken = nextAccessToken;
      refreshToken = nextRefreshToken;
    });
    configureHttpSession({
      clear: vi.fn(),
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      setTokens,
    });
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { accessToken: "fresh-access", refreshToken: "refresh-2" },
    });
    let attempt = 0;
    let retriedAuthorization: unknown;

    await http.get("/protected", {
      adapter: (config) => {
        attempt += 1;
        if (attempt === 1) {
          return Promise.reject(
            new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
              config,
              data: null,
              headers: {},
              status: 401,
              statusText: "Unauthorized",
            }),
          );
        }
        retriedAuthorization = config.headers.Authorization;
        return Promise.resolve({
          config,
          data: { ok: true },
          headers: {},
          status: 200,
          statusText: "OK",
        });
      },
    });

    expect(setTokens).toHaveBeenCalledWith("fresh-access", "refresh-2");
    expect(retriedAuthorization).toBe("Bearer fresh-access");
    expect(attempt).toBe(2);
  });

  it("clears and publishes expiry when refresh fails", async () => {
    const clear = vi.fn();
    configureHttpSession({
      clear,
      getAccessToken: () => "expired-access",
      getRefreshToken: () => "expired-refresh",
      setTokens: vi.fn(),
    });
    vi.spyOn(axios, "post").mockRejectedValue(new Error("refresh rejected"));
    const expiredListener = vi.fn();
    window.addEventListener(authExpiredEventName, expiredListener);

    await expect(
      http.get("/protected", {
        adapter: (config) =>
          Promise.reject(
            new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
              config,
              data: null,
              headers: {},
              status: 401,
              statusText: "Unauthorized",
            }),
          ),
      }),
    ).rejects.toThrow("Сессия истекла");

    expect(clear).toHaveBeenCalledOnce();
    expect(expiredListener).toHaveBeenCalledOnce();
    window.removeEventListener(authExpiredEventName, expiredListener);
  });

  it("removes only generic legacy response-cache entries", () => {
    localStorage.setItem("melodytrack:http-cache:get:/client-portal/auth/link/secret-token", "{}");
    localStorage.setItem("melodytrack.theme", "dark");

    discardLegacyHttpCache(localStorage);

    expect(localStorage.getItem("melodytrack:http-cache:get:/client-portal/auth/link/secret-token")).toBeNull();
    expect(localStorage.getItem("melodytrack.theme")).toBe("dark");
  });
});
