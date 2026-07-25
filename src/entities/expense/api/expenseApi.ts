import { type CreateEntityResponse, http, type PaginatedParams, type Ulid } from "@/shared/api";

import type { ExpenseInput, ExpensesResponse } from "../model/types";

export interface ExpenseListParams extends PaginatedParams {
  start?: string;
  end?: string;
  search?: string;
}

export const expensesApi = {
  list(params: ExpenseListParams) {
    return http.get<ExpensesResponse>("/expenses", { params }).then((response) => response.data);
  },
  export(params: ExpenseListParams) {
    return http.get<Blob>("/expenses/export", { params, responseType: "blob" }).then((response) => response.data);
  },
  create(input: ExpenseInput, options?: { replayKey?: string }) {
    return http.post<CreateEntityResponse>("/expenses", input, replayConfig(options?.replayKey)).then((response) => response.data);
  },
  update(id: Ulid, input: ExpenseInput, options?: { expectedActivityId?: Ulid }) {
    return http.put<unknown>(`/expenses/${id}`, { id, ...input, expectedActivityId: options?.expectedActivityId }).then(() => undefined);
  },
  remove(id: Ulid, options?: { expectedActivityId?: Ulid }) {
    return http
      .delete<unknown>(`/expenses/${id}`, {
        params: options?.expectedActivityId ? { expectedActivityId: options.expectedActivityId } : undefined,
      })
      .then(() => undefined);
  },
};

function replayConfig(replayKey?: string) {
  return replayKey ? { headers: { "Idempotency-Key": replayKey } } : undefined;
}
