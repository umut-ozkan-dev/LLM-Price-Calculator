import type { Metadata } from "next";

import { ModelsCatalog } from "@/components/models-catalog";

export const metadata: Metadata = {
  title: "Models · LLM Prompt Price Calculator",
  description: "Public list prices used by the prompt cost calculator.",
};

export default function ModelsPage() {
  return <ModelsCatalog />;
}
