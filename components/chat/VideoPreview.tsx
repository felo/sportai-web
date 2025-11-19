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
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
      <video src={videoPreview || undefined} className="h-12 rounded" />
      <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 truncate">
        {videoFile.name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="text-red-600 hover:text-red-700 dark:text-red-400"
      >
        ✕
      </button>
    </div>
  );
}

