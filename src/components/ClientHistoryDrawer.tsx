import { Drawer } from "antd";
import type { Client, ClientHistory } from "../api/types";
import { QueryStateBlock } from "./QueryStateBlock";
import { ClientHistoryPanel } from "./ClientHistoryPanel";

type ClientHistoryDrawerProps = {
  client: Client | null;
  data?: ClientHistory;
  isLoading: boolean;
  isError: boolean;
  onClose: () => void;
  onCreateAppointment: (client: ClientHistory["client"]) => void;
  onCreatePayment: (client: ClientHistory["client"]) => void;
};

export function ClientHistoryDrawer({
  client,
  data,
  isLoading,
  isError,
  onClose,
  onCreateAppointment,
  onCreatePayment,
}: ClientHistoryDrawerProps) {
  return (
    <Drawer
      title={client ? `История клиента: ${formatClientName(client)}` : "История клиента"}
      width={720}
      open={Boolean(client)}
      onClose={onClose}
      destroyOnHidden
    >
      {data ? <ClientHistoryPanel data={data} onCreateAppointment={onCreateAppointment} onCreatePayment={onCreatePayment} /> : null}
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

function formatClientName(client: Pick<Client, "firstName" | "lastName" | "patronymic">) {
  return [client.lastName, client.firstName, client.patronymic].filter(Boolean).join(" ");
}
