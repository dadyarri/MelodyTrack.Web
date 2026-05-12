import { SummaryCard, SummaryGrid } from "./SummaryGrid";
import { formatMoney } from "../utils/money";

export function MoneyListSummaryCards({
  totalAmount,
  itemsCount,
  lastItemAtLabel,
  itemsTitle,
  lastItemTitle,
}: {
  totalAmount?: number | null;
  itemsCount?: number | null;
  lastItemAtLabel: string;
  itemsTitle: string;
  lastItemTitle: string;
}) {
  return (
    <SummaryGrid>
      <SummaryCard title="Сумма по выборке" value={formatMoney(totalAmount)} />
      <SummaryCard title={itemsTitle} value={itemsCount ?? 0} />
      <SummaryCard title={lastItemTitle} value={lastItemAtLabel} />
    </SummaryGrid>
  );
}
