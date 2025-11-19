import { GeminiQueryForm } from "@/components/gemini-query-form";

export default function Home() {
  return (
    <main className="h-screen flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h1 className="text-xl font-semibold">SportAI Web</h1>
      </div>
      <GeminiQueryForm />
    </main>
  );
}

