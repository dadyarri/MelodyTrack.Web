import type { FormInstance } from "antd";
import { Form, Modal } from "antd";
import type { DefaultOptionType } from "antd/es/select";

import type { Client } from "@/entities/client";
import { formatRecordActivitySummary } from "@/shared/lib";
import type { DraftSaveStatus } from "@/shared/lib/react";
import { DraftModalFooter, DraftModalTitle, StatusBanner } from "@/shared/ui";

import { ClientFormFields } from "./ClientFormFields";

export type ClientFormValues = Omit<Client, "vacations"> & {
  dateOfBirth?: string | null;
  telegram?: string | null;
  vk?: string | null;
  phone?: string | null;
};

export function ClientEditorModal({
  open,
  editing,
  draftRestored,
  draftSaveStatus,
  form,
  savePending,
  isStale,
  staleActivity,
  sourceOptions,
  onCancel,
  onClearDraft,
  onSubmit,
  onValuesChange,
  onCreateSource,
  onSourceLabelChange,
}: {
  open: boolean;
  editing: boolean;
  draftRestored: boolean;
  draftSaveStatus: DraftSaveStatus;
  form: FormInstance<ClientFormValues>;
  savePending: boolean;
  isStale: boolean;
  staleActivity?: Client["lastActivity"];
  sourceOptions: DefaultOptionType[];
  onCancel: () => void;
  onClearDraft: () => void;
  onSubmit: (values: ClientFormValues) => void;
  onValuesChange: (_: Partial<ClientFormValues>, values: ClientFormValues) => void;
  onCreateSource?: () => void;
  onSourceLabelChange: (label?: string) => void;
}) {
  return (
    <Modal
      open={open}
      title={
        editing ? "Редактировать клиента" : <DraftModalTitle title="Новый клиент" restored={draftRestored} saveStatus={draftSaveStatus} />
      }
      onCancel={onCancel}
      onOk={() => {
        form.submit();
      }}
      confirmLoading={savePending}
      footer={
        editing
          ? undefined
          : (_, { CancelBtn, OkBtn }) => {
              return <DraftModalFooter onClearDraft={onClearDraft} showClearDraft={draftRestored} CancelBtn={CancelBtn} OkBtn={OkBtn} />;
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
        <ClientFormFields sourceOptions={sourceOptions} onCreateSource={onCreateSource} onSourceLabelChange={onSourceLabelChange} />
      </Form>
    </Modal>
  );
}
