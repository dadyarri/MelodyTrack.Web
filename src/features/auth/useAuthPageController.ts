import { useMutation, useQuery } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import {
  authApi,
  type LoginInput,
  type Recover2FaInput,
  type Recover2FaResponse,
  type RecoveryCodeItem,
  type RecoveryCodesResponse,
  type RegisterInput,
} from "@/api/auth";
import { queryKeys } from "@/api/queryKeys";
import { getApiErrorMessage, getApiErrorMessages } from "@/api/http";
import { useAuth } from "@/features/auth/useAuth";

export type AuthMode = "login" | "register" | "recover2fa";
export type TotpSetup = {
  email: string;
  secret: string;
  otpUrl: string;
};
export type Recover2FaState = Recover2FaResponse & { email: string };
export type SecondFactorMode = "otp" | "recoveryCode";

export function useAuthPageController() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hasInviteCode = searchParams.has("inviteCode");
  const inviteCode = searchParams.get("inviteCode") ?? "";
  const [mode, setMode] = useState<AuthMode>("login");
  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<RecoveryCodeItem[] | null>(null);
  const [recoveryCodeUsername, setRecoveryCodeUsername] = useState<string>("user");
  const [recover2FaState, setRecover2FaState] = useState<Recover2FaState | null>(null);
  const [loginSecondFactorMode, setLoginSecondFactorMode] = useState<SecondFactorMode>("otp");
  const [isForgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [loginForm] = Form.useForm<LoginInput>();
  const [registerForm] = Form.useForm<RegisterInput>();
  const [forgotPasswordForm] = Form.useForm<{ email: string }>();
  const [recover2FaForm] = Form.useForm<Recover2FaInput>();
  const watchedInviteCode = Form.useWatch("inviteCode", registerForm);
  const registerInviteCode = (watchedInviteCode || inviteCode).trim();
  const { message } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };

  const inviteQuery = useQuery({
    queryKey: queryKeys.auth.invite(registerInviteCode),
    queryFn: () => authApi.getInviteInfo(registerInviteCode),
    enabled: hasInviteCode && Boolean(registerInviteCode),
    retry: false,
  });

  const inviteEmail = inviteQuery.data?.email ?? "";
  const inviteErrorMessage = inviteQuery.error ? getApiErrorMessage(inviteQuery.error) : null;
  const inviteLookupFinished = !inviteQuery.isPending;
  const canSubmitRegistration = Boolean(registerInviteCode) && !inviteQuery.isError && !inviteQuery.isPending;

  useEffect(() => {
    if (!registerInviteCode && !inviteEmail) {
      return;
    }

    registerForm.setFieldsValue({
      inviteCode: registerInviteCode,
      ...(inviteEmail ? { email: inviteEmail } : {}),
    });
  }, [inviteEmail, registerForm, registerInviteCode]);

  const loginMutation = useMutation({
    mutationFn: auth.login,
    onSuccess: () => navigate((location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/", { replace: true }),
    onError: showErrors,
  });

  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (data, input) => {
      if (data.totpRequired) {
        if (!data.secret || !data.otpUrl) {
          message.error("Пользователь создан, но сервер не вернул данные для настройки 2FA.");
          return;
        }

        setTotpSetup({
          email: inviteEmail || input.email,
          secret: data.secret,
          otpUrl: data.otpUrl,
        });
        setRecoveryCodeUsername(inviteEmail || input.email);
        setRecoveryCodes(null);
        message.success("Пользователь создан. Завершите настройку 2FA и сохраните коды восстановления.");
        return;
      }

      message.success("Пользователь создан. Теперь можно войти.");
      setMode("login");
      void navigate("/login", { replace: true });
    },
    onError: showErrors,
  });

  const verify2FaMutation = useMutation({
    mutationFn: ({ otp }: { otp: string }) => {
      if (!totpSetup) {
        throw new Error("Нет данных для настройки 2FA");
      }

      return authApi.verify2Fa({
        email: totpSetup.email,
        otp,
        otpSecret: totpSetup.secret,
      });
    },
    onSuccess: (data: RecoveryCodesResponse) => {
      message.success("2FA настроена. Сохраните коды восстановления.");
      setRecoveryCodes(data.allCodes);
      setTotpSetup(null);
      setMode("login");
    },
    onError: showErrors,
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: (data) => {
      message.success(data.message);
    },
    onError: showErrors,
  });

  const recover2FaMutation = useMutation({
    mutationFn: ({ email, recoveryCode }: { email: string; recoveryCode: string }) => authApi.recover2Fa({ email, recoveryCode }),
    onSuccess: (data, values) => {
      setRecover2FaState({ ...data, email: values.email });
      setRecoveryCodeUsername(values.email);
      message.success("Доступ восстановлен. Настройте новое приложение и сохраните новые коды восстановления.");
    },
    onError: showErrors,
  });

  return {
    auth,
    mode,
    setMode,
    totpSetup,
    recoveryCodes,
    recoveryCodeUsername,
    recover2FaState,
    loginSecondFactorMode,
    setLoginSecondFactorMode,
    isForgotPasswordOpen,
    setForgotPasswordOpen,
    loginForm,
    registerForm,
    forgotPasswordForm,
    recover2FaForm,
    inviteCode,
    hasInviteCode,
    inviteQuery,
    inviteEmail,
    inviteErrorMessage,
    inviteLookupFinished,
    canSubmitRegistration,
    loginMutation,
    registerMutation,
    verify2FaMutation,
    forgotPasswordMutation,
    recover2FaMutation,
    continueAfterRecovered2Fa: async () => {
      if (!recover2FaState) {
        return;
      }

      await auth.establishSession(recover2FaState.accessToken, recover2FaState.refreshToken);
      void navigate("/", { replace: true });
    },
    continueAfterRecoveryCodes: () => {
      setRecoveryCodes(null);
      void navigate("/login", { replace: true });
    },
    onRegisterSubmit: (values: RegisterInput) => {
      registerMutation.mutate(values);
    },
    onLoginSubmit: (values: LoginInput) => {
      loginMutation.mutate(values);
    },
    onVerify2FaSubmit: (values: { otp: string }) => {
      verify2FaMutation.mutate(values);
    },
    onForgotPasswordSubmit: (values: { email: string }) => {
      forgotPasswordMutation.mutate(values.email);
    },
    onRecover2FaSubmit: (values: Recover2FaInput) => {
      recover2FaMutation.mutate(values);
    },
    onLoginSecondFactorModeChange: (value: SecondFactorMode) => {
      setLoginSecondFactorMode(value);
      if (value === "otp") {
        loginForm.setFieldValue("recoveryCode", undefined);
        return;
      }

      loginForm.setFieldValue("otp", undefined);
    },
  };
}
