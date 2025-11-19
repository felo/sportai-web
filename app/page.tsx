import { GeminiQueryForm } from "@/components/gemini-query-form";
import { SidebarProvider } from "@/components/SidebarContext";

export default function Home() {
  return (
    <SidebarProvider>
      <main className="h-screen flex flex-col">
        <GeminiQueryForm />
      </main>
    </SidebarProvider>
  );
}

