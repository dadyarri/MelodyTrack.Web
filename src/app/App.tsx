import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import { RouterProvider } from "react-router";
import { ApiErrorNotifier } from "../components/ApiErrorNotifier";
import { OfflineQueueSync } from "../components/OfflineQueueSync";
import { AuthProvider } from "../features/auth/AuthProvider";
import { router } from "./router";

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
          <RouterProvider router={router} />
        </AuthProvider>
      </AntdApp>
    </QueryClientProvider>
  );
}
