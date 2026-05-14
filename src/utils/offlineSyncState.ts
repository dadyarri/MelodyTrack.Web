export type OfflineSyncStatus = "synced" | "syncing" | "pending" | "error";

export const offlineSyncStateChangedEventName = "melodytrack:offline-sync-state-changed";

let currentStatus: OfflineSyncStatus = "synced";

export function getOfflineSyncStatus() {
  return currentStatus;
}

export function setOfflineSyncStatus(status: OfflineSyncStatus) {
  if (currentStatus === status || typeof window === "undefined") {
    return;
  }

  currentStatus = status;
  window.dispatchEvent(new Event(offlineSyncStateChangedEventName));
}
