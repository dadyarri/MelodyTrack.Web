import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { queryKeys } from "@/api/queryKeys";
import { auditApi } from "@/api/crm";
import { hasSuperuserAccess } from "@/features/auth/access";
import { useAuth } from "@/features/auth/useAuth";

export function useAuditPageController() {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const canViewAudit = hasSuperuserAccess(auth.user);
  const query = useQuery({
    queryKey: queryKeys.audit.list(page, search),
    queryFn: () => auditApi.list({ page, page_size: 20, search: search.trim() || undefined }),
    enabled: canViewAudit,
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
