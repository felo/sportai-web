import { AIChatForm } from "@/components/ai-chat-form";
import { MigrationPrompt } from "@/components/auth/MigrationPrompt";

export default function ChatPage() {
  return (
    <main className="h-screen flex flex-col">
      <AIChatForm />
      <MigrationPrompt />
    </main>
  );
}
