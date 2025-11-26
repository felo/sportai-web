"use client";

import { Box, Flex, Text, Tooltip } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import Image from "next/image";

interface VideoPreviewProps {
  videoFile: File;
  videoPreview: string | null;
  onRemove: () => void;
  disableTooltips?: boolean;
}

export function VideoPreview({
  videoFile,
  videoPreview,
  onRemove,
  disableTooltips = false,
}: VideoPreviewProps) {
  const isImage = videoFile.type.startsWith("image/");
  
  return (
    <Flex
      align="center"
      gap="2"
      p="2"
      style={{
        border: "1px solid #7ADB8F",
        borderRadius: "var(--radius-3)",
        marginTop: "var(--space-2)",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
      }}
      role="region"
      aria-label="Video preview"
    >
      {isImage ? (
        <Image 
          src={videoPreview || ""} 
          alt={videoFile.name}
          width={48}
          height={48}
          style={{
            height: "48px",
            width: "auto",
            borderRadius: "var(--radius-2)",
            objectFit: "cover",
          }}
          unoptimized
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
        style={{ 
          flex: 1, 
          overflow: "hidden", 
          textOverflow: "ellipsis", 
          whiteSpace: "nowrap",
          paddingLeft: "var(--space-2)",
        }}
        aria-label={`File: ${videoFile.name}`}
      >
        {videoFile.name}
      </Text>
      <Tooltip content="Remove file" open={disableTooltips ? false : undefined}>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${videoFile.name}`}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "9999px",
            backgroundColor: "#7ADB8F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.3s ease-out",
            border: "2px solid white",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
            textTransform: "uppercase",
            fontWeight: 600,
            marginRight: "var(--space-1)",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = "#95E5A6";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)";
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = "#7ADB8F";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)";
          }}
        >
          <Cross2Icon width="18" height="18" color="#1C1C1C" />
        </button>
      </Tooltip>
    </Flex>
  );
}

