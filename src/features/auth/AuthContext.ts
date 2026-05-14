import { createContext } from "react";
import type { MeResponse } from "../../api/auth";

interface LoginInput {
  email: string;
  password: string;
  otp?: string;
  recoveryCode?: string;
}

export interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: MeResponse | null;
  login: (input: LoginInput) => Promise<void>;
  establishSession: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
