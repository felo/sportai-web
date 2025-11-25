import { AIChatForm } from "@/components/ai-chat-form";
import { SidebarProvider } from "@/components/SidebarContext";
import { MigrationPrompt } from "@/components/auth/MigrationPrompt";

export default function Home() {
  return (
    <SidebarProvider>
      <main className="h-screen flex flex-col">
        <AIChatForm />
        <MigrationPrompt />
      </main>
    </SidebarProvider>
  );
}

