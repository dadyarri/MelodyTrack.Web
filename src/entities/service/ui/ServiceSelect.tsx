import { useQuery } from "@tanstack/react-query";
import { Select } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { useEffect, useMemo, useState } from "react";

import { formatMoney, getCachedReferenceLabel, rememberReferenceLabels } from "@/shared/lib";

import { serviceQueryKeys } from "../api/queryKeys";
import { servicesApi } from "../api/serviceApi";

function formatServiceLabel(name: string, price?: number, showPrice = false) {
  return showPrice && price !== undefined ? `${name} · ${formatMoney(price)}` : name;
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
  const query = useQuery({ queryKey: serviceQueryKeys.lookup(search), queryFn: () => servicesApi.lookup(), retry: false });
  const selectedQuery = useQuery({
    queryKey: serviceQueryKeys.selected(value),
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
      query.data?.map((service) => ({ value: service.id, label: formatServiceLabel(service.name, service.price, showPrice) })) ?? [];
    return [...selectedOption, ...lookupOptions].filter(
      (option, index, items) => items.findIndex((item) => item.value === option.value) === index,
    );
  }, [cachedLabel, query.data, selectedService, showPrice, value]);

  useEffect(() => {
    const service = selectedService ?? query.data?.find((item) => item.id === value);
    onResolvedLabelChange?.(service?.name ?? cachedLabel);
    onResolvedPriceChange?.(service?.price);
  }, [cachedLabel, onResolvedLabelChange, onResolvedPriceChange, query.data, selectedService, value]);

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
      showSearch={{ filterOption: false, onSearch: setSearch }}
      allowClear={allowClear}
      loading={query.isLoading || selectedQuery.isLoading}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}
