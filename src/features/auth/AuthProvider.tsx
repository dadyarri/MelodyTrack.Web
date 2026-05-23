import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { queryKeys } from "@/api/queryKeys";
import { authApi, type MeResponse } from "../../api/auth";
import { authExpiredEventName, http } from "../../api/http";
import { AuthContext, type AuthContextValue } from "./AuthContext";
import { authStore } from "./authStore";

const cachedMeStorageKey = "melodytrack:auth:me";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasSession, setHasSession] = useState(() => authStore.hasSession());
  const [cachedUser, setCachedUser] = useState<MeResponse | null>(() => loadCachedUser());

  const handleSessionExpired = useCallback(() => {
    authStore.clear();
    setHasSession(false);
    setCachedUser(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(cachedMeStorageKey);
    }
    void queryClient.cancelQueries({ queryKey: queryKeys.auth.me });
    queryClient.removeQueries({ queryKey: queryKeys.auth.me });
  }, [queryClient]);

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => authApi.getMe(),
    enabled: hasSession,
    retry: false,
  });

  useEffect(() => {
    window.addEventListener(authExpiredEventName, handleSessionExpired);
    return () => {
      window.removeEventListener(authExpiredEventName, handleSessionExpired);
    };
  }, [handleSessionExpired]);

  useEffect(() => {
    if (!hasSession || !meQuery.isError) {
      return;
    }

    if (axios.isAxiosError(meQuery.error) && meQuery.error.response?.status === 401) {
      const timeoutId = window.setTimeout(() => {
        handleSessionExpired();
      }, 0);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [hasSession, handleSessionExpired, meQuery.error, meQuery.isError]);

  const loadMe = useCallback(
    async (accessToken: string, refreshToken: string) => {
      authStore.setSession(accessToken, refreshToken);
      setHasSession(true);
      const me = await queryClient.fetchQuery<MeResponse>({
        queryKey: queryKeys.auth.me,
        queryFn: () => authApi.getMe(),
        staleTime: 0,
      });
      setCachedUser(me);
      saveCachedUser(me);
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: hasSession && meQuery.isPending,
      isAuthenticated: hasSession && Boolean(meQuery.data ?? cachedUser),
      user: meQuery.data ?? cachedUser,
      async login(input) {
        const response = await http.post<{
          accessToken: string;
          refreshToken: string;
        }>("/auth/login", input);
        await loadMe(response.data.accessToken, response.data.refreshToken);
      },
      async establishSession(accessToken, refreshToken) {
        await loadMe(accessToken, refreshToken);
      },
      async logout() {
        const refreshToken = authStore.getRefreshToken();
        if (refreshToken) {
          await http.post("/auth/logout", { refreshToken }).catch(() => undefined);
        }
        authStore.clear();
        handleSessionExpired();
      },
    }),
    [cachedUser, handleSessionExpired, hasSession, loadMe, meQuery.data, meQuery.isPending],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function loadCachedUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(cachedMeStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as MeResponse;
  } catch {
    return null;
  }
}

function saveCachedUser(user: MeResponse) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(cachedMeStorageKey, JSON.stringify(user));
}
