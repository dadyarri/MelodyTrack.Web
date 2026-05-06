const accessTokenKey = "melodytrack.accessToken";
const refreshTokenKey = "melodytrack.refreshToken";
const userKey = "melodytrack.user";

export interface StoredUser {
  firstName: string;
  lastName: string;
}

export const authStore = {
  getAccessToken() {
    return localStorage.getItem(accessTokenKey);
  },
  getRefreshToken() {
    return localStorage.getItem(refreshTokenKey);
  },
  getUser(): StoredUser | null {
    const raw = localStorage.getItem(userKey);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  },
  setSession(accessToken: string, refreshToken: string, user: StoredUser) {
    localStorage.setItem(accessTokenKey, accessToken);
    localStorage.setItem(refreshTokenKey, refreshToken);
    localStorage.setItem(userKey, JSON.stringify(user));
  },
  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(accessTokenKey, accessToken);
    localStorage.setItem(refreshTokenKey, refreshToken);
  },
  clear() {
    localStorage.removeItem(accessTokenKey);
    localStorage.removeItem(refreshTokenKey);
    localStorage.removeItem(userKey);
  },
};
