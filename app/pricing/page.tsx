import type { Metadata } from "next";
import { PricingPage } from "@/components/pricing/PricingPage";

export const metadata: Metadata = {
  title: "Pricing | SportAI",
  description: "Choose the right plan for your sports video analysis needs",
};

export default function PricingRoute() {
  return <PricingPage />;
}






