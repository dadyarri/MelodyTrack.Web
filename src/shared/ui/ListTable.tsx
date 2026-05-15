import { Table, type TableProps } from "antd";
import type { ReactNode } from "react";

type ListTableProps<RecordType extends object> = TableProps<RecordType> & {
  emptyText?: ReactNode;
  scrollY?: number;
};

export function ListTable<RecordType extends object>({
  emptyText = "Нет данных",
  scrollY = 520,
  locale,
  scroll,
  ...props
}: ListTableProps<RecordType>) {
  return (
    <Table<RecordType>
      {...props}
      scroll={scroll ?? { x: "max-content", y: scrollY }}
      locale={{
        ...locale,
        emptyText: locale?.emptyText ?? emptyText,
      }}
    />
  );
}
