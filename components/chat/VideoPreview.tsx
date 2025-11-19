"use client";

import { Box, Flex, Text, Tooltip } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";

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
    <Flex
      align="center"
      gap="2"
      p="2"
      style={{
        border: "1px solid var(--gray-6)",
        borderRadius: "var(--radius-2)",
        marginTop: "var(--space-2)",
      }}
      role="region"
      aria-label="Video preview"
    >
      {isImage ? (
        <img 
          src={videoPreview || undefined} 
          alt={videoFile.name}
          style={{
            height: "48px",
            width: "auto",
            borderRadius: "var(--radius-2)",
            objectFit: "cover",
          }}
        />
      ) : (
        <video
          src={videoPreview || undefined}
          style={{
            height: "48px",
            borderRadius: "var(--radius-2)",
          }}
          aria-label={`Preview of ${videoFile.name}`}
        />
      )}
      <Text
        color="gray"
        style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        aria-label={`File: ${videoFile.name}`}
      >
        {videoFile.name}
      </Text>
      <Tooltip content="Remove file">
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${videoFile.name}`}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "var(--gray-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background-color 0.2s",
            border: "none",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = "var(--gray-4)";
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = "var(--gray-3)";
          }}
        >
          <Cross2Icon width="16" height="16" color="var(--gray-11)" />
        </button>
      </Tooltip>
    </Flex>
  );
}

