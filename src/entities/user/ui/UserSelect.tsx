import { useQuery } from "@tanstack/react-query";
import { Select } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { useEffect, useMemo } from "react";

import { getCachedReferenceLabel, rememberReferenceLabels } from "@/shared/lib";

import { userQueryKeys } from "../api/queryKeys";
import { rolesApi, usersApi } from "../api/userApi";

export function UserSelect({
  value,
  onChange,
  disabled = false,
  onResolvedLabelChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  onResolvedLabelChange?: (label?: string) => void;
}) {
  const query = useQuery({ queryKey: userQueryKeys.all, queryFn: () => usersApi.list(), retry: false });
  const cachedLabel = getCachedReferenceLabel("user", value);
  const options = useMemo<DefaultOptionType[]>(
    () =>
      query.data?.map((user) => ({ value: user.id, label: `${user.lastName} ${user.firstName}` })) ??
      (cachedLabel && value ? [{ value, label: cachedLabel }] : []),
    [cachedLabel, query.data, value],
  );

  useEffect(() => {
    const label = options.find((option) => option.value === value)?.label ?? cachedLabel;
    onResolvedLabelChange?.(typeof label === "string" ? label : undefined);
  }, [cachedLabel, onResolvedLabelChange, options, value]);

  useEffect(() => {
    if (query.data) {
      rememberReferenceLabels(
        "user",
        query.data.map((user) => ({ id: user.id, label: `${user.lastName} ${user.firstName}` })),
      );
    }
  }, [query.data]);

  return (
    <Select className="wide" allowClear disabled={disabled} loading={query.isLoading} options={options} value={value} onChange={onChange} />
  );
}

export function RoleSelect({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  const query = useQuery({ queryKey: userQueryKeys.roles, queryFn: () => rolesApi.lookup(), retry: false });
  const options = useMemo<DefaultOptionType[]>(
    () => query.data?.map((role) => ({ value: role.id, label: role.displayName })) ?? [],
    [query.data],
  );

  return <Select className="wide" loading={query.isLoading} options={options} value={value} onChange={onChange} />;
}
