import type { Metadata } from "next";
import { TasksPage } from "@/components/tasks/TasksPage";

export const metadata: Metadata = {
  title: "SportAI Tasks",
  description: "Manage video processing tasks",
};

export default function TasksRoute() {
  return <TasksPage />;
}

