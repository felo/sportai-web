import type { Metadata } from "next";
import { TermsPage } from "@/components/legal/TermsPage";

export const metadata: Metadata = {
  title: "Terms of Service | SportAI",
  description: "Terms of Service for SportAI - AI-powered sports video analysis platform",
};

export default function TermsRoute() {
  return <TermsPage />;
}
