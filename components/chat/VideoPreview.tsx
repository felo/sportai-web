"use client";

import * as Tooltip from "@radix-ui/react-tooltip";

interface VideoPreviewProps {
  videoFile: File;
  videoPreview: string | null;
  onRemove: () => void;
}

export function VideoPreview({
  videoFile,
  videoPreview,
  onRemove,
}: VideoPreviewProps) {
  const isImage = videoFile.type.startsWith("image/");
  
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md" role="region" aria-label="Video preview">
      {isImage ? (
        <img 
          src={videoPreview || undefined} 
          alt={videoFile.name}
          className="h-12 w-auto rounded object-cover" 
        />
      ) : (
        <video src={videoPreview || undefined} className="h-12 rounded" aria-label={`Preview of ${videoFile.name}`} />
      )}
      <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 truncate" aria-label={`File: ${videoFile.name}`}>
        {videoFile.name}
      </span>
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${videoFile.name}`}
              className="text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded p-1 transition-colors"
            >
              ✕
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md px-2 py-1 z-50 shadow-lg"
              sideOffset={5}
            >
              Remove file
              <Tooltip.Arrow className="fill-gray-900 dark:fill-gray-700" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  );
}

