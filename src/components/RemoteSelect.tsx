import { useQuery } from "@tanstack/react-query";
import { Select } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { useEffect, useMemo, useState } from "react";
import { queryKeys } from "@/api/queryKeys";
import { clientQueryKeys, clientsApi } from "@/entities/client";
import { useAuth } from "@/features/auth/useAuth";
import { formatMoney } from "@/shared/lib";
import { clientSourcesApi, expenseCategoriesApi, rolesApi, servicesApi, usersApi } from "../api/crm";
import { getQueuedClientOption } from "../utils/offlineQueue";
import { getCachedReferenceLabel, rememberReferenceLabel, rememberReferenceLabels } from "../utils/referenceLabels";

function formatClientLabel(client: { firstName: string; lastName: string; patronymic?: string | null }) {
  return [client.lastName, client.firstName, client.patronymic].filter(Boolean).join(" ");
}

function formatServiceLabel(name: string, price?: number, showPrice = false) {
  if (!showPrice || price === undefined) {
    return name;
  }

  return `${name} · ${formatMoney(price)}`;
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
  const query = useQuery({ queryKey: clientQueryKeys.lookup(search), queryFn: () => clientsApi.lookup(search), retry: false });
  const pendingClientOption = getQueuedClientOption(value);
  const selectedQuery = useQuery({
    queryKey: clientQueryKeys.selected(value),
    queryFn: () => {
      if (!value) {
        throw new Error("Client id is missing.");
      }
      return clientsApi.get(value);
    },
    enabled: Boolean(value) && !pendingClientOption,
    retry: false,
  });
  const cachedLabel = getCachedReferenceLabel("client", value);
  const options = useMemo<DefaultOptionType[]>(() => {
    const selectedOption = pendingClientOption
      ? [pendingClientOption]
      : selectedQuery.data
        ? [
            {
              value: selectedQuery.data.id,
              label: formatClientLabel(selectedQuery.data),
            },
          ]
        : cachedLabel
          ? [{ value, label: cachedLabel }]
          : [];
    const lookupOptions = query.data?.map((client) => ({ value: client.id, label: formatClientLabel(client) })) ?? [];
    const mergedOptions = [...selectedOption, ...(extraOptions ?? []), ...lookupOptions];

    return mergedOptions.filter((option, index, items) => items.findIndex((item) => item.value === option.value) === index);
  }, [cachedLabel, extraOptions, pendingClientOption, query.data, selectedQuery.data, value]);

  useEffect(() => {
    const selectedLabel = pendingClientOption?.label ?? (selectedQuery.data ? formatClientLabel(selectedQuery.data) : cachedLabel);
    onResolvedLabelChange?.(typeof selectedLabel === "string" ? selectedLabel : undefined);
  }, [cachedLabel, onResolvedLabelChange, pendingClientOption?.label, selectedQuery.data]);

  useEffect(() => {
    if (query.data) {
      rememberReferenceLabels(
        "client",
        query.data.map((client) => ({ id: client.id, label: formatClientLabel(client) })),
      );
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
  showPrice = false,
  onResolvedLabelChange,
  onResolvedPriceChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
  allowClear?: boolean;
  showPrice?: boolean;
  onResolvedLabelChange?: (label?: string) => void;
  onResolvedPriceChange?: (price?: number) => void;
}) {
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: queryKeys.services.lookup(search), queryFn: () => servicesApi.lookup(search), retry: false });
  const selectedQuery = useQuery({
    queryKey: queryKeys.services.selected(value),
    queryFn: () => {
      if (!value) {
        throw new Error("Service id is missing.");
      }
      return servicesApi.get(value);
    },
    enabled: Boolean(value),
    retry: false,
  });
  const cachedLabel = getCachedReferenceLabel("service", value);
  const selectedService = selectedQuery.data?.id === value ? selectedQuery.data : undefined;

  const options = useMemo<DefaultOptionType[]>(() => {
    const selectedOption = selectedService
      ? [{ value: selectedService.id, label: formatServiceLabel(selectedService.name, selectedService.price, showPrice) }]
      : cachedLabel && value
        ? [{ value, label: cachedLabel }]
        : [];
    const lookupOptions =
      query.data?.map((service) => ({
        value: service.id,
        label: formatServiceLabel(service.name, service.price, showPrice),
      })) ?? [];
    const mergedOptions = [...selectedOption, ...lookupOptions];

    return mergedOptions.filter((option, index, items) => items.findIndex((item) => item.value === option.value) === index);
  }, [cachedLabel, query.data, selectedService, showPrice, value]);

  useEffect(() => {
    const service = selectedService ?? query.data?.find((item) => item.id === value);
    const label = service?.name ?? cachedLabel;
    onResolvedLabelChange?.(label);
  }, [cachedLabel, onResolvedLabelChange, query.data, selectedService, value]);

  useEffect(() => {
    const service = selectedService ?? query.data?.find((item) => item.id === value);
    onResolvedPriceChange?.(service?.price);
  }, [onResolvedPriceChange, query.data, selectedService, value]);

  useEffect(() => {
    if (query.data) {
      rememberReferenceLabels(
        "service",
        query.data.map((service) => ({ id: service.id, label: service.name })),
      );
    }
  }, [query.data]);

  return (
    <Select
      className="wide"
      showSearch={{
        filterOption: false,
        onSearch: setSearch,
      }}
      allowClear={allowClear}
      loading={query.isLoading || selectedQuery.isLoading}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
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
  const auth = useAuth();
  const query = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => usersApi.list(),
    enabled: !disabled,
    retry: false,
  });
  const cachedLabel = getCachedReferenceLabel("user", value);
  const currentUserLabel = auth.user && auth.user.id === value ? `${auth.user.lastName} ${auth.user.firstName}`.trim() : undefined;
  const options = useMemo<DefaultOptionType[]>(
    () =>
      query.data?.map((user) => ({ value: user.id, label: `${user.lastName} ${user.firstName}` })) ??
      ((currentUserLabel || cachedLabel) && value ? [{ value, label: currentUserLabel || cachedLabel }] : []),
    [cachedLabel, currentUserLabel, query.data, value],
  );

  useEffect(() => {
    const label = options.find((option) => option.value === value)?.label ?? currentUserLabel ?? cachedLabel;
    onResolvedLabelChange?.(typeof label === "string" ? label : undefined);
  }, [cachedLabel, currentUserLabel, onResolvedLabelChange, options, value]);

  useEffect(() => {
    if (query.data) {
      rememberReferenceLabels(
        "user",
        query.data.map((user) => ({ id: user.id, label: `${user.lastName} ${user.firstName}` })),
      );
    }
  }, [query.data]);

  useEffect(() => {
    if (auth.user && currentUserLabel) {
      rememberReferenceLabel("user", auth.user.id, currentUserLabel);
    }
  }, [auth.user, currentUserLabel]);

  return (
    <Select className="wide" allowClear disabled={disabled} loading={query.isLoading} options={options} value={value} onChange={onChange} />
  );
}

export function RoleSelect({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  const query = useQuery({ queryKey: queryKeys.users.roles, queryFn: () => rolesApi.lookup(), retry: false });
  const options = useMemo<DefaultOptionType[]>(
    () => query.data?.map((role) => ({ value: role.id, label: role.displayName })) ?? [],
    [query.data],
  );

  return <Select className="wide" loading={query.isLoading} options={options} value={value} onChange={onChange} />;
}

export function ExpenseCategorySelect({
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
  const query = useQuery({ queryKey: queryKeys.expenses.categories, queryFn: () => expenseCategoriesApi.list(), retry: false });
  const cachedLabel = getCachedReferenceLabel("expense-category", value);
  const options = useMemo<DefaultOptionType[]>(() => {
    const selectedOption = cachedLabel && value ? [{ value, label: cachedLabel }] : [];
    const lookupOptions = query.data?.map((item) => ({ value: item.id, label: item.name })) ?? [];
    const mergedOptions = [...selectedOption, ...(extraOptions ?? []), ...lookupOptions];
    return mergedOptions.filter((option, index, items) => items.findIndex((item) => item.value === option.value) === index);
  }, [cachedLabel, extraOptions, query.data, value]);

  useEffect(() => {
    const label = options.find((option) => option.value === value)?.label ?? cachedLabel;
    onResolvedLabelChange?.(typeof label === "string" ? label : undefined);
  }, [cachedLabel, onResolvedLabelChange, options, value]);

  useEffect(() => {
    if (query.data) {
      rememberReferenceLabels(
        "expense-category",
        query.data.map((item) => ({ id: item.id, label: item.name })),
      );
    }
  }, [query.data]);

  return <Select className="wide" allowClear loading={query.isLoading} options={options} value={value} onChange={onChange} />;
}

export function ClientSourceSelect({
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
  const query = useQuery({ queryKey: clientQueryKeys.sources, queryFn: () => clientSourcesApi.list(), retry: false });
  const cachedLabel = getCachedReferenceLabel("client-source", value);
  const options = useMemo<DefaultOptionType[]>(() => {
    const selectedOption = cachedLabel && value ? [{ value, label: cachedLabel }] : [];
    const lookupOptions = query.data?.map((item) => ({ value: item.id, label: item.name })) ?? [];
    const mergedOptions = [...selectedOption, ...(extraOptions ?? []), ...lookupOptions];
    return mergedOptions.filter((option, index, items) => items.findIndex((item) => item.value === option.value) === index);
  }, [cachedLabel, extraOptions, query.data, value]);

  useEffect(() => {
    const label = options.find((option) => option.value === value)?.label ?? cachedLabel;
    onResolvedLabelChange?.(typeof label === "string" ? label : undefined);
  }, [cachedLabel, onResolvedLabelChange, options, value]);

  useEffect(() => {
    if (query.data) {
      rememberReferenceLabels(
        "client-source",
        query.data.map((item) => ({ id: item.id, label: item.name })),
      );
    }
  }, [query.data]);

  return <Select className="wide" allowClear loading={query.isLoading} options={options} value={value} onChange={onChange} />;
}
