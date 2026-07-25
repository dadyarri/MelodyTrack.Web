import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";

import { AppRouter } from "@/app/router";
import { configureOfflineQueueOwner, discardLegacyOfflineQueue } from "@/entities/offline-queue";
import { AuthProvider, authStore } from "@/entities/session";
import { OfflineQueueSync } from "@/features/offline";
import { defaultQueryStaleTimeMs } from "@/shared/lib/refetch";
import { configureDraftOwner } from "@/shared/lib/storage";
import { ApiErrorNotifier } from "@/shared/ui";

configureOfflineQueueOwner(() => authStore.getUserId());
configureDraftOwner(() => authStore.getUserId());
if (typeof window !== "undefined") {
  discardLegacyOfflineQueue(window.localStorage);
}

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
        <AuthProvider>
          <OfflineQueueSync />
          <AppRouter />
        </AuthProvider>
      </AntdApp>
    </QueryClientProvider>
  );
}
