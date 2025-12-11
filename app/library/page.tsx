import type { Metadata } from "next";
import { TasksPage } from "@/components/tasks/TasksPage";

export const metadata: Metadata = {
  title: "SportAI Library",
  description: "Manage video processing tasks",
};

export default function LibraryRoute() {
  return <TasksPage />;
}




