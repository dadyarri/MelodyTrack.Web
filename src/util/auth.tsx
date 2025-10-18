import * as React from "react";
import {type ReactNode} from "react";
import { AuthContext } from "../hooks/useAuth";

const key = 'tanstack.auth.user';

function getStoredUser() {
    return localStorage.getItem(key);
}

function setStoredUser(user: string | null) {
    if (user) {
        localStorage.setItem(key, user);
    } else {
        localStorage.removeItem(key);
    }
}

export function AuthProvider({children}: { children: ReactNode }) {
    const [user, setUser] = React.useState<string | null>(null);
    const isAuthenticated = !!user;

    const logout = React.useCallback(async () => {
        setUser(null);
        setStoredUser(null);
    }, [])

    const login = React.useCallback(async (email: string) => {
        setUser(email);
        setStoredUser(email);
    }, []);

    React.useEffect(() => {
        setUser(getStoredUser())
    }, [])

    return (
        <AuthContext.Provider value={{isAuthenticated, user, login, logout}}>
            {children}
        </AuthContext.Provider>
    )
}