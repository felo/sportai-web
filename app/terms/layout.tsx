import { SidebarProvider } from "@/components/SidebarContext";

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}

