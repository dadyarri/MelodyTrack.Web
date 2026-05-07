import { Select } from "antd";
import { DefaultOptionType } from "antd/es/select";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clientsApi, servicesApi, usersApi } from "../api/crm";

export function ClientSelect({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["clients", "lookup", search], queryFn: () => clientsApi.lookup(search) });
  const options = useMemo<DefaultOptionType[]>(
    () => query.data?.map((client) => ({ value: client.id, label: [client.lastName, client.firstName, client.patronymic].filter(Boolean).join(" ") })) ?? [],
    [query.data],
  );

  return (
    <Select
      showSearch={{
        filterOption: false,
        onSearch: setSearch,
      }}
      allowClear
      loading={query.isLoading}
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

  return <Select showSearch allowClear={allowClear} filterOption={false} onSearch={setSearch} loading={query.isLoading} options={options} value={value} onChange={onChange} />;
}

export function UserSelect({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  const query = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const options = useMemo<DefaultOptionType[]>(
    () => query.data?.map((user) => ({ value: user.id, label: `${user.lastName} ${user.firstName}` })) ?? [],
    [query.data],
  );

  return <Select allowClear loading={query.isLoading} options={options} value={value} onChange={onChange} />;
}
