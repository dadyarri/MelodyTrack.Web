import { Select } from "antd";
import { DefaultOptionType } from "antd/es/select";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clientsApi, rolesApi, servicesApi, usersApi } from "../api/crm";

export function ClientSelect({
  value,
  onChange,
  extraOptions,
  }: {
  value?: string;
  onChange?: (value: string) => void;
  extraOptions?: DefaultOptionType[];
}) {
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["clients", "lookup", search], queryFn: () => clientsApi.lookup(search) });
  const selectedQuery = useQuery({
    queryKey: ["clients", "selected", value],
    queryFn: () => clientsApi.get(value!),
    enabled: Boolean(value),
  });
  const options = useMemo<DefaultOptionType[]>(
    () => {
      const selectedOption = selectedQuery.data
        ? [{
            value: selectedQuery.data.id,
            label: [selectedQuery.data.lastName, selectedQuery.data.firstName, selectedQuery.data.patronymic].filter(Boolean).join(" "),
          }]
        : [];
      const lookupOptions = query.data?.map((client) => ({ value: client.id, label: [client.lastName, client.firstName, client.patronymic].filter(Boolean).join(" ") })) ?? [];
      const mergedOptions = [...selectedOption, ...(extraOptions ?? []), ...lookupOptions];

      return mergedOptions.filter((option, index, items) =>
        items.findIndex((item) => item.value === option.value) === index,
      );
    },
    [extraOptions, query.data, selectedQuery.data],
  );

  return (
    <Select
      className="wide"
      showSearch={{
        filterOption: false,
        onSearch: setSearch,
      }}
      allowClear
      loading={query.isLoading || selectedQuery.isLoading}
      options={options}
      placeholder="Начните вводить ФИО"
      value={value}
      onChange={onChange}
    />
  );
}

export function ServiceSelect({ value, onChange, allowClear = true }: { value?: string; onChange?: (value: string) => void; allowClear?: boolean }) {
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["services", "lookup", search], queryFn: () => servicesApi.lookup(search) });
  const options = useMemo<DefaultOptionType[]>(
    () => query.data?.map((service) => ({ value: service.id, label: service.name })) ?? [],
    [query.data],
  );

  return <Select className="wide" showSearch allowClear={allowClear} filterOption={false} onSearch={setSearch} loading={query.isLoading} options={options} value={value} onChange={onChange} />;
}

export function UserSelect({ value, onChange, disabled = false }: { value?: string; onChange?: (value: string) => void; disabled?: boolean }) {
  const query = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const options = useMemo<DefaultOptionType[]>(
    () => query.data?.map((user) => ({ value: user.id, label: `${user.lastName} ${user.firstName}` })) ?? [],
    [query.data],
  );

  return <Select className="wide" allowClear disabled={disabled} loading={query.isLoading} options={options} value={value} onChange={onChange} />;
}

export function RoleSelect({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  const query = useQuery({ queryKey: ["roles", "lookup"], queryFn: rolesApi.lookup });
  const options = useMemo<DefaultOptionType[]>(
    () => query.data?.map((role) => ({ value: role.id, label: role.displayName })) ?? [],
    [query.data],
  );

  return <Select className="wide" loading={query.isLoading} options={options} value={value} onChange={onChange} />;
}
