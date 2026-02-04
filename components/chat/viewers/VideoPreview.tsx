"use client";

import { Flex, Tooltip, Spinner } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import Image from "next/image";

interface VideoPreviewProps {
  videoFile: File;
  videoPreview: string | null;
  onRemove: () => void;
  disableTooltips?: boolean;
  /** Optional extracted frame thumbnail URL (used for iOS Photos app compatibility) */
  extractedThumbnailUrl?: string | null;
  /** Whether thumbnail extraction is in progress */
  isExtractingThumbnail?: boolean;
}

export function VideoPreview({
  videoFile,
  videoPreview,
  onRemove,
  disableTooltips = false,
  extractedThumbnailUrl,
  isExtractingThumbnail = false,
}: VideoPreviewProps) {
  const isImage = videoFile.type.startsWith("image/");

  // Use extracted thumbnail if available (fixes iOS Photos app video preview)
  const useExtractedThumbnail = !isImage && extractedThumbnailUrl;

  // Show spinner while extracting thumbnail for videos (not images)
  const showSpinner = !isImage && isExtractingThumbnail && !extractedThumbnailUrl;

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
        width: "fit-content",
        marginLeft: "auto",
      }}
      role="region"
      aria-label="Video preview"
    >
      <Tooltip content={videoFile.name} open={disableTooltips ? false : undefined}>
        {isImage ? (
          <Image
            src={videoPreview || ""}
            alt={videoFile.name}
            width={120}
            height={80}
            style={{
              height: "80px",
              width: "auto",
              borderRadius: "var(--radius-2)",
              objectFit: "cover",
            }}
            unoptimized
          />
        ) : showSpinner ? (
          // Show spinner while extracting thumbnail
          <Flex
            align="center"
            justify="center"
            style={{
              height: "80px",
              width: "120px",
              borderRadius: "var(--radius-2)",
              backgroundColor: "var(--gray-3)",
            }}
          >
            <Spinner size="2" />
          </Flex>
        ) : useExtractedThumbnail ? (
          // Use extracted frame as image (iOS Photos app fix)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={extractedThumbnailUrl}
            alt={videoFile.name}
            style={{
              height: "80px",
              width: "auto",
              borderRadius: "var(--radius-2)",
              objectFit: "cover",
            }}
          />
        ) : (
          <video
            data-video-container="true"
            src={videoPreview || undefined}
            style={{
              height: "80px",
              borderRadius: "var(--radius-2)",
            }}
            aria-label={`Preview of ${videoFile.name}`}
          />
        )}
      </Tooltip>
      <Tooltip content="Remove file" open={disableTooltips ? false : undefined}>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${videoFile.name}`}
          style={{
            width: "36px",
            height: "36px",
            minWidth: "36px",
            minHeight: "36px",
            aspectRatio: "1",
            borderRadius: "9999px",
            backgroundColor: "#7ADB8F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.3s ease-out",
            border: "2px solid white",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
            flexShrink: 0,
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
