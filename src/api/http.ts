import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { authStore } from "../features/auth/authStore";


const baseURL = import.meta.env.DEV
  ? "http://localhost:5230"
  : "https://mt.dadyarri.ru/api";
export const authExpiredEventName = "melodytrack:auth-expired";

export const http = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshRequest: Promise<string | null> | null = null;

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = authStore.getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const publicAuthUrls = ["/auth/login", "/auth/register", "/auth/invite", "/auth/2fa/verify"];
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
      authStore.clear();
      window.dispatchEvent(new Event(authExpiredEventName));
      return Promise.reject(new Error("Сессия истекла. Войдите снова."));
    }

    original.headers.Authorization = `Bearer ${token}`;
    return http(original);
  },
);

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
      const message = typeof item === "string" ? item : item.reason ?? item.message;
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
