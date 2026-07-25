import { Table, type TableProps } from "antd";
import type { ReactNode } from "react";

import { ListQueryStatus, type ListQueryStatusProps } from "./ListQueryStatus";

type ListTableProps<RecordType extends object> = TableProps<RecordType> & {
  emptyText?: ReactNode;
  queryStatus?: ListQueryStatusProps;
  scrollY?: number;
};

export function ListTable<RecordType extends object>({
  emptyText = "Нет данных",
  queryStatus,
  scrollY = 520,
  locale,
  scroll,
  ...props
}: ListTableProps<RecordType>) {
  return (
    <Table<RecordType>
      {...props}
      title={
        queryStatus?.isError || queryStatus?.isFetching
          ? () => <ListQueryStatus {...queryStatus} isFetching={queryStatus.isFetching && !props.loading} />
          : props.title
      }
      scroll={scroll ?? { x: "max-content", y: scrollY }}
      locale={{
        ...locale,
        emptyText: locale?.emptyText ?? emptyText,
      }}
    />
  );
}
