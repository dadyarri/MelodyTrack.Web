import { ReactNode, useEffect, useMemo, useState } from "react";
import { authExpiredEventName, http } from "../../api/http";
import { authStore, StoredUser } from "./authStore";
import { AuthContext, AuthContextValue } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(() => authStore.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(authStore.getAccessToken()));

  useEffect(() => {
    function handleAuthExpired() {
      setUser(null);
      setIsAuthenticated(false);
    }

    window.addEventListener(authExpiredEventName, handleAuthExpired);
    return () => window.removeEventListener(authExpiredEventName, handleAuthExpired);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      user,
      async login(input) {
        const response = await http.post<{
          accessToken: string;
          refreshToken: string;
          firstName: string;
          lastName: string;
        }>("/auth/login", input);
        const nextUser = { firstName: response.data.firstName, lastName: response.data.lastName };
        authStore.setSession(response.data.accessToken, response.data.refreshToken, nextUser);
        setUser(nextUser);
        setIsAuthenticated(true);
      },
      async logout() {
        const refreshToken = authStore.getRefreshToken();
        if (refreshToken) {
          await http.post("/auth/logout", { refreshToken }).catch(() => undefined);
        }
        authStore.clear();
        setUser(null);
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
