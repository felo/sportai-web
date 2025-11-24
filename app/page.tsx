import { AIChatForm } from "@/components/ai-chat-form";
import { SidebarProvider } from "@/components/SidebarContext";

export default function Home() {
  return (
    <SidebarProvider>
      <main className="h-screen flex flex-col">
        <AIChatForm />
      </main>
    </SidebarProvider>
  );
}

