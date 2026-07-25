const refreshTokenKey = "melodytrack.refreshToken";
const legacyAccessTokenKey = "melodytrack.accessToken";

let accessToken: string | null = null;
let currentUserId: string | null = null;
type SessionChange = {
  hasSession: boolean;
  source: "local" | "external";
};
const listeners = new Set<(change: SessionChange) => void>();

if (typeof window !== "undefined") {
  // Access tokens from older builds must not remain readable by injected scripts.
  window.localStorage.removeItem(legacyAccessTokenKey);
  window.addEventListener("storage", (event) => {
    if (event.key === refreshTokenKey || event.key === null) {
      accessToken = null;
      currentUserId = null;
      notifyListeners("external");
    }
  });
}

export const authStore = {
  getAccessToken() {
    return accessToken;
  },
  getRefreshToken() {
    return localStorage.getItem(refreshTokenKey);
  },
  getUserId() {
    return currentUserId;
  },
  hasSession() {
    return Boolean(localStorage.getItem(refreshTokenKey));
  },
  setSession(accessToken: string, refreshToken: string) {
    setAccessToken(accessToken);
    localStorage.setItem(refreshTokenKey, refreshToken);
    notifyListeners("local");
  },
  setTokens(accessToken: string, refreshToken: string) {
    setAccessToken(accessToken);
    localStorage.setItem(refreshTokenKey, refreshToken);
  },
  setUserId(userId: string) {
    currentUserId = userId;
  },
  clear() {
    accessToken = null;
    currentUserId = null;
    localStorage.removeItem(refreshTokenKey);
    localStorage.removeItem(legacyAccessTokenKey);
    notifyListeners("local");
  },
  subscribe(listener: (change: SessionChange) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

function setAccessToken(token: string) {
  accessToken = token;
}

function notifyListeners(source: SessionChange["source"]) {
  const change = { hasSession: authStore.hasSession(), source };
  for (const listener of listeners) {
    listener(change);
  }
}
