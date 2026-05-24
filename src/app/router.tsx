import { createBrowserRouter, Navigate } from "react-router";
import { recoverableImport } from "./chunkLoadRecovery";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

import { AdminRoute } from "../layout/AdminRoute";
import { StatsRoute } from "../layout/StatsRoute";
import { SuperuserRoute } from "../layout/SuperuserRoute";

export const router = createBrowserRouter([
  {
    path: "/invite/:inviteCode",
    errorElement: <RouteErrorBoundary />,
    lazy: async () => {
      const { InviteRedirect } = await recoverableImport(() => import("@/pages/invite-redirect"));

      return {
        Component: InviteRedirect,
      };
    },
  },
  {
    path: "/login",
    errorElement: <RouteErrorBoundary />,
    lazy: async () => {
      const { AuthPage } = await recoverableImport(() => import("@/pages/auth"));

      return {
        Component: AuthPage,
      };
    },
  },
  {
    path: "/restore",
    errorElement: <RouteErrorBoundary />,
    lazy: async () => {
      const { RestorePasswordPage } = await recoverableImport(() => import("@/pages/restore-password"));

      return {
        Component: RestorePasswordPage,
      };
    },
  },
  {
    path: "/",
    errorElement: <RouteErrorBoundary />,
    lazy: async () => {
      const { ProtectedAppShell } = await recoverableImport(() => import("@/layout/ProtectedAppShell"));

      return {
        Component: ProtectedAppShell,
      };
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const { DashboardPage } = await recoverableImport(() => import("@/pages/dashboard"));

          return {
            Component: DashboardPage,
          };
        },
      },
      {
        path: "revenue",
        lazy: async () => {
          const { RevenuePage } = await recoverableImport(() => import("@/pages/revenue"));

          return {
            Component: () => (
              <StatsRoute>
                <RevenuePage />
              </StatsRoute>
            ),
          };
        },
      },
      {
        path: "price-changes",
        lazy: async () => {
          const { PriceChangesPage } = await recoverableImport(() => import("@/pages/price-changes"));

          return {
            Component: () => (
              <StatsRoute>
                <PriceChangesPage />
              </StatsRoute>
            ),
          };
        },
      },
      {
        path: "appointments-stats",
        lazy: async () => {
          const { AppointmentsStatsPage } = await recoverableImport(() => import("@/pages/appointments-stats"));

          return {
            Component: () => (
              <StatsRoute>
                <AppointmentsStatsPage />
              </StatsRoute>
            ),
          };
        },
      },
      {
        path: "clients-stats",
        lazy: async () => {
          const { ClientsStatsPage } = await recoverableImport(() => import("@/pages/clients-stats"));

          return {
            Component: () => (
              <StatsRoute>
                <ClientsStatsPage />
              </StatsRoute>
            ),
          };
        },
      },
      {
        path: "payments-stats",
        lazy: async () => {
          const { PaymentsStatsPage } = await recoverableImport(() => import("@/pages/payments-stats"));

          return {
            Component: () => (
              <StatsRoute>
                <PaymentsStatsPage />
              </StatsRoute>
            ),
          };
        },
      },
      {
        path: "expenses-dashboard",
        lazy: async () => {
          const { ExpensesStatsPage } = await recoverableImport(() => import("@/pages/expenses-stats"));

          return {
            Component: () => (
              <StatsRoute>
                <ExpensesStatsPage />
              </StatsRoute>
            ),
          };
        },
      },
      {
        path: "expenses-stats",
        element: <Navigate to="/expenses-dashboard" replace />,
      },
      {
        path: "clients",
        lazy: async () => {
          const { ClientsPage } = await recoverableImport(() => import("@/pages/clients"));

          return {
            Component: () => (
              <AdminRoute>
                <ClientsPage />
              </AdminRoute>
            ),
          };
        },
      },
      {
        path: "audit",
        lazy: async () => {
          const { AuditPage } = await recoverableImport(() => import("@/pages/audit"));

          return {
            Component: () => (
              <SuperuserRoute>
                <AuditPage />
              </SuperuserRoute>
            ),
          };
        },
      },
      {
        path: "services",
        lazy: async () => {
          const { ServicesPage } = await recoverableImport(() => import("@/pages/services"));

          return {
            Component: () => (
              <AdminRoute>
                <ServicesPage />
              </AdminRoute>
            ),
          };
        },
      },
      {
        path: "payments",
        lazy: async () => {
          const { PaymentsPage } = await recoverableImport(() => import("@/pages/payments"));

          return {
            Component: () => (
              <AdminRoute>
                <PaymentsPage />
              </AdminRoute>
            ),
          };
        },
      },
      {
        path: "expenses",
        lazy: async () => {
          const { ExpensesPage } = await recoverableImport(() => import("@/pages/expenses"));

          return {
            Component: () => (
              <AdminRoute>
                <ExpensesPage />
              </AdminRoute>
            ),
          };
        },
      },
      {
        path: "expense-categories",
        lazy: async () => {
          const { ExpenseCategoriesPage } = await recoverableImport(() => import("@/pages/expense-categories"));

          return {
            Component: () => (
              <AdminRoute>
                <ExpenseCategoriesPage />
              </AdminRoute>
            ),
          };
        },
      },
      {
        path: "client-sources",
        lazy: async () => {
          const { ClientSourcesPage } = await recoverableImport(() => import("@/pages/client-sources"));

          return {
            Component: () => (
              <AdminRoute>
                <ClientSourcesPage />
              </AdminRoute>
            ),
          };
        },
      },
      {
        path: "schedule",
        lazy: async () => {
          const { SchedulePage } = await recoverableImport(() => import("@/pages/schedule"));

          return {
            Component: SchedulePage,
          };
        },
      },
      {
        path: "users",
        lazy: async () => {
          const { UsersPage } = await recoverableImport(() => import("@/pages/users"));

          return {
            Component: () => (
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            ),
          };
        },
      },
      {
        path: "profile",
        lazy: async () => {
          const { ProfilePage } = await recoverableImport(() => import("@/pages/profile"));

          return {
            Component: ProfilePage,
          };
        },
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
