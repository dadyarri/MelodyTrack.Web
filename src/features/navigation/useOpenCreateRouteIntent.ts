import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";

export type OpenCreateRouteIntent = {
  openCreate?: boolean;
  clientId?: string;
};

export function useOpenCreateRouteIntent() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeIntent = (location.state ?? null) as OpenCreateRouteIntent | null;

  return {
    hasOpenCreateIntent: Boolean(routeIntent?.openCreate),
    prefillClientId: routeIntent?.openCreate ? routeIntent.clientId : undefined,
    clearOpenCreateIntent: useCallback(() => {
      if (!location.state) {
        return;
      }

      void navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, location.state, navigate]),
  };
}
