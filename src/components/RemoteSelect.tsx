import { Select } from "antd";
import { DefaultOptionType } from "antd/es/select";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clientsApi, rolesApi, servicesApi, usersApi } from "../api/crm";
import { getQueuedClientOption } from "../utils/offlineQueue";
import { getCachedReferenceLabel, rememberReferenceLabel, rememberReferenceLabels } from "../utils/referenceLabels";

function formatClientLabel(client: { firstName: string; lastName: string; patronymic?: string | null }) {
  return [client.lastName, client.firstName, client.patronymic].filter(Boolean).join(" ");
}

export function ClientSelect({
  value,
  onChange,
  extraOptions,
  onResolvedLabelChange,
  }: {
  value?: string;
  onChange?: (value: string) => void;
  extraOptions?: DefaultOptionType[];
  onResolvedLabelChange?: (label?: string) => void;
}) {
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["clients", "lookup", search], queryFn: () => clientsApi.lookup(search), retry: false });
  const pendingClientOption = getQueuedClientOption(value);
  const selectedQuery = useQuery({
    queryKey: ["clients", "selected", value],
    queryFn: () => clientsApi.get(value!),
    enabled: Boolean(value) && !pendingClientOption,
    retry: false,
  });
  const cachedLabel = getCachedReferenceLabel("client", value);
  const options = useMemo<DefaultOptionType[]>(
    () => {
      const selectedOption = pendingClientOption ? [pendingClientOption] : (selectedQuery.data
        ? [{
            value: selectedQuery.data.id,
            label: formatClientLabel(selectedQuery.data),
          }]
        : cachedLabel
          ? [{ value, label: cachedLabel }]
          : []);
      const lookupOptions = query.data?.map((client) => ({ value: client.id, label: formatClientLabel(client) })) ?? [];
      const mergedOptions = [...selectedOption, ...(extraOptions ?? []), ...lookupOptions];

      return mergedOptions.filter((option, index, items) =>
        items.findIndex((item) => item.value === option.value) === index,
      );
    },
    [cachedLabel, extraOptions, pendingClientOption, query.data, selectedQuery.data, value],
  );

  useEffect(() => {
    const selectedLabel = pendingClientOption?.label ?? (selectedQuery.data
      ? formatClientLabel(selectedQuery.data)
      : cachedLabel);
    onResolvedLabelChange?.(typeof selectedLabel === "string" ? selectedLabel : undefined);
  }, [cachedLabel, onResolvedLabelChange, pendingClientOption?.label, selectedQuery.data]);

  useEffect(() => {
    if (query.data) {
      rememberReferenceLabels("client", query.data.map((client) => ({ id: client.id, label: formatClientLabel(client) })));
    }
  }, [query.data]);

  useEffect(() => {
    if (selectedQuery.data) {
      rememberReferenceLabel("client", selectedQuery.data.id, formatClientLabel(selectedQuery.data));
    }
  }, [selectedQuery.data]);

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

export function ServiceSelect({
  value,
  onChange,
  allowClear = true,
  onResolvedLabelChange,
  onResolvedPriceChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
  allowClear?: boolean;
  onResolvedLabelChange?: (label?: string) => void;
  onResolvedPriceChange?: (price?: number) => void;
}) {
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["services", "lookup", search], queryFn: () => servicesApi.lookup(search), retry: false });
  const selectedQuery = useQuery({
    queryKey: ["services", "selected", value],
    queryFn: () => servicesApi.get(value!),
    enabled: Boolean(value),
    retry: false,
  });
  const cachedLabel = getCachedReferenceLabel("service", value);
  const options = useMemo<DefaultOptionType[]>(
    () => {
      const selectedOption = selectedQuery.data
        ? [{ value: selectedQuery.data.id, label: selectedQuery.data.name }]
        : cachedLabel && value
          ? [{ value, label: cachedLabel }]
          : [];
      const lookupOptions = query.data?.map((service) => ({ value: service.id, label: service.name })) ?? [];
      const mergedOptions = [...selectedOption, ...lookupOptions];

      return mergedOptions.filter((option, index, items) =>
        items.findIndex((item) => item.value === option.value) === index,
      );
    },
    [cachedLabel, query.data, selectedQuery.data, value],
  );

  useEffect(() => {
    const label = options.find((option) => option.value === value)?.label ?? cachedLabel;
    onResolvedLabelChange?.(typeof label === "string" ? label : undefined);
  }, [cachedLabel, onResolvedLabelChange, options, value]);

  useEffect(() => {
    const service = selectedQuery.data ?? query.data?.find((item) => item.id === value);
    onResolvedPriceChange?.(service?.price);
  }, [onResolvedPriceChange, query.data, selectedQuery.data, value]);

  useEffect(() => {
    if (query.data) {
      rememberReferenceLabels("service", query.data.map((service) => ({ id: service.id, label: service.name })));
    }
  }, [query.data]);

  return <Select className="wide" showSearch allowClear={allowClear} filterOption={false} onSearch={setSearch} loading={query.isLoading || selectedQuery.isLoading} options={options} value={value} onChange={onChange} />;
}

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
  const query = useQuery({ queryKey: ["users"], queryFn: usersApi.list, retry: false });
  const cachedLabel = getCachedReferenceLabel("user", value);
  const options = useMemo<DefaultOptionType[]>(
    () => query.data?.map((user) => ({ value: user.id, label: `${user.lastName} ${user.firstName}` })) ?? (cachedLabel && value ? [{ value, label: cachedLabel }] : []),
    [cachedLabel, query.data, value],
  );

  useEffect(() => {
    const label = options.find((option) => option.value === value)?.label ?? cachedLabel;
    onResolvedLabelChange?.(typeof label === "string" ? label : undefined);
  }, [cachedLabel, onResolvedLabelChange, options, value]);

  useEffect(() => {
    if (query.data) {
      rememberReferenceLabels("user", query.data.map((user) => ({ id: user.id, label: `${user.lastName} ${user.firstName}` })));
    }
  }, [query.data]);

  return <Select className="wide" allowClear disabled={disabled} loading={query.isLoading} options={options} value={value} onChange={onChange} />;
}

export function RoleSelect({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  const query = useQuery({ queryKey: ["roles", "lookup"], queryFn: rolesApi.lookup, retry: false });
  const options = useMemo<DefaultOptionType[]>(
    () => query.data?.map((role) => ({ value: role.id, label: role.displayName })) ?? [],
    [query.data],
  );

  return <Select className="wide" loading={query.isLoading} options={options} value={value} onChange={onChange} />;
}
