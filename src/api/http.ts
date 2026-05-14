import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { authStore } from "../features/auth/authStore";
import type { StaleEntityConflict } from "./types";

const baseURL = import.meta.env.DEV ? "http://localhost:5000" : "https://mt.dadyarri.ru/api";
export const authExpiredEventName = "melodytrack:auth-expired";

export const http = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshRequest: Promise<string | null> | null = null;
const cacheStorageKeyPrefix = "melodytrack:http-cache:";

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = authStore.getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const method = (config.method ?? "get").toLowerCase();
    if (method === "get") {
      const cachedResponse = tryGetCachedResponse(config);
      if (cachedResponse) {
        config.adapter = async () => cachedResponse;
        return config;
      }
    } else {
      return Promise.reject(new AxiosError("Сеть недоступна", AxiosError.ERR_NETWORK, config));
    }
  }

  return config;
});

http.interceptors.response.use(
  (response) => {
    cacheSuccessfulGet(response);
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const publicAuthUrls = [
      "/auth/login",
      "/auth/register",
      "/auth/invite",
      "/auth/2fa/verify",
      "/auth/2fa/recover",
      "/auth/forgotPassword",
      "/auth/resetPassword",
      "/auth/2fa/enabled",
    ];
    const isPublicAuthRequest = Boolean(original?.url && publicAuthUrls.some((url) => original.url?.includes(url)));

    if (error.response?.status !== 401 || !original || original._retry || isPublicAuthRequest || original.url?.includes("/auth/refresh")) {
      const cachedResponse = tryGetCachedResponse(original);
      if (cachedResponse) {
        return Promise.resolve(cachedResponse);
      }

      return Promise.reject(error);
    }

    original._retry = true;
    refreshRequest ??= refreshAccessToken().finally(() => {
      refreshRequest = null;
    });

    const token = await refreshRequest;
    if (!token) {
      authStore.clear();
      window.dispatchEvent(new Event(authExpiredEventName));
      return Promise.reject(new Error("Сессия истекла. Войдите снова."));
    }

    original.headers.Authorization = `Bearer ${token}`;
    return http(original);
  },
);

function cacheSuccessfulGet(response: AxiosResponse) {
  if (
    (response.config.method ?? "get").toLowerCase() !== "get" ||
    response.config.responseType === "blob" ||
    response.config.responseType === "arraybuffer"
  ) {
    return;
  }

  try {
    const cacheKey = buildCacheKey(response.config);
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({ data: response.data, status: response.status, statusText: response.statusText, headers: response.headers }),
    );
  } catch {
    // Ignore cache failures.
  }
}

function tryGetCachedResponse(config?: InternalAxiosRequestConfig) {
  if (
    !config ||
    (config.method ?? "get").toLowerCase() !== "get" ||
    config.responseType === "blob" ||
    config.responseType === "arraybuffer"
  ) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(buildCacheKey(config));
    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as { data: unknown; status: number; statusText: string; headers: Record<string, string> };
    return {
      data: cached.data,
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers,
      config,
      request: undefined,
    } satisfies AxiosResponse;
  } catch {
    return null;
  }
}

function buildCacheKey(config: InternalAxiosRequestConfig) {
  const url = new URL(config.url ?? "", baseURL);
  const params = new URLSearchParams();
  const entries = Object.entries(config.params ?? {}).sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    params.append(key, String(value));
  }

  const query = params.toString();
  return `${cacheStorageKeyPrefix}${(config.method ?? "get").toLowerCase()}:${url.pathname}${query ? `?${query}` : ""}`;
}

export async function probeBackendReachable() {
  const accessToken = authStore.getAccessToken();
  if (!accessToken) {
    return false;
  }

  try {
    await axios.get(`${baseURL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 3000,
      validateStatus: () => true,
    });
    return true;
  } catch {
    return false;
  }
}

async function refreshAccessToken() {
  const refreshToken = authStore.getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${baseURL}/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );
    authStore.setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data.accessToken;
  } catch {
    return null;
  }
}

type ApiErrorData = {
  title?: string;
  detail?: string;
  message?: string;
  errors?: Array<string | { reason?: string; message?: string }> | Record<string, string[] | string>;
};

export function getApiErrorMessages(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? [error.message] : ["Произошла неизвестная ошибка"];
  }

  if (!error.response) {
    return ["Не удалось подключиться к серверу. Проверьте соединение или попробуйте позже."];
  }

  const data = error.response.data as ApiErrorData | string | undefined;
  if (typeof data === "string") {
    return [data];
  }

  const messages = new Set<string>();
  if (Array.isArray(data?.errors)) {
    for (const item of data.errors) {
      const message = typeof item === "string" ? item : (item.reason ?? item.message);
      if (message) {
        messages.add(message);
      }
    }
  } else if (data?.errors) {
    for (const value of Object.values(data.errors)) {
      const fieldMessages = Array.isArray(value) ? value : [value];
      for (const message of fieldMessages) {
        if (message) {
          messages.add(message);
        }
      }
    }
  }

  if (data?.detail) {
    messages.add(data.detail);
  }
  if (data?.message) {
    messages.add(data.message);
  }
  if (data?.title && messages.size === 0) {
    messages.add(data.title);
  }

  return messages.size > 0 ? [...messages] : [error.message];
}

export function getApiErrorMessage(error: unknown) {
  return getApiErrorMessages(error).join("\n");
}

export function getStaleEntityConflict(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) {
    return null;
  }

  const data = error.response.data as Partial<StaleEntityConflict> | undefined;
  if (!data?.entityType || !data?.entityId || !data?.message) {
    return null;
  }

  return data as StaleEntityConflict;
}
