import { type CreateEntityResponse, http, type PaginatedResponse, type Ulid } from "@/shared/api";

import type {
  Client,
  ClientCalendarSubscription,
  ClientHistory,
  ClientWithBalance,
  CreateClientInput,
  GetClientHistoryParams,
  ListClientsParams,
  LookupClient,
  UpdateClientInput,
} from "../model/types";

export const clientsApi = {
  list(params: ListClientsParams) {
    return http.get<PaginatedResponse<Client>>("/clients", { params }).then((response) => response.data);
  },
  get(id: Ulid, params?: { expectedActivityId?: Ulid }) {
    return http.get<Client>(`/clients/${id}`, { params }).then((response) => response.data);
  },
  history(id: Ulid, params?: GetClientHistoryParams) {
    return http.get<ClientHistory>(`/clients/${id}/history`, { params }).then((response) => response.data);
  },
  lookup(search?: string) {
    return http
      .get<{ clients: LookupClient[] }>("/clients/lookup", {
        params: search ? { search } : undefined,
      })
      .then((response) => response.data.clients);
  },
  create(input: CreateClientInput, options?: { replayKey?: string }) {
    return http.post<CreateEntityResponse>("/clients", input, buildReplayConfig(options?.replayKey)).then((response) => response.data);
  },
  update(id: Ulid, input: UpdateClientInput, options?: { expectedActivityId?: Ulid }) {
    return http
      .put<unknown>(`/clients/${id}`, {
        ...input,
        expectedActivityId: options?.expectedActivityId,
      })
      .then(() => undefined);
  },
  remove(id: Ulid, options?: { expectedActivityId?: Ulid }) {
    return http
      .delete<unknown>(`/clients/${id}`, {
        params: options?.expectedActivityId ? { expectedActivityId: options.expectedActivityId } : undefined,
      })
      .then(() => undefined);
  },
  setLeadClosed(id: Ulid, isClosed: boolean) {
    return http.patch<unknown>(`/clients/${id}/lead-status`, { isClosed }).then(() => undefined);
  },
  debtors() {
    return http.get<{ debtors: ClientWithBalance[] }>("/clients/inDebt").then((response) => response.data.debtors);
  },
  exportDebtors() {
    return http.get<Blob>("/clients/inDebt/export", { responseType: "blob" }).then((response) => response.data);
  },
  createPortalLink(id: Ulid) {
    return http.post<{ url: string }>(`/clients/${id}/portal-link`, {}).then((response) => response.data);
  },
  regenerateCalendarSubscription(id: Ulid) {
    return http.post<ClientCalendarSubscription>(`/calendar-subscriptions/clients/${id}/regenerate`, {}).then((response) => response.data);
  },
  resetPortalPin(id: Ulid) {
    return http.post<unknown>(`/clients/${id}/portal-pin/reset`, {}).then(() => undefined);
  },
};

function buildReplayConfig(replayKey?: string) {
  return replayKey
    ? {
        headers: {
          "Idempotency-Key": replayKey,
        },
      }
    : undefined;
}
