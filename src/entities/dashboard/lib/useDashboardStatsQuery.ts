import { useQuery } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";

type DateRange = [Dayjs, Dayjs];
type StatsQueryContext = {
  timezone: string;
  dateRange: DateRange;
};

type DateRangeQueryOptions<TData> = {
  initialRange?: DateRange;
  getQueryKey: (context: StatsQueryContext) => readonly unknown[];
  queryFn: (context: StatsQueryContext) => Promise<TData>;
};

type DateRangeGroupByQueryOptions<TData, TGroupBy extends string> = {
  initialRange?: DateRange;
  initialGroupBy: TGroupBy;
  getQueryKey: (context: StatsQueryContext & { groupBy: TGroupBy }) => readonly unknown[];
  queryFn: (context: StatsQueryContext & { groupBy: TGroupBy }) => Promise<TData>;
};

type DateRangeWindowDaysQueryOptions<TData> = {
  initialRange?: DateRange;
  initialWindowDays: number;
  getQueryKey: (context: StatsQueryContext & { windowDays: number }) => readonly unknown[];
  queryFn: (context: StatsQueryContext & { windowDays: number }) => Promise<TData>;
};

function getDefaultMonthRange(): DateRange {
  return [dayjs().startOf("month"), dayjs().endOf("month")];
}

function useDateRangeState(initialRange: DateRange) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);

  return {
    timezone,
    dateRange,
    setDateRange,
    onDateRangeChange: (value: [Dayjs | null, Dayjs | null] | null) => {
      if (!value || value[0] === null || value[1] === null) {
        return;
      }

      setDateRange([value[0], value[1]]);
    },
  };
}

export function useDashboardDateRangeQuery<TData>({
  initialRange = getDefaultMonthRange(),
  getQueryKey,
  queryFn,
}: DateRangeQueryOptions<TData>) {
  const state = useDateRangeState(initialRange);
  const query = useQuery({
    queryKey: getQueryKey({ timezone: state.timezone, dateRange: state.dateRange }),
    queryFn: () => queryFn({ timezone: state.timezone, dateRange: state.dateRange }),
  });

  return {
    ...state,
    query,
  };
}

export function useDashboardDateRangeGroupByQuery<TData, TGroupBy extends string>({
  initialRange = getDefaultMonthRange(),
  initialGroupBy,
  getQueryKey,
  queryFn,
}: DateRangeGroupByQueryOptions<TData, TGroupBy>) {
  const state = useDateRangeState(initialRange);
  const [groupBy, setGroupBy] = useState<TGroupBy>(initialGroupBy);
  const query = useQuery({
    queryKey: getQueryKey({ timezone: state.timezone, dateRange: state.dateRange, groupBy }),
    queryFn: () => queryFn({ timezone: state.timezone, dateRange: state.dateRange, groupBy }),
  });

  return {
    ...state,
    groupBy,
    setGroupBy,
    query,
  };
}

export function useDashboardDateRangeWindowDaysQuery<TData>({
  initialRange = getDefaultMonthRange(),
  initialWindowDays,
  getQueryKey,
  queryFn,
}: DateRangeWindowDaysQueryOptions<TData>) {
  const state = useDateRangeState(initialRange);
  const [windowDays, setWindowDays] = useState(initialWindowDays);
  const query = useQuery({
    queryKey: getQueryKey({ timezone: state.timezone, dateRange: state.dateRange, windowDays }),
    queryFn: () => queryFn({ timezone: state.timezone, dateRange: state.dateRange, windowDays }),
  });

  return {
    ...state,
    windowDays,
    setWindowDays,
    query,
    onWindowDaysChange: (value: number | null) => {
      setWindowDays(typeof value === "number" ? value : initialWindowDays);
    },
  };
}
