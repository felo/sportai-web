"use client";

import { Box, Flex, Text, Tooltip, IconButton } from "@radix-ui/themes";
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
        backgroundColor: "var(--gray-3)",
        borderRadius: "var(--radius-2)",
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
        size="2"
        color="gray"
        style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        aria-label={`File: ${videoFile.name}`}
      >
        {videoFile.name}
      </Text>
      <Tooltip content="Remove file">
        <IconButton
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${videoFile.name}`}
          color="red"
          variant="ghost"
          size="1"
        >
          <Cross2Icon width="12" height="12" />
        </IconButton>
      </Tooltip>
    </Flex>
  );
}

