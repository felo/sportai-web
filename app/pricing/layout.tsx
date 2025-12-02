import { SidebarProvider } from "@/components/SidebarContext";

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}

