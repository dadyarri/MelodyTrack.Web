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
  codes: string[];
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
  codes: string[];
  allCodes: RecoveryCodeItem[];
}

export interface ForgotPasswordResponse {
  message: string;
}

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

export interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleDisplayName: string;
  isAdmin: boolean;
  isSuperuser: boolean;
  isTwoFactorEnabled: boolean;
  isTwoFactorRequired: boolean;
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
  email: string;
  role: string;
}

export interface CreateInviteResponse {
  url: string;
}

export const authApi = {
  getInviteInfo(inviteCode: string) {
    return http.get<InviteInfo>("/auth/invite", { params: { inviteCode } }).then((response) => response.data);
  },
  createInvite(input: CreateInviteInput) {
    return http.post<CreateInviteResponse>("/auth/invite", input).then((response) => response.data);
  },
  register(input: RegisterInput) {
    return http.post<RegisterResponse>("/auth/register", input).then((response) => response.data);
  },
  verify2Fa(input: Verify2FaInput) {
    return http.post<RecoveryCodesResponse>("/auth/2fa/verify", input).then((response) => response.data);
  },
  recover2Fa(input: Recover2FaInput) {
    return http.post<Recover2FaResponse>("/auth/2fa/recover", input).then((response) => response.data);
  },
  forgotPassword(email: string) {
    return http.post<ForgotPasswordResponse>("/auth/forgotPassword", { email }).then((response) => response.data);
  },
  resetPassword(input: ResetPasswordInput) {
    return http.post<void>("/auth/resetPassword", input).then((response) => response.data);
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
    return http.delete<void>("/auth/2fa/delete").then((response) => response.data);
  },
  getMe() {
    return http.get<MeResponse>("/auth/me").then((response) => response.data);
  },
  changePassword(input: ChangePasswordInput) {
    return http.post<void>("/auth/changePassword", input).then((response) => response.data);
  },
  getSessions() {
    return http.get<SessionsResponse>("/auth/sessions").then((response) => response.data);
  },
  revokeSession(id: string) {
    return http.delete<void>(`/auth/sessions/${id}`).then((response) => response.data);
  },
  logoutAll() {
    return http.post<void>("/auth/logoutAll").then((response) => response.data);
  },
};
