import { http } from "@/shared/api";

export interface OnboardingStateResponse {
  status: "active" | "completed" | "skipped";
  currentStep: string;
  currentPath: string;
  shouldLaunch: boolean;
  updatedAtUtc: string;
  completedAtUtc?: string | null;
}

export const onboardingApi = {
  getState() {
    return http.get<OnboardingStateResponse>("/onboarding/state").then((response) => response.data);
  },
  updateProgress(input: { currentStep: string; currentPath: string }) {
    return http.post<OnboardingStateResponse>("/onboarding/state/progress", input).then((response) => response.data);
  },
  complete() {
    return http.post<OnboardingStateResponse>("/onboarding/state/complete").then((response) => response.data);
  },
  skip() {
    return http.post<OnboardingStateResponse>("/onboarding/state/skip").then((response) => response.data);
  },
  reset() {
    return http.post<OnboardingStateResponse>("/onboarding/state/reset").then((response) => response.data);
  },
};
