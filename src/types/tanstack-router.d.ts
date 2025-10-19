import type {AuthContext} from "../hooks/useAuth.ts";
import type {QueryClient} from "@tanstack/react-query";

export interface RouterContext {
    auth?: AuthContext | null;
    queryClient: QueryClient | null;
}