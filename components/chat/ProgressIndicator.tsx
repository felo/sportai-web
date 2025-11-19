import type { ProgressStage } from "@/types/chat";

interface ProgressIndicatorProps {
  progressStage: ProgressStage;
  uploadProgress: number;
  hasVideo: boolean;
}

export function ProgressIndicator({
  progressStage,
  uploadProgress,
  hasVideo,
}: ProgressIndicatorProps) {
  if (!hasVideo) return null;

  return (
    <div className="flex justify-start gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
        AI
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {progressStage === "uploading" &&
            `Uploading video... ${Math.round(uploadProgress)}%`}
          {progressStage === "analyzing" && "Analyzing video..."}
          {progressStage === "generating" && "Generating response..."}
        </div>
        {hasVideo && progressStage === "analyzing" && (
          <div className="mt-2 w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

