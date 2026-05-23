import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Tour } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { queryKeys } from "@/api/queryKeys";
import { onboardingApi, type OnboardingStateResponse } from "@/api/auth";
import { useAuth } from "@/features/auth/useAuth";
import { canAccessOnboardingStep, onboardingSteps } from "./tourSteps";

export function AppOnboarding() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const latestProgressRequestRef = useRef(0);
  const pendingStepIdRef = useRef<string | null>(null);
  const pendingPathRef = useRef<string | null>(null);

  const onboardingQuery = useQuery({
    queryKey: queryKeys.onboarding.state,
    queryFn: () => onboardingApi.getState(),
    enabled: auth.isAuthenticated,
  });
  const visibleSteps = useMemo(() => onboardingSteps.filter((step) => canAccessOnboardingStep(step, auth.user)), [auth.user]);

  const setState = (state: OnboardingStateResponse) => {
    queryClient.setQueryData(queryKeys.onboarding.state, state);
  };

  const setActiveStep = (currentStep: string, currentPath: string) => {
    setState({
      status: "active",
      currentStep,
      currentPath,
      shouldLaunch: true,
      updatedAtUtc: new Date().toISOString(),
      completedAtUtc: null,
    });
  };

  const progressMutation = useMutation({
    mutationFn: async (input: { currentStep: string; currentPath: string; requestId: number }) => {
      const state = await onboardingApi.updateProgress({
        currentStep: input.currentStep,
        currentPath: input.currentPath,
      });

      return { state, requestId: input.requestId };
    },
    onSuccess: ({ state, requestId }) => {
      if (requestId !== latestProgressRequestRef.current) {
        return;
      }

      pendingStepIdRef.current = null;
      pendingPathRef.current = null;
      setState(state);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => onboardingApi.complete(),
    onSuccess: (state) => {
      setState(state);
    },
  });

  const skipMutation = useMutation({
    mutationFn: () => onboardingApi.skip(),
    onSuccess: (state) => {
      setState(state);
    },
  });

  const currentState = onboardingQuery.data;
  const currentStepIndex = useMemo(() => {
    const stateStep = currentState?.currentStep;
    const index = visibleSteps.findIndex((step) => step.id === stateStep);
    return index >= 0 ? index : 0;
  }, [currentState?.currentStep, visibleSteps]);

  useEffect(() => {
    if (!currentState?.shouldLaunch) {
      pendingStepIdRef.current = null;
      pendingPathRef.current = null;
      return;
    }

    const targetStep = pendingStepIdRef.current
      ? visibleSteps.find((step) => step.id === pendingStepIdRef.current)
      : visibleSteps[currentStepIndex];

    if (!targetStep || location.pathname === targetStep.path) {
      if (pendingPathRef.current === location.pathname) {
        pendingPathRef.current = null;
      }

      return;
    }

    void navigate(targetStep.path);
  }, [currentState?.shouldLaunch, currentStepIndex, location.pathname, navigate, visibleSteps]);

  const steps = visibleSteps.map((step, index) => ({
    title: step.title,
    description: step.description,
    placement: step.placement,
    target: () => document.querySelector<HTMLElement>(`[data-onboarding-id="${step.targetId}"]`) ?? document.body,
    nextButtonProps: {
      children: index === visibleSteps.length - 1 ? "Завершить" : "Далее",
    },
    prevButtonProps: {
      children: "Назад",
    },
  }));

  const open = Boolean(currentState?.shouldLaunch);

  const handleChange = (nextIndex: number) => {
    const nextStep = visibleSteps.at(nextIndex);
    if (!nextStep || progressMutation.isPending) {
      return;
    }

    const requestId = latestProgressRequestRef.current + 1;
    latestProgressRequestRef.current = requestId;
    pendingStepIdRef.current = nextStep.id;
    pendingPathRef.current = nextStep.path !== location.pathname ? nextStep.path : null;
    setActiveStep(nextStep.id, nextStep.path);
    progressMutation.mutate({ currentStep: nextStep.id, currentPath: nextStep.path, requestId });
    if (location.pathname !== nextStep.path) {
      void navigate(nextStep.path);
    }
  };

  const handleClose = () => {
    if (!skipMutation.isPending) {
      skipMutation.mutate();
    }
  };

  return (
    <Tour
      open={open}
      current={currentStepIndex}
      steps={steps}
      onClose={handleClose}
      onChange={handleChange}
      mask
      disabledInteraction={false}
      indicatorsRender={(_current, _total) => <></>}
      actionsRender={(_, info) => {
        const isLastStep = info.current === info.total - 1;
        const isBusy = progressMutation.isPending || completeMutation.isPending || skipMutation.isPending;

        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 2,
              width: "100%",
            }}
          >
            <div>
              Шаг {info.current + 1} из {info.total}
            </div>

            <div>
              <Button onClick={handleClose} disabled={skipMutation.isPending}>
                Пропустить
              </Button>
            </div>

            <div style={{ justifySelf: "end", display: "flex", gap: 2 }}>
              {info.current > 0 ? (
                <Button
                  onClick={() => {
                    handleChange(info.current - 1);
                  }}
                  disabled={isBusy}
                >
                  Назад
                </Button>
              ) : null}
              <Button
                type="primary"
                onClick={() => {
                  if (isLastStep) {
                    completeMutation.mutate();
                    return;
                  }

                  handleChange(info.current + 1);
                }}
                disabled={isBusy}
              >
                {isLastStep ? "Завершить" : "Далее"}
              </Button>
            </div>
          </div>
        );
      }}
      onFinish={() => {
        completeMutation.mutate();
      }}
    />
  );
}
