"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { TaskViewer } from "@/components/tasks/viewer/TaskViewer";
import { TechniqueViewer } from "@/components/tasks/techniqueViewer";
import { LoadingState } from "@/components/tasks/viewer/components/LoadingState";
import { useSidebarSettings } from "@/hooks/sidebar";

export default function TaskViewerPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { developerMode } = useSidebarSettings();
  const [taskType, setTaskType] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sport, setSport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch task to determine type
  useEffect(() => {
    async function fetchTaskType() {
      if (!user) return;
      
      try {
        const response = await fetch(`/api/tasks/${taskId}/status`, {
          headers: { Authorization: `Bearer ${user.id}` },
        });
        
        if (response.ok) {
          const { task } = await response.json();
          setTaskType(task.task_type);
          setVideoUrl(task.video_url);
          setSport(task.sport);
        }
      } catch (err) {
        console.error("Failed to fetch task:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchTaskType();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [taskId, user, authLoading]);

  // Loading state - show bouncing ball animation
  if (authLoading || loading) {
    return <LoadingState message="Loading video" />;
  }

  // Redirect if not authenticated
  if (!user) {
    router.push("/");
    return null;
  }

  // Technique task - show TechniqueViewer
  if (taskType === "technique" && videoUrl) {
    return (
      <TechniqueViewer 
        videoUrl={videoUrl} 
        sport={sport || undefined}
        taskId={taskId}
        developerMode={developerMode}
        onBack={() => router.push("/library")}
      />
    );
  }

  // Default: Statistics/Tactical task - show TaskViewer
  return <TaskViewer paramsPromise={params} />;
}


