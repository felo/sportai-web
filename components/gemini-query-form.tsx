"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function GeminiQueryForm() {
  const [prompt, setPrompt] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickleballCoachPrompt = () => {
    const pickleballPrompt = "Analyze this video. Act as a certified Pickleball coach. Watch this doubles match and provide a technical performance audit, identifying any areas of improvement and specific exercises or drills to correct them.\n\nFocus on one of the players and let me know you you've picked.";
    setPrompt(pickleballPrompt);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate video file type
      if (!file.type.startsWith("video/")) {
        setError("Please select a valid video file");
        return;
      }
      // Validate file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        setError("Video file size must be less than 20MB");
        return;
      }
      setVideoFile(file);
      setError(null);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      if (videoFile) {
        formData.append("video", videoFile);
      }

      const res = await fetch("/api/gemini", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get response");
      }

      const data = await res.json();
      setResponse(data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="prompt" className="block text-sm font-medium">
              Enter your query
            </label>
            <button
              type="button"
              onClick={handlePickleballCoachPrompt}
              className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              Use Pickleball Coach
            </button>
          </div>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Gemini 3 anything..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            rows={4}
            required
          />
        </div>
        <div>
          <label htmlFor="video" className="block text-sm font-medium mb-2">
            Upload video (optional)
          </label>
          <input
            id="video"
            type="file"
            accept="video/*"
            onChange={handleVideoChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
          />
          {videoPreview && (
            <div className="mt-4">
              <video
                src={videoPreview}
                controls
                className="w-full max-w-md rounded-md border border-gray-300 dark:border-gray-600"
              />
              <button
                type="button"
                onClick={() => {
                  setVideoFile(null);
                  setVideoPreview(null);
                  URL.revokeObjectURL(videoPreview);
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Remove video
              </button>
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Supported formats: MP4, MOV, AVI, etc. Max size: 20MB
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Querying..." : "Query Gemini"}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {response && (
        <Dialog.Root open={true} onOpenChange={() => setResponse(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
              <Dialog.Title className="text-xl font-semibold mb-4">
                Gemini Response
              </Dialog.Title>
              <Dialog.Description className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-gray-100" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="ml-4 mb-1" {...props} />
                    ),
                    code: ({ node, inline, ...props }: any) =>
                      inline ? (
                        <code
                          className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm font-mono"
                          {...props}
                        />
                      ) : (
                        <code
                          className="block p-4 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-mono overflow-x-auto mb-4"
                          {...props}
                        />
                      ),
                    pre: ({ node, ...props }) => (
                      <pre className="mb-4 overflow-x-auto" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-600 dark:text-gray-400"
                        {...props}
                      />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />
                    ),
                    em: ({ node, ...props }) => (
                      <em className="italic" {...props} />
                    ),
                    a: ({ node, ...props }) => (
                      <a
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props} />
                      </div>
                    ),
                    th: ({ node, ...props }) => (
                      <th
                        className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold text-left"
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        className="border border-gray-300 dark:border-gray-600 px-4 py-2"
                        {...props}
                      />
                    ),
                    hr: ({ node, ...props }) => (
                      <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />
                    ),
                  }}
                >
                  {response}
                </ReactMarkdown>
              </Dialog.Description>
              <Dialog.Close asChild>
                <button
                  className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  aria-label="Close"
                >
                  Close
                </button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}

