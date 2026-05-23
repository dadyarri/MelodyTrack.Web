import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import { useState } from "react";
import { getApiErrorMessages } from "@/api/http";

type ReferenceBookControllerOptions<TItem> = {
  successMessages: {
    create: string;
    delete: string;
  };
  createItem: (values: { name: string }) => Promise<unknown>;
  deleteItem: (id: string) => Promise<unknown>;
  listQueryKey: readonly unknown[];
  listQueryFn: () => Promise<TItem[]>;
  invalidateQueryKeys?: ReadonlyArray<readonly unknown[]>;
};

export function useReferenceBookPageController<TItem>({
  successMessages,
  createItem,
  deleteItem,
  listQueryKey,
  listQueryFn,
  invalidateQueryKeys = [],
}: ReferenceBookControllerOptions<TItem>) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };

  const query = useQuery({
    queryKey: listQueryKey,
    queryFn: listQueryFn,
  });

  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: async () => {
      message.success(successMessages.create);
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: async () => {
      message.success(successMessages.delete);
      await queryClient.invalidateQueries({ queryKey: listQueryKey });
      await Promise.all(invalidateQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    onError: showErrors,
  });

  return {
    isCreateOpen,
    setCreateOpen,
    query,
    createMutation,
    deleteMutation,
    modal,
    onCreate: (values: { name: string }) => {
      createMutation.mutate(values);
    },
    onDelete: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}
