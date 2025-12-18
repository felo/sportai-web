import type { Metadata } from "next";
import { PrivacyPage } from "@/components/legal/PrivacyPage";

export const metadata: Metadata = {
  title: "Privacy Policy | SportAI",
  description: "Privacy Policy for SportAI - How we handle your data and protect your privacy",
};

export default function PrivacyRoute() {
  return <PrivacyPage />;
}


