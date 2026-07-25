import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

const legacySegmentlessFeatureSlices = [
  "audit",
  "auth",
  "clients",
  "courses",
  "dashboard",
  "drafts",
  "expenses",
  "navigation",
  "offline",
  "onboarding",
  "payments",
  "profile",
  "reference-books",
  "schedule",
  "services",
  "stats",
  "tasks",
  "users",
];

const intentionalRouteWidgets = ["course-workspace", "schedule-calendar"];

export default defineConfig([
  ...fsd.configs.recommended,
  {
    files: ["./src/pages/**"],
    rules: {
      "fsd/excessive-slicing": "off",
    },
  },
  ...legacySegmentlessFeatureSlices.map((slice) => ({
    files: [`./src/features/${slice}/**`],
    rules: {
      "fsd/no-segmentless-slices": "off",
    },
  })),
  ...intentionalRouteWidgets.map((slice) => ({
    files: [`./src/widgets/${slice}/**`],
    rules: {
      "fsd/insignificant-slice": "off",
    },
  })),
]);
