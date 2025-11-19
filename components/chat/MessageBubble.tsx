"use client";

import { useRef, useEffect } from "react";
import { Avatar, Box, Flex, Spinner, Text } from "@radix-ui/themes";
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
    <Flex
      gap="4"
      justify={message.role === "user" ? "end" : "start"}
      role="article"
      aria-label={`Message from ${message.role === "user" ? "user" : "assistant"}`}
    >
      {message.role === "assistant" && (
        <Avatar
          size="2"
          radius="full"
          fallback="AI"
          color="blue"
        />
      )}

      <Box
        style={{
          maxWidth: "80%",
          borderRadius: "var(--radius-3)",
          padding: "var(--space-3) var(--space-4)",
          backgroundColor:
            message.role === "user"
              ? "var(--accent-9)"
              : "var(--gray-3)",
          color:
            message.role === "user"
              ? "var(--accent-contrast)"
              : "var(--gray-12)",
        }}
        role={message.role === "user" ? "user-message" : "assistant-message"}
      >
        {message.role === "user" && (
          <Box>
            <Text style={{ whiteSpace: "pre-wrap" }}>{message.content}</Text>
            {videoSrc && message.videoFile && (
              <Box mt="2">
                {message.videoFile.type.startsWith("image/") ? (
                  <img
                    src={videoSrc}
                    alt="Uploaded image"
                    style={{
                      maxWidth: "100%",
                      borderRadius: "var(--radius-2)",
                    }}
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
                    style={{
                      maxWidth: "100%",
                      borderRadius: "var(--radius-2)",
                    }}
                  />
                )}
              </Box>
            )}
          </Box>
        )}

        {message.role === "assistant" && (
          <Box className="prose prose-sm dark:prose-invert" style={{ maxWidth: "none" }}>
            {message.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <Flex gap="2" align="center">
                <Spinner size="1" />
                <Text size="2" color="gray">Thinking...</Text>
              </Flex>
            )}
          </Box>
        )}
      </Box>

      {message.role === "user" && (
        <Avatar
          size="2"
          radius="full"
          fallback="You"
          color="gray"
        />
      )}
    </Flex>
  );
}

