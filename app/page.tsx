"use client";

import { SidebarProvider, useSidebar } from "@/components/SidebarContext";
import { PageHeader } from "@/components/ui";
import { Sidebar } from "@/components/sidebar";

function HomeContent() {
  const { isCollapsed, isInitialLoad } = useSidebar();

  return (
    <main className="h-screen flex flex-col">
      <PageHeader />
      <Sidebar />
      <div 
        className={`content-wrapper flex-1 ${!isCollapsed ? 'sidebar-expanded' : ''} ${isInitialLoad ? 'no-transition' : ''}`}
      >
        {/* Empty home page content */}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <SidebarProvider>
      <HomeContent />
    </SidebarProvider>
  );
}
