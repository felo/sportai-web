import { useRef, useEffect } from "react";
import { VideoPreview } from "./VideoPreview";

interface ChatInputProps {
  prompt: string;
  videoFile: File | null;
  videoPreview: string | null;
  error: string | null;
  loading: boolean;
  onPromptChange: (value: string) => void;
  onVideoRemove: () => void;
  onVideoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onPickleballCoachClick: () => void;
}

export function ChatInput({
  prompt,
  videoFile,
  videoPreview,
  error,
  loading,
  onPromptChange,
  onVideoRemove,
  onVideoChange,
  onSubmit,
  onPickleballCoachClick,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Resize textarea when prompt changes (e.g., from Pickleball Coach button)
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onPromptChange(e.target.value);
    // Auto-resize textarea
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Handle paste and resize after paste content is inserted
    setTimeout(() => {
      const target = e.target as HTMLTextAreaElement;
      target.style.height = "auto";
      target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        {videoFile && videoPreview && (
          <VideoPreview
            videoFile={videoFile}
            videoPreview={videoPreview}
            onRemove={onVideoRemove}
          />
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handleTextareaChange}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything sports related"
              className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none overflow-y-auto"
              rows={1}
              style={{
                minHeight: "52px",
                maxHeight: "200px",
                height: "52px",
              }}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onPickleballCoachClick}
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1.5 whitespace-nowrap"
                title="Use Pickleball Coach prompt"
              >
                <span>🎾</span>
                <span>Coach</span>
              </button>
            </div>
          </div>

          <div
            className={`
                border-2 border-dashed rounded-lg p-3 transition-colors cursor-pointer flex items-center justify-center
                border-gray-300 dark:border-gray-600
              `}
            style={{ minHeight: "52px", minWidth: "52px" }}
          >
            <input
              id="video"
              type="file"
              accept="video/*"
              onChange={onVideoChange}
              className="hidden"
            />
            <label htmlFor="video" className="cursor-pointer flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </label>
          </div>
        </div>
      </form>
    </div>
  );
}

