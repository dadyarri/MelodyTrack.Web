export function getBackgroundRefetchInterval(isActive: boolean, intervalMs = 5000) {
  return isActive ? intervalMs : false;
}
