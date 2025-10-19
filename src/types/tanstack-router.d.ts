import type {AuthContext} from "../hooks/useAuth.ts";

export interface RouterContext {
    auth?: AuthContext | null;
}