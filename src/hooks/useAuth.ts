import * as React from "react";

export interface AuthContext {
    isAuthenticated: boolean;
    login: (email: string) => Promise<void>;
    logout: () => Promise<void>;
    user: string | null;
}

export function useAuth() {
    const context = React.useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export const AuthContext = React.createContext<AuthContext | null>(null);
