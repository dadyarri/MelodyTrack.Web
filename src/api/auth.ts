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

export const authApi = {
  getInviteInfo(inviteCode: string) {
    return http.get<InviteInfo>("/auth/invite", { params: { inviteCode } }).then((response) => response.data);
  },
  register(input: RegisterInput) {
    return http.post<RegisterResponse>("/auth/register", input).then((response) => response.data);
  },
  verify2Fa(input: Verify2FaInput) {
    return http.post<void>("/auth/2fa/verify", input).then((response) => response.data);
  },
};
