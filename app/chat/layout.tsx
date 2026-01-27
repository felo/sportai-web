import { SidebarProvider } from "@/components/SidebarContext";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}
