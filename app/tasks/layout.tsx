import { SidebarProvider } from "@/components/SidebarContext";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}

