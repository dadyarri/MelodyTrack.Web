const chunkRetryKey = "melodytrack:chunk-retry-path";

const recoverableChunkPatterns = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk \d+ failed/i,
  /loading css chunk \d+ failed/i,
  /dynamically imported module/i,
];

export function isRecoverableChunkLoadError(error: unknown) {
  const message = getErrorMessage(error);
  return recoverableChunkPatterns.some((pattern) => pattern.test(message));
}

export async function recoverableImport<T>(load: () => Promise<T>) {
  try {
    const module = await load();
    clearChunkRetryMarker();
    return module;
  } catch (error) {
    if (!isRecoverableChunkLoadError(error)) {
      clearChunkRetryMarker();
      throw error;
    }

    if (markChunkRetryAttempt()) {
      window.location.reload();
      return await new Promise<T>(() => {});
    }

    clearChunkRetryMarker();
    throw error;
  }
}

export function clearChunkRetryMarker() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(chunkRetryKey);
}

function markChunkRetryAttempt() {
  if (typeof window === "undefined") {
    return false;
  }

  const currentPath = window.location.pathname + window.location.search;
  const previousPath = window.sessionStorage.getItem(chunkRetryKey);

  if (previousPath === currentPath) {
    return false;
  }

  window.sessionStorage.setItem(chunkRetryKey, currentPath);
  return true;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
}
