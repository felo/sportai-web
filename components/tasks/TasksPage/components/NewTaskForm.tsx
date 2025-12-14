"use client";

import { useMemo } from "react";
import { Box, Flex, Text, Button, TextField, Card, Select, Badge, Spinner } from "@radix-ui/themes";
import { PlusIcon, UploadIcon, Cross2Icon } from "@radix-ui/react-icons";
import { TASK_TYPES, SPORTS } from "../constants";

interface NewTaskFormProps {
  // Form state
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  taskType: string;
  onTaskTypeChange: (type: string) => void;
  sport: string;
  onSportChange: (sport: string) => void;

  // URL submission
  submitting: boolean;
  onSubmit: () => void;

  // File upload
  selectedFile: File | null;
  uploadingVideo: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onFileUploadSubmit: () => void;
}

/**
 * Form for creating new tasks (developer mode only).
 */
export function NewTaskForm({
  videoUrl,
  onVideoUrlChange,
  taskType,
  onTaskTypeChange,
  sport,
  onSportChange,
  submitting,
  onSubmit,
  selectedFile,
  uploadingVideo,
  uploadProgress,
  fileInputRef,
  onFileSelect,
  onClearFile,
  onFileUploadSubmit,
}: NewTaskFormProps) {
  // Available task types based on sport selection
  const availableTaskTypes = useMemo(() => {
    if (sport === "all") {
      return TASK_TYPES.filter((t) => t.value === "technique");
    }
    return TASK_TYPES;
  }, [sport]);

  const isDisabled = submitting || uploadingVideo;

  return (
    <Card style={{ marginBottom: "24px" }}>
      <Flex gap="3" align="end" wrap="wrap">
        {/* Sport Select */}
        <Box style={{ width: "120px" }}>
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
            Sport
          </Text>
          <Select.Root value={sport} onValueChange={onSportChange} disabled={isDisabled}>
            <Select.Trigger style={{ width: "100%" }} />
            <Select.Content>
              {SPORTS.map((s) => (
                <Select.Item key={s.value} value={s.value}>
                  {s.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Box>

        {/* Task Type Select */}
        <Box style={{ width: "140px" }}>
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
            Analysis Type
          </Text>
          <Select.Root value={taskType} onValueChange={onTaskTypeChange} disabled={isDisabled}>
            <Select.Trigger style={{ width: "100%" }} />
            <Select.Content>
              {availableTaskTypes.map((type) => (
                <Select.Item key={type.value} value={type.value}>
                  {type.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Box>

        {/* URL Input */}
        <Box style={{ flex: 1, minWidth: "200px" }}>
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
            Video URL
          </Text>
          <TextField.Root
            placeholder="https://example.com/video.mp4"
            value={videoUrl}
            onChange={(e) => {
              onVideoUrlChange(e.target.value);
              if (e.target.value) onClearFile();
            }}
            disabled={isDisabled || !!selectedFile}
          />
        </Box>

        <Text size="2" color="gray" style={{ alignSelf: "center", paddingBottom: "6px" }}>
          or
        </Text>

        {/* File Upload */}
        <Box>
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
            Upload Video
          </Text>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={onFileSelect}
            disabled={isDisabled}
            style={{ display: "none" }}
          />
          {selectedFile ? (
            <Flex gap="2" align="center">
              <Badge size="2" variant="soft" color="blue">
                {selectedFile.name.length > 20
                  ? `${selectedFile.name.slice(0, 17)}...`
                  : selectedFile.name}
              </Badge>
              <Button variant="ghost" size="1" onClick={onClearFile} disabled={uploadingVideo}>
                <Cross2Icon />
              </Button>
            </Flex>
          ) : (
            <Button
              variant="soft"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled || !!videoUrl.trim()}
            >
              <UploadIcon />
              Choose File
            </Button>
          )}
        </Box>

        {/* Submit Button */}
        {selectedFile ? (
          <Button onClick={onFileUploadSubmit} disabled={uploadingVideo}>
            {uploadingVideo ? (
              <>
                <Spinner size="1" />
                {uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : "Uploading..."}
              </>
            ) : (
              <>
                <PlusIcon />
                Upload & Analyse
              </>
            )}
          </Button>
        ) : (
          <Button onClick={onSubmit} disabled={submitting || !videoUrl.trim()}>
            {submitting ? <Spinner size="1" /> : <PlusIcon />}
            Analyse
          </Button>
        )}
      </Flex>

      {/* Upload Progress Bar */}
      {uploadingVideo && uploadProgress > 0 && (
        <Box style={{ marginTop: "12px" }}>
          <Box
            style={{
              height: "4px",
              backgroundColor: "var(--gray-4)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <Box
              style={{
                height: "100%",
                width: `${uploadProgress}%`,
                backgroundColor: "var(--accent-9)",
                transition: "width 0.2s ease-out",
              }}
            />
          </Box>
        </Box>
      )}
    </Card>
  );
}
