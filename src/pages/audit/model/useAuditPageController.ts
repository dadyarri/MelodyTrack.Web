import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { auditLogApi, auditLogQueryKeys } from "@/entities/audit-log";
import { hasSuperuserAccess, useAuth } from "@/entities/session";

export function useAuditPageController() {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const canViewAudit = hasSuperuserAccess(auth.user);
  const query = useQuery({
    queryKey: auditLogQueryKeys.list(page, search, timezone),
    queryFn: () => auditLogApi.list({ page, page_size: 20, search: search.trim() || undefined, timezone }),
    enabled: canViewAudit,
    placeholderData: keepPreviousData,
  });

  return {
    canViewAudit,
    page,
    query,
    setPage,
    handleSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
  };
}
