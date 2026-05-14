import type { FormInstance } from "antd";
import { Form, Modal } from "antd";
import type { Client } from "../../api/types";
import { DraftModalFooter } from "../../components/DraftModalFooter";
import { DraftModalTitle } from "../../components/DraftModalTitle";
import { StatusBanner } from "../../components/StatusBanner";
import { formatRecordActivitySummary } from "../../utils/staleEntity";
import { ClientFormFields } from "./ClientFormFields";

export type ClientFormValues = Client & { telegram?: string | null; vk?: string | null; phone?: string | null };

export function ClientEditorModal({
  open,
  editing,
  draftRestored,
  form,
  savePending,
  isStale,
  staleActivity,
  phoneInputKey,
  onCancel,
  onClearDraft,
  onSubmit,
  onValuesChange,
}: {
  open: boolean;
  editing: boolean;
  draftRestored: boolean;
  form: FormInstance<ClientFormValues>;
  savePending: boolean;
  isStale: boolean;
  staleActivity?: Client["lastActivity"];
  phoneInputKey: number;
  onCancel: () => void;
  onClearDraft: () => void;
  onSubmit: (values: ClientFormValues) => void;
  onValuesChange: (_: Partial<ClientFormValues>, values: ClientFormValues) => void;
}) {
  return (
    <Modal
      open={open}
      title={editing ? "Редактировать клиента" : <DraftModalTitle title="Новый клиент" restored={draftRestored} />}
      onCancel={onCancel}
      onOk={() => {
        form.submit();
      }}
      confirmLoading={savePending}
      footer={
        editing
          ? undefined
          : (_, { CancelBtn, OkBtn }) => {
              return <DraftModalFooter onClearDraft={onClearDraft} CancelBtn={CancelBtn} OkBtn={OkBtn} />;
            }
      }
    >
      <Form form={form} layout="vertical" requiredMark={false} onFinish={onSubmit} onValuesChange={onValuesChange}>
        {editing && isStale ? (
          <StatusBanner
            type="warning"
            title="Карточка клиента изменилась в другом окне"
            description={formatRecordActivitySummary(staleActivity)}
          />
        ) : null}
        <ClientFormFields phoneInputKey={phoneInputKey} />
      </Form>
    </Modal>
  );
}
