export async function logoutSession({
  getRefreshToken,
  revoke,
  clear,
}: {
  getRefreshToken: () => string | null;
  revoke: (refreshToken: string) => Promise<void>;
  clear: () => void;
}) {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await revoke(refreshToken);
    }
  } finally {
    clear();
  }
}
