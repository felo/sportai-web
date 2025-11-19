"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ProgressStage = 
  | "idle"
  | "uploading"
  | "processing"
  | "analyzing"
  | "generating"
  | "complete";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  videoFile?: File | null;
  videoPreview?: string | null;
};

export function GeminiQueryForm() {
  const [prompt, setPrompt] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<ProgressStage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Resize textarea when prompt changes (e.g., from Pickleball Coach button)
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const handlePickleballCoachPrompt = () => {
    const pickleballPrompt = "Analyze this video. Act as a certified Pickleball coach. Please identify the players, the swings the bounces, and carefully watch this match and provide a technical performance audit, identifying any areas of improvement and specific exercises or drills to correct them.\n\nFocus on one of the players and let me know you you've picked.";
    setPrompt(pickleballPrompt);
  };

  const processVideoFile = (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Video file size must be less than 20MB");
      return;
    }
    setVideoFile(file);
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processVideoFile(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    // Only show drag state if dragging files (not text/elements)
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only show drag state if dragging files (not text/elements)
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    
    // Only hide when we've actually left the container (counter reaches 0)
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find((file) => file.type.startsWith("video/"));

    if (videoFile) {
      processVideoFile(videoFile);
    } else if (files.length > 0) {
      setError("Please drop a valid video file");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const currentPrompt = prompt;
    const currentVideoFile = videoFile;
    const currentVideoPreview = videoPreview;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: currentPrompt,
      videoFile: currentVideoFile,
      videoPreview: currentVideoPreview,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Clear input
    setPrompt("");
    setVideoFile(null);
    setVideoPreview(null);
    setError(null);
    setLoading(true);
    setUploadProgress(0);
    setProgressStage(currentVideoFile ? "uploading" : "processing");

    // Add placeholder assistant message
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const formData = new FormData();
      formData.append("prompt", currentPrompt);
      if (currentVideoFile) {
        formData.append("video", currentVideoFile);
      }

      if (!currentVideoFile) {
        // Streaming for text-only
        setProgressStage("generating");
        
        const response = await fetch("/api/gemini", {
          method: "POST",
          headers: {
            "x-stream": "true",
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to get response");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedText += chunk;
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: accumulatedText }
                  : msg
              )
            );
          }
        }
      } else {
        // Video upload with progress
        const res = await new Promise<Response>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
              setUploadProgress(percentComplete);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = {
                ok: true,
                status: xhr.status,
                statusText: xhr.statusText,
                json: async () => JSON.parse(xhr.responseText),
                text: async () => xhr.responseText,
              } as Response;
              resolve(response);
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error(errorData.error || `HTTP ${xhr.status}: ${xhr.statusText}`));
              } catch {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
              }
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Request aborted"));
          });

          xhr.open("POST", "/api/gemini");
          xhr.send(formData);
        });

        setProgressStage("processing");
        setUploadProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to get response");
        }

        setProgressStage("analyzing");
        const estimatedSeconds = Math.max(5, Math.min(30, (currentVideoFile.size / (1024 * 1024)) * 1.5));
        const analysisStartTime = Date.now();
        const progressInterval = setInterval(() => {
          const elapsed = (Date.now() - analysisStartTime) / 1000;
          if (elapsed < estimatedSeconds) {
            const fakeProgress = Math.min(95, 50 + (elapsed / estimatedSeconds) * 45);
            setUploadProgress(fakeProgress);
          }
        }, 200);
        
        const data = await res.json();
        clearInterval(progressInterval);
        
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: data.response }
              : msg
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== assistantMessageId)
      );
    } finally {
      setLoading(false);
      setProgressStage("idle");
      setUploadProgress(0);
    }
  };

  const markdownComponents = {
    h1: ({ node, ...props }: any) => (
      <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100" {...props} />
    ),
    h2: ({ node, ...props }: any) => (
      <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-gray-100" {...props} />
    ),
    h3: ({ node, ...props }: any) => (
      <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100" {...props} />
    ),
    p: ({ node, ...props }: any) => (
      <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed" {...props} />
    ),
    ul: ({ node, ...props }: any) => (
      <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />
    ),
    ol: ({ node, ...props }: any) => (
      <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />
    ),
    li: ({ node, ...props }: any) => (
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
    pre: ({ node, ...props }: any) => (
      <pre className="mb-4 overflow-x-auto" {...props} />
    ),
    blockquote: ({ node, ...props }: any) => (
      <blockquote
        className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-600 dark:text-gray-400"
        {...props}
      />
    ),
    strong: ({ node, ...props }: any) => (
      <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />
    ),
    em: ({ node, ...props }: any) => (
      <em className="italic" {...props} />
    ),
    a: ({ node, ...props }: any) => (
      <a
        className="text-blue-600 dark:text-blue-400 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    ),
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props} />
      </div>
    ),
    th: ({ node, ...props }: any) => (
      <th
        className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold text-left"
        {...props}
      />
    ),
    td: ({ node, ...props }: any) => (
      <td
        className="border border-gray-300 dark:border-gray-600 px-4 py-2"
        {...props}
      />
    ),
    hr: ({ node, ...props }: any) => (
      <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />
    ),
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col flex-1 max-w-4xl mx-auto w-full transition-colors ${
        isDragging ? "bg-blue-50 dark:bg-blue-900/10" : ""
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-500/20 dark:bg-blue-900/30 pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border-4 border-dashed border-blue-500">
            <div className="text-center">
              <svg
                className="mx-auto h-16 w-16 text-blue-500 mb-4"
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
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Drop video file here
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Release to upload and analyze
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-12">
            <p className="text-lg mb-2">Start analysing with SportAI</p>
            <p className="text-sm">Ask questions or upload a sports video for analysis</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                AI
              </div>
            )}
            
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              }`}
            >
              {message.role === "user" && (
                <div className="mb-2">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.videoPreview && (
                    <div className="mt-2">
                      <video
                        src={message.videoPreview}
                        controls
                        className="max-w-full rounded-md"
                      />
                    </div>
                  )}
                </div>
              )}
              
              {message.role === "assistant" && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {message.content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Thinking...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {message.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm font-semibold">
                You
              </div>
            )}
          </div>
        ))}
        
        {loading && videoFile && (
          <div className="flex justify-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
              AI
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {progressStage === "uploading" && `Uploading video... ${Math.round(uploadProgress)}%`}
                {progressStage === "analyzing" && "Analyzing video..."}
                {progressStage === "generating" && "Generating response..."}
              </div>
              {videoFile && progressStage === "analyzing" && (
                <div className="mt-2 w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-3">
          {videoFile && (
            <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
              <video
                src={videoPreview || undefined}
                className="h-12 rounded"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 truncate">
                {videoFile.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setVideoFile(null);
                  if (videoPreview) {
                    URL.revokeObjectURL(videoPreview);
                    setVideoPreview(null);
                  }
                }}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  // Auto-resize textarea
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                }}
                onPaste={(e) => {
                  // Handle paste and resize after paste content is inserted
                  setTimeout(() => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                  }, 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !loading) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
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
                  onClick={handlePickleballCoachPrompt}
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
                ${isDragging 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                  : "border-gray-300 dark:border-gray-600"
                }
              `}
              style={{ minHeight: "52px", minWidth: "52px" }}
            >
              <input
                id="video"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
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
    </div>
  );
}
