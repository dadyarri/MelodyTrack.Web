import { Drawer } from "antd";
import type { Client, ClientHistory } from "@/api/types";
import { QueryStateBlock } from "@/shared/ui";
import { formatClientName } from "../lib/client";
import { ClientHistoryPanel } from "./ClientHistoryPanel";

type ClientHistoryDrawerProps = {
  client: Client | null;
  data?: ClientHistory;
  isLoading: boolean;
  isError: boolean;
  onClose: () => void;
  onCreateAppointment?: (client: ClientHistory["client"]) => void;
  onCreatePayment?: (client: ClientHistory["client"]) => void;
  onEventsPageChange?: (page: number) => void;
  onEditVacations?: (client: Client) => void;
};

export function ClientHistoryDrawer({
  client,
  data,
  isLoading,
  isError,
  onClose,
  onCreateAppointment,
  onCreatePayment,
  onEventsPageChange,
  onEditVacations,
}: ClientHistoryDrawerProps) {
  return (
    <Drawer
      title={client ? `История клиента: ${formatClientName(client)}` : "История клиента"}
      size="large"
      open={Boolean(client)}
      onClose={onClose}
      destroyOnHidden
    >
      {data ? (
        <ClientHistoryPanel
          data={data}
          onCreateAppointment={onCreateAppointment}
          onCreatePayment={onCreatePayment}
          onEventsPageChange={onEventsPageChange}
          onEditVacations={onEditVacations}
        />
      ) : null}
      <QueryStateBlock
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && !isError && !data}
        loadingText="Загрузка истории..."
        emptyText="История клиента пока недоступна"
        errorMessage="Не удалось загрузить историю клиента."
      />
    </Drawer>
  );
}
