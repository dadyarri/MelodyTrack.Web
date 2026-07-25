import type { InternalAxiosRequestConfig } from "axios";
import { describe, expect, it, vi } from "vitest";
import { configureHttpSession, getApiErrorMessages, http } from "./index";

describe("shared HTTP transport", () => {
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
});
