import { SidebarProvider } from "@/components/SidebarContext";

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}
