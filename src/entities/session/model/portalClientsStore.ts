export interface SavedPortalClient {
  token: string;
  firstName: string;
  lastName: string;
  lastUsedAtUtc: string;
}

const storageKey = "melodytrack.portalClients";
const maxSavedClients = 8;

export const portalClientsStore = {
  list() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return [] as SavedPortalClient[];
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [] as SavedPortalClient[];
      }

      return parsed.filter(isSavedPortalClient);
    } catch {
      return [] as SavedPortalClient[];
    }
  },
  save(client: Omit<SavedPortalClient, "lastUsedAtUtc">) {
    const nextClient: SavedPortalClient = {
      ...client,
      lastUsedAtUtc: new Date().toISOString(),
    };

    const current = this.list().filter((item) => item.token !== client.token);
    localStorage.setItem(storageKey, JSON.stringify([nextClient, ...current].slice(0, maxSavedClients)));
  },
  remove(token: string) {
    const next = this.list().filter((item) => item.token !== token);
    localStorage.setItem(storageKey, JSON.stringify(next));
  },
};

function isSavedPortalClient(value: unknown): value is SavedPortalClient {
  return Boolean(
    value &&
      typeof value === "object" &&
      "token" in value &&
      "firstName" in value &&
      "lastName" in value &&
      "lastUsedAtUtc" in value &&
      typeof value.token === "string" &&
      typeof value.firstName === "string" &&
      typeof value.lastName === "string" &&
      typeof value.lastUsedAtUtc === "string",
  );
}
