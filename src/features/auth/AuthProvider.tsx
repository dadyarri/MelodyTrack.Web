import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { authApi, MeResponse } from "../../api/auth";
import { authExpiredEventName, http } from "../../api/http";
import { authStore } from "./authStore";
import { AuthContext, AuthContextValue } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasSession, setHasSession] = useState(() => authStore.hasSession());

  const handleSessionExpired = useCallback(() => {
    setHasSession(false);
    void queryClient.cancelQueries({ queryKey: ["auth", "me"] });
    queryClient.removeQueries({ queryKey: ["auth", "me"] });
  }, [queryClient]);

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getMe,
    enabled: hasSession,
    retry: false,
  });

  useEffect(() => {
    window.addEventListener(authExpiredEventName, handleSessionExpired);
    return () => window.removeEventListener(authExpiredEventName, handleSessionExpired);
  }, [handleSessionExpired]);

  useEffect(() => {
    if (!hasSession || !meQuery.isError) {
      return;
    }

    authStore.clear();
    window.dispatchEvent(new Event(authExpiredEventName));
  }, [hasSession, meQuery.isError]);

  const loadMe = useCallback(async (accessToken: string, refreshToken: string) => {
    authStore.setSession(accessToken, refreshToken);
    setHasSession(true);
    await queryClient.fetchQuery<MeResponse>({
      queryKey: ["auth", "me"],
      queryFn: authApi.getMe,
      staleTime: 0,
    });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: hasSession && meQuery.isPending,
      isAuthenticated: meQuery.isSuccess,
      user: meQuery.data ?? null,
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
    [handleSessionExpired, hasSession, loadMe, meQuery.data, meQuery.isPending, meQuery.isSuccess],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
