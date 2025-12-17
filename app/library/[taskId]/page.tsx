"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { TaskViewer } from "@/components/tasks/viewer/TaskViewer";
import { TechniqueViewer } from "@/components/tasks/techniqueViewer";
import { LoadingState } from "@/components/tasks/viewer/components/LoadingState";
import { useSidebarSettings } from "@/hooks/sidebar";
import { isSampleTask, getSampleTask } from "@/components/tasks/sampleTasks";
import { isGuestTask, getGuestTask } from "@/utils/storage";

export default function TaskViewerPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const router = useRouter();
  const { user, session, loading: authLoading } = useAuth();
  const { developerMode } = useSidebarSettings();
  const [taskType, setTaskType] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sport, setSport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch task to determine type
  useEffect(() => {
    // Handle sample tasks - may need to refresh S3 URLs
    if (isSampleTask(taskId)) {
      const sampleTask = getSampleTask(taskId);
      if (sampleTask) {
        setTaskType(sampleTask.task_type);
        setSport(sampleTask.sport);
        
        // If sample has an S3 key, fetch a fresh presigned URL
        if (sampleTask.video_s3_key) {
          fetch("/api/s3/download-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: sampleTask.video_s3_key,
              expiresIn: 7 * 24 * 3600, // 7 days
            }),
          })
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
              if (data?.downloadUrl) {
                setVideoUrl(data.downloadUrl);
              } else {
                // Fallback to original URL if refresh fails
                setVideoUrl(sampleTask.video_url);
              }
              setLoading(false);
            })
            .catch(() => {
              // Fallback to original URL on error
              setVideoUrl(sampleTask.video_url);
              setLoading(false);
            });
        } else {
          // No S3 key - use the URL directly (e.g., Cloudinary URLs)
          setVideoUrl(sampleTask.video_url);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
      return;
    }
    
    // Handle guest tasks - load from localStorage
    if (isGuestTask(taskId)) {
      const guestTask = getGuestTask(taskId);
      if (guestTask) {
        setTaskType(guestTask.task_type);
        setVideoUrl(guestTask.video_url);
        setSport(guestTask.sport);
      }
      setLoading(false);
      return;
    }
    
    async function fetchTaskType() {
      if (!user || !session?.access_token) return;
      
      try {
        const response = await fetch(`/api/tasks/${taskId}/status`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
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

    if (user && session?.access_token) {
      fetchTaskType();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [taskId, user, session?.access_token, authLoading]);

  // For sample and guest tasks, allow viewing without authentication
  const isSample = isSampleTask(taskId);
  const isGuest = isGuestTask(taskId);
  
  // Redirect if not authenticated (except for sample and guest tasks)
  useEffect(() => {
    if (!authLoading && !loading && !user && !isSample && !isGuest) {
      router.push("/");
    }
  }, [authLoading, loading, user, isSample, isGuest, router]);

  // Loading state - show bouncing ball animation
  if (authLoading || loading) {
    return <LoadingState message="Loading video" />;
  }

  // Redirect state - show loading while redirecting
  if (!user && !isSample && !isGuest) {
    return <LoadingState message="Redirecting..." />;
  }

  // Technique tasks use TechniqueViewer
  // Sample tasks without result data also use TechniqueViewer
  const sampleTask = isSample ? getSampleTask(taskId) : null;
  const sampleHasResult = sampleTask?.result_s3_key != null;
  
  if (taskType === "technique" && videoUrl) {
    return (
      <TechniqueViewer 
        videoUrl={videoUrl} 
        sport={sport || undefined}
        taskId={taskId}
        developerMode={developerMode}
        onBack={() => router.push("/library")}
        backLabel="Back to Library"
      />
    );
  }
  
  // Sample tasks without result data use TechniqueViewer
  if (isSample && !sampleHasResult && videoUrl) {
    return (
      <TechniqueViewer 
        videoUrl={videoUrl} 
        sport={sport || undefined}
        taskId={taskId}
        developerMode={developerMode}
        onBack={() => router.push("/library")}
        backLabel="Back to Library"
      />
    );
  }

  // Statistics/Tactical tasks (including samples with results) - show TaskViewer
  return <TaskViewer paramsPromise={params} />;
}


