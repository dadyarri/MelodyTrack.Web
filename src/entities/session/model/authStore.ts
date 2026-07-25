const accessTokenKey = "melodytrack.accessToken";
const refreshTokenKey = "melodytrack.refreshToken";

export const authStore = {
  getAccessToken() {
    return localStorage.getItem(accessTokenKey);
  },
  getRefreshToken() {
    return localStorage.getItem(refreshTokenKey);
  },
  hasSession() {
    return Boolean(localStorage.getItem(accessTokenKey) && localStorage.getItem(refreshTokenKey));
  },
  setSession(accessToken: string, refreshToken: string) {
    localStorage.setItem(accessTokenKey, accessToken);
    localStorage.setItem(refreshTokenKey, refreshToken);
  },
  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(accessTokenKey, accessToken);
    localStorage.setItem(refreshTokenKey, refreshToken);
  },
  clear() {
    localStorage.removeItem(accessTokenKey);
    localStorage.removeItem(refreshTokenKey);
  },
};
