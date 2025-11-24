"use client";

import { Flex, Text, Switch, Select, Spinner } from "@radix-ui/themes";
import selectStyles from "@/styles/selects.module.css";

interface ObjectDetectionSettingsPanelProps {
  // Detection state
  isObjectDetectionEnabled: boolean;
  setIsObjectDetectionEnabled: (value: boolean) => void;
  isObjectDetectionLoading: boolean;
  objectDetectionError: string | null;

  // Model selection
  selectedObjectModel: "YOLOv8n" | "YOLOv8s" | "YOLOv8m";
  setSelectedObjectModel: (value: "YOLOv8n" | "YOLOv8s" | "YOLOv8m") => void;
  setCurrentObjects: (value: any[]) => void;

  // Sport filter
  sportFilter: "all" | "tennis" | "pickleball" | "basketball" | "baseball" | "skating";
  setSportFilter: (value: "all" | "tennis" | "pickleball" | "basketball" | "baseball" | "skating") => void;

  // Threshold settings
  objectConfidenceThreshold: number;
  setObjectConfidenceThreshold: (value: number) => void;
  objectIoUThreshold: number;
  setObjectIoUThreshold: (value: number) => void;

  // Display options
  showObjectLabels: boolean;
  setShowObjectLabels: (value: boolean) => void;
  enableObjectTracking: boolean;
  setEnableObjectTracking: (value: boolean) => void;
}

/**
 * ObjectDetectionSettingsPanel - Settings panel for YOLO object detection
 * 
 * Extracted from VideoPoseViewerCore to improve maintainability.
 * Contains all object detection settings including:
 * - Model selection (YOLOv8n/s/m)
 * - Sport filter
 * - Confidence and IoU thresholds
 * - Display options
 */
export function ObjectDetectionSettingsPanel({
  isObjectDetectionEnabled,
  setIsObjectDetectionEnabled,
  isObjectDetectionLoading,
  objectDetectionError,
  selectedObjectModel,
  setSelectedObjectModel,
  setCurrentObjects,
  sportFilter,
  setSportFilter,
  objectConfidenceThreshold,
  setObjectConfidenceThreshold,
  objectIoUThreshold,
  setObjectIoUThreshold,
  showObjectLabels,
  setShowObjectLabels,
  enableObjectTracking,
  setEnableObjectTracking,
}: ObjectDetectionSettingsPanelProps) {
  return (
    <Flex direction="column" gap="2" pt="3" style={{ borderTop: "1px solid var(--gray-a5)" }}>
      <Flex align="center" justify="between">
        <Flex direction="column" gap="1">
          <Text size="2" weight="bold">
            Object Detection (YOLO)
          </Text>
          <Text size="1" color="gray">
            Detect and track objects in the video
          </Text>
        </Flex>
        <Switch
          checked={isObjectDetectionEnabled}
          onCheckedChange={setIsObjectDetectionEnabled}
          disabled={isObjectDetectionLoading}
        />
      </Flex>

      {isObjectDetectionEnabled && (
        <Flex direction="column" gap="3">
          {/* Object Model Selection */}
          <Select.Root
            value={selectedObjectModel}
            onValueChange={(value) => {
              setSelectedObjectModel(value as "YOLOv8n" | "YOLOv8s" | "YOLOv8m");
              setCurrentObjects([]);
            }}
            disabled={isObjectDetectionLoading}
          >
            <Select.Trigger className={selectStyles.selectTriggerStyled} style={{ width: "100%", height: "70px", padding: "12px" }}>
              <Flex direction="column" gap="1" align="start">
                <Text weight="medium" size="2">
                  {selectedObjectModel}
                </Text>
                <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                  {selectedObjectModel === "YOLOv8n" && "Fast, lightweight detection"}
                  {selectedObjectModel === "YOLOv8s" && "Balanced speed and accuracy"}
                  {selectedObjectModel === "YOLOv8m" && "High accuracy, slower"}
                </Text>
              </Flex>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="YOLOv8n" style={{ minHeight: "70px", padding: "12px" }}>
                <Flex direction="column" gap="1">
                  <Text weight="medium" size="2">YOLOv8n (Nano)</Text>
                  <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>Fast, lightweight detection</Text>
                </Flex>
              </Select.Item>
              <Select.Item value="YOLOv8s" style={{ minHeight: "70px", padding: "12px" }}>
                <Flex direction="column" gap="1">
                  <Text weight="medium" size="2">YOLOv8s (Small)</Text>
                  <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>Balanced speed and accuracy</Text>
                </Flex>
              </Select.Item>
              <Select.Item value="YOLOv8m" style={{ minHeight: "70px", padding: "12px" }}>
                <Flex direction="column" gap="1">
                  <Text weight="medium" size="2">YOLOv8m (Medium)</Text>
                  <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>High accuracy, slower</Text>
                </Flex>
              </Select.Item>
            </Select.Content>
          </Select.Root>

          {/* Object Detection Options */}
          <Flex direction="column" gap="3">
            {/* Sport Filter */}
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">Sport Filter</Text>
              <Select.Root
                value={sportFilter}
                onValueChange={(value: any) => setSportFilter(value)}
              >
                <Select.Trigger className={selectStyles.selectTriggerStyled} style={{ width: "100%", padding: "8px" }}>
                  <Text size="2">
                    {sportFilter === "all" && "All Objects"}
                    {sportFilter === "tennis" && "Tennis"}
                    {sportFilter === "pickleball" && "Pickleball"}
                    {sportFilter === "basketball" && "Basketball"}
                    {sportFilter === "baseball" && "Baseball"}
                    {sportFilter === "skating" && "Skating"}
                  </Text>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">All Objects</Select.Item>
                  <Select.Item value="tennis">Tennis (person, ball, racket)</Select.Item>
                  <Select.Item value="pickleball">Pickleball (person, ball)</Select.Item>
                  <Select.Item value="basketball">Basketball (person, ball)</Select.Item>
                  <Select.Item value="baseball">Baseball (person, ball, bat, glove)</Select.Item>
                  <Select.Item value="skating">Skating (person, skateboard)</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            {/* Confidence Threshold */}
            <Flex direction="column" gap="1">
              <Flex align="center" justify="between">
                <Text size="2" weight="medium">Confidence</Text>
                <Text size="2" color="gray">{(objectConfidenceThreshold * 100).toFixed(0)}%</Text>
              </Flex>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={objectConfidenceThreshold}
                onChange={(e) => setObjectConfidenceThreshold(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
              <Text size="1" color="gray">
                Higher = fewer false positives, lower = more detections
              </Text>
            </Flex>

            {/* IoU Threshold (NMS) */}
            <Flex direction="column" gap="1">
              <Flex align="center" justify="between">
                <Text size="2" weight="medium">NMS Threshold</Text>
                <Text size="2" color="gray">{(objectIoUThreshold * 100).toFixed(0)}%</Text>
              </Flex>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={objectIoUThreshold}
                onChange={(e) => setObjectIoUThreshold(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
              <Text size="1" color="gray">
                Controls duplicate detection removal
              </Text>
            </Flex>

            {/* Display Options */}
            <Flex align="center" justify="between">
              <Text size="2">Show Labels</Text>
              <Switch
                checked={showObjectLabels}
                onCheckedChange={setShowObjectLabels}
              />
            </Flex>
            <Flex align="center" justify="between">
              <Text size="2">Enable Tracking</Text>
              <Switch
                checked={enableObjectTracking}
                onCheckedChange={setEnableObjectTracking}
              />
            </Flex>
          </Flex>

          {isObjectDetectionLoading && (
            <Flex align="center" gap="2">
              <Spinner />
              <Text size="2" color="gray">Loading object detection model...</Text>
            </Flex>
          )}

          {objectDetectionError && (
            <Text size="2" color="red">
              Error: {objectDetectionError}
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );
}

