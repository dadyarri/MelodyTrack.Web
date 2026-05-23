import { useMutation, useQuery } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import { useEffect, useState } from "react";
import { authApi, type CreateInviteInput } from "@/api/auth";
import { queryKeys } from "@/api/queryKeys";
import { usersApi } from "@/api/crm";
import { getApiErrorMessages } from "@/api/http";
import { hasAdminAccess } from "@/features/auth/access";
import { useAuth } from "@/features/auth/useAuth";
import { isShortcutTarget, matchesPlainKey } from "@/utils/shortcuts";

export function useUsersPageController() {
  const auth = useAuth();
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [form] = Form.useForm<CreateInviteInput>();
  const { message } = AntdApp.useApp();
  const canManageUsers = hasAdminAccess(auth.user);
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };
  const query = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => usersApi.list(),
  });
  const createInviteMutation = useMutation({
    mutationFn: (input: CreateInviteInput) => authApi.createInvite(input),
    onSuccess: (data) => {
      setInviteUrl(data.url);
      message.success("Приглашение создано");
    },
    onError: showErrors,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (!matchesPlainKey(event, "a") || !canManageUsers) {
        return;
      }

      event.preventDefault();
      setInviteOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canManageUsers]);

  return {
    canManageUsers,
    query,
    isInviteOpen,
    setInviteOpen,
    inviteUrl,
    form,
    createInviteMutation,
    closeInviteModal: () => {
      setInviteOpen(false);
      setInviteUrl("");
      form.resetFields();
    },
    copyInviteUrl: async () => {
      await navigator.clipboard.writeText(inviteUrl);
      message.success("Ссылка скопирована");
    },
    onInviteSubmit: (values: CreateInviteInput) => {
      createInviteMutation.mutate({
        ...values,
        email: values.email?.trim() || undefined,
      });
    },
  };
}
