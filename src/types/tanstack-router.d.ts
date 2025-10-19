import type {AuthContext} from "../hooks/useAuth.ts";
import type {QueryClient} from "@tanstack/react-query";
import type {NormalizeOAS, OASClient} from "fets";
import type api from "./api"


export interface RouterContext {
    auth?: AuthContext | null;
    queryClient: QueryClient | null;
    client: OASClient<NormalizeOAS<typeof api>>
}