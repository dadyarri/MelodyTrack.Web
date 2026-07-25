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

export default defineConfig([
  ...fsd.configs.recommended,
  {
    files: ["./src/pages/**"],
    rules: {
      "fsd/excessive-slicing": "off",
    },
  },
  {
    files: ["./src/pages/portal-access/ui/PortalAccessPage.tsx"],
    rules: {
      "fsd/forbidden-imports": "off",
    },
  },
  ...legacySegmentlessFeatureSlices.map((slice) => ({
    files: [`./src/features/${slice}/**`],
    rules: {
      "fsd/no-segmentless-slices": "off",
    },
  })),
]);
