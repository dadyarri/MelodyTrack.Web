import { http } from "./http";

export interface InviteInfo {
  email?: string | null;
}

export interface RegisterInput {
  inviteCode: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResponse {
  totpRequired: boolean;
  secret?: string | null;
  otpUrl?: string | null;
}

export interface Verify2FaInput {
  email: string;
  otp: string;
  otpSecret: string;
}

export interface Recover2FaInput {
  email: string;
  recoveryCode: string;
}

export interface RecoveryCodesResponse {
  allCodes: RecoveryCodeItem[];
}

export interface RecoveryCodeItem {
  code: string;
  wasUsed: boolean;
}

export interface Recover2FaResponse {
  accessToken: string;
  refreshToken: string;
  secret: string;
  otpUrl: string;
  allCodes: RecoveryCodeItem[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  firstName: string;
  lastName: string;
}

export interface ClientPortalLinkStatusResponse {
  firstName: string;
  hasPin: boolean;
}

export interface ClientPortalPinAuthInput {
  token: string;
  pin: string;
  pinConfirmation?: string;
}

export interface LoginChallengeResponse {
  requiresTwoFactor: boolean;
  canUseOtp: boolean;
  canUseRecoveryCode: boolean;
}

export type LoginAttemptResult = ({ kind: "success" } & LoginResponse) | ({ kind: "challenge" } & LoginChallengeResponse);

export interface LoginInput {
  email: string;
  password: string;
  otp?: string;
  recoveryCode?: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  otp?: string;
  recoveryCode?: string;
}

export interface Setup2FaInput {
  password: string;
}

export interface Setup2FaResponse {
  secret: string;
  otpUrl: string;
}

import type { RecordActivity } from "./types";

export interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleDisplayName: string;
  phone?: string | null;
  telegram?: string | null;
  vk?: string | null;
  lastActivity?: RecordActivity | null;
  isAdmin: boolean;
  isSuperuser: boolean;
  isClientPortal: boolean;
  linkedClientId?: string | null;
  balance?: number | null;
  isTwoFactorEnabled: boolean;
  isTwoFactorRequired: boolean;
}

export interface OnboardingStateResponse {
  status: "active" | "completed" | "skipped";
  currentStep: string;
  currentPath: string;
  shouldLaunch: boolean;
  updatedAtUtc: string;
  completedAtUtc?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface SessionDto {
  id: string;
  deviceInfo: string;
  isCurrent: boolean;
  lastSeenAtUtc: string;
}

export interface SessionsResponse {
  data: SessionDto[];
}

export interface CreateInviteInput {
  email?: string;
  role: string;
}

export interface CreateInviteResponse {
  url: string;
}

export interface CreatePasswordResetLinkResponse {
  url: string;
}

export const authApi = {
  getInviteInfo(inviteCode: string) {
    return http.get<InviteInfo>("/auth/invite", { params: { inviteCode } }).then((response) => response.data);
  },
  createInvite(input: CreateInviteInput) {
    return http.post<CreateInviteResponse>("/auth/invite", input).then((response) => response.data);
  },
  createPasswordResetLink(userId: string) {
    return http.post<CreatePasswordResetLinkResponse>(`/users/${userId}/password-reset-link`, {}).then((response) => response.data);
  },
  register(input: RegisterInput) {
    return http.post<RegisterResponse>("/auth/register", input).then((response) => response.data);
  },
  login(input: LoginInput) {
    return http
      .post<LoginResponse | LoginChallengeResponse>("/auth/login", input, {
        validateStatus: (status) => status === 200 || status === 202,
      })
      .then((response): LoginAttemptResult => {
        if (response.status === 202) {
          return {
            kind: "challenge",
            ...(response.data as LoginChallengeResponse),
          };
        }

        return {
          kind: "success",
          ...(response.data as LoginResponse),
        };
      });
  },
  getClientPortalLinkStatus(token: string) {
    return http.get<ClientPortalLinkStatusResponse>("/client-portal/auth/link", { params: { token } }).then((response) => response.data);
  },
  authenticateClientPortalLink(input: ClientPortalPinAuthInput) {
    return http.post<LoginResponse>("/client-portal/auth/link", input).then((response) => response.data);
  },
  verify2Fa(input: Verify2FaInput) {
    return http.post<RecoveryCodesResponse>("/auth/2fa/verify", input).then((response) => response.data);
  },
  recover2Fa(input: Recover2FaInput) {
    return http.post<Recover2FaResponse>("/auth/2fa/recover", input).then((response) => response.data);
  },
  resetPassword(input: ResetPasswordInput) {
    return http.post<unknown>("/auth/resetPassword", input).then(() => undefined);
  },
  setup2Fa(input: Setup2FaInput) {
    return http.post<Setup2FaResponse>("/auth/2fa/setup", input).then((response) => response.data);
  },
  getRecoveryCodes() {
    return http.get<RecoveryCodesResponse>("/auth/recoveryCodes").then((response) => response.data);
  },
  regenerateRecoveryCodes() {
    return http.post<RecoveryCodesResponse>("/auth/recoveryCodes").then((response) => response.data);
  },
  remove2Fa() {
    return http.delete<unknown>("/auth/2fa/delete").then(() => undefined);
  },
  getMe() {
    return http.get<MeResponse>("/auth/me").then((response) => response.data);
  },
  changePassword(input: ChangePasswordInput) {
    return http.post<unknown>("/auth/changePassword", input).then(() => undefined);
  },
  getSessions() {
    return http.get<SessionsResponse>("/auth/sessions").then((response) => response.data);
  },
  revokeSession(id: string) {
    return http.delete<unknown>(`/auth/sessions/${id}`).then(() => undefined);
  },
  logoutAll() {
    return http.post<unknown>("/auth/logoutAll").then(() => undefined);
  },
};

export const onboardingApi = {
  getState() {
    return http.get<OnboardingStateResponse>("/onboarding/state").then((response) => response.data);
  },
  updateProgress(input: { currentStep: string; currentPath: string }) {
    return http.post<OnboardingStateResponse>("/onboarding/state/progress", input).then((response) => response.data);
  },
  complete() {
    return http.post<OnboardingStateResponse>("/onboarding/state/complete").then((response) => response.data);
  },
  skip() {
    return http.post<OnboardingStateResponse>("/onboarding/state/skip").then((response) => response.data);
  },
  reset() {
    return http.post<OnboardingStateResponse>("/onboarding/state/reset").then((response) => response.data);
  },
};
