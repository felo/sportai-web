"use client";

import { useRef, useEffect } from "react";
import * as Avatar from "@radix-ui/react-avatar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "@/components/markdown/markdown-components";
import type { Message } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Use S3 URL if available, otherwise fall back to preview (blob URL)
  const videoSrc = message.videoUrl || message.videoPreview;

  useEffect(() => {
    if (videoRef.current && videoSrc && message.videoFile && !message.videoFile.type.startsWith("image/")) {
      const video = videoRef.current;
      
      const playVideo = async () => {
        try {
          video.muted = true;
          await video.play();
        } catch (error) {
          // Autoplay was prevented, but that's okay - user can still play manually
          console.log("Autoplay prevented:", error);
        }
      };

      const handleCanPlay = () => {
        playVideo();
      };

      const handleLoadedData = () => {
        playVideo();
      };

      // Set muted explicitly
      video.muted = true;
      
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("loadeddata", handleLoadedData);
      
      // Try to play immediately and also when ready
      requestAnimationFrame(() => {
        playVideo();
      });
      
      // Also try to play if video is already loaded
      if (video.readyState >= 3) {
        playVideo();
      }

      return () => {
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("loadeddata", handleLoadedData);
      };
    }
  }, [videoSrc, message.videoFile]);

  return (
    <div
      className={`flex gap-4 ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
      role="article"
      aria-label={`Message from ${message.role === "user" ? "user" : "assistant"}`}
    >
      {message.role === "assistant" && (
        <Avatar.Root className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
          <Avatar.Fallback className="w-full h-full rounded-full flex items-center justify-center">
            AI
          </Avatar.Fallback>
        </Avatar.Root>
      )}

      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          message.role === "user"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        }`}
        role={message.role === "user" ? "user-message" : "assistant-message"}
      >
        {message.role === "user" && (
          <div className="mb-2">
            <p className="whitespace-pre-wrap">{message.content}</p>
            {videoSrc && message.videoFile && (
              <div className="mt-2">
                {message.videoFile.type.startsWith("image/") ? (
                  <img
                    src={videoSrc}
                    alt="Uploaded image"
                    className="max-w-full rounded-md"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    controls
                    autoPlay
                    muted
                    playsInline
                    preload="auto"
                    className="max-w-full rounded-md"
                  />
                )}
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
        <Avatar.Root className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm font-semibold">
          <Avatar.Fallback className="w-full h-full rounded-full flex items-center justify-center">
            You
          </Avatar.Fallback>
        </Avatar.Root>
      )}
    </div>
  );
}

