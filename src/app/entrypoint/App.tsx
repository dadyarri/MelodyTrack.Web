import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";

import { AppRouter } from "@/app/router";
import { AuthProvider } from "@/entities/session";
import { OfflineQueueSync } from "@/features/offline";
import { defaultQueryStaleTimeMs } from "@/shared/lib";
import { ApiErrorNotifier } from "@/shared/ui";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: defaultQueryStaleTimeMs,
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: false,
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
