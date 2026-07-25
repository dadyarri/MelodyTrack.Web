import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { apiBaseUrl } from "../config";

export type HttpSession = {
  clear: () => void;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
};

export type StaleEntityConflict<TActivity = unknown> = {
  entityType: string;
  entityId: string;
  message: string;
  currentActivity?: TActivity | null;
};

export const authExpiredEventName = "melodytrack:auth-expired";

export const http = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshRequest: Promise<string | null> | null = null;
let httpSession: HttpSession | null = null;
const legacyCacheStorageKeyPrefix = "melodytrack:http-cache:";

if (typeof window !== "undefined") {
  discardLegacyHttpCache(window.localStorage);
}

export function configureHttpSession(session: HttpSession) {
  httpSession = session;
}

export function isHttpRequestCanceled(error: unknown) {
  return axios.isCancel(error);
}

export function restoreAccessToken() {
  const accessToken = httpSession?.getAccessToken();
  if (accessToken) {
    return Promise.resolve(accessToken);
  }

  refreshRequest ??= refreshAccessToken().finally(() => {
    refreshRequest = null;
  });
  return refreshRequest;
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = httpSession?.getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return Promise.reject(new AxiosError("Сеть недоступна", AxiosError.ERR_NETWORK, config));
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const publicAuthUrls = [
      "/client-portal/auth/link",
      "/auth/login",
      "/auth/register",
      "/auth/invite",
      "/auth/2fa/verify",
      "/auth/2fa/recover",
      "/auth/resetPassword",
    ];
    const isPublicAuthRequest = Boolean(original?.url && publicAuthUrls.some((url) => original.url?.includes(url)));

    if (error.response?.status !== 401 || !original || original._retry || isPublicAuthRequest || original.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    original._retry = true;
    refreshRequest ??= refreshAccessToken().finally(() => {
      refreshRequest = null;
    });

    const token = await refreshRequest;
    if (!token) {
      httpSession?.clear();
      window.dispatchEvent(new Event(authExpiredEventName));
      return Promise.reject(new Error("Сессия истекла. Войдите снова."));
    }

    original.headers.Authorization = `Bearer ${token}`;
    return http(original);
  },
);

export function discardLegacyHttpCache(storage: Storage) {
  const keysToRemove: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(legacyCacheStorageKeyPrefix)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    storage.removeItem(key);
  }
}

export async function probeBackendReachable() {
  const accessToken = httpSession?.getAccessToken();
  if (!accessToken) {
    return false;
  }

  try {
    await axios.get(`${apiBaseUrl}/auth/me`, {
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
  const refreshToken = httpSession?.getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${apiBaseUrl}/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );
    httpSession?.setTokens(response.data.accessToken, response.data.refreshToken);
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
        if (typeof message === "string" && message) {
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

export function getStaleEntityConflict<TActivity = unknown>(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) {
    return null;
  }

  const data = error.response.data as Partial<StaleEntityConflict<TActivity>> | undefined;
  if (!data?.entityType || !data.entityId || !data.message) {
    return null;
  }

  return data as StaleEntityConflict<TActivity>;
}
