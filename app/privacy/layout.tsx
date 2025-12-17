import { SidebarProvider } from "@/components/SidebarContext";

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}

