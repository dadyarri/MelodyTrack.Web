import { createContext } from "react";
import { StoredUser } from "./authStore";

interface LoginInput {
  email: string;
  password: string;
  otp?: string;
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  user: StoredUser | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
