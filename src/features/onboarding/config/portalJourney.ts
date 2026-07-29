import type { OnboardingJourney } from "../model/types";

export const portalJourney = {
  id: "portal",
  steps: [
    {
      id: "portal-welcome",
      path: "/portal/schedule",
      targetId: "portal-header",
      placement: "bottom",
      title: "Ваши занятия всегда под рукой",
      description: "Здесь можно быстро проверить ближайшее занятие и текущий баланс.",
    },
    {
      id: "portal-schedule",
      path: "/portal/schedule",
      targetId: "portal-schedule-summary",
      placement: "top",
      title: "Ближайшее занятие",
      description: "Дата, время и статус следующего занятия будут показаны в этой карточке.",
    },
    {
      id: "portal-calendar",
      path: "/portal/schedule",
      targetId: "portal-calendar-subscription",
      placement: "top",
      title: "Добавьте занятия в календарь",
      description: "Подпишитесь один раз, и новые занятия будут появляться в вашем календаре автоматически.",
    },
  ],
} satisfies OnboardingJourney;
