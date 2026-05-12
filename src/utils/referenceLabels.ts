const referenceLabelStorageKeyPrefix = "melodytrack:reference-labels:";

export type ReferenceLabelKind = "client" | "service" | "user" | "role";

export function getCachedReferenceLabel(kind: ReferenceLabelKind, id?: string) {
  if (!id || typeof window === "undefined") {
    return undefined;
  }

  return loadLabelCache(kind)[id];
}

export function rememberReferenceLabel(kind: ReferenceLabelKind, id?: string, label?: string) {
  if (!id || !label || typeof window === "undefined") {
    return;
  }

  const cache = loadLabelCache(kind);
  if (cache[id] === label) {
    return;
  }

  cache[id] = label;
  window.localStorage.setItem(getLabelStorageKey(kind), JSON.stringify(cache));
}

export function rememberReferenceLabels(kind: ReferenceLabelKind, items: Array<{ id: string; label: string }>) {
  if (typeof window === "undefined" || items.length === 0) {
    return;
  }

  const cache = loadLabelCache(kind);
  let changed = false;

  for (const item of items) {
    if (!item.id || !item.label || cache[item.id] === item.label) {
      continue;
    }

    cache[item.id] = item.label;
    changed = true;
  }

  if (changed) {
    window.localStorage.setItem(getLabelStorageKey(kind), JSON.stringify(cache));
  }
}

function loadLabelCache(kind: ReferenceLabelKind) {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(getLabelStorageKey(kind));
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function getLabelStorageKey(kind: ReferenceLabelKind) {
  return `${referenceLabelStorageKeyPrefix}${kind}`;
}
