"use client";

import { TaskViewer } from "@/components/tasks/viewer/TaskViewer";

export default function TaskViewerPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  return <TaskViewer paramsPromise={params} />;
}

