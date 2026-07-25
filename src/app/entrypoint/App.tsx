import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";

import { AppRouter } from "@/app/router";
import { AuthProvider } from "@/entities/session";
import { OfflineQueueSync } from "@/features/offline";
import { ApiErrorNotifier } from "@/shared/ui";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <ApiErrorNotifier />
        <OfflineQueueSync />
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </AntdApp>
    </QueryClientProvider>
  );
}
