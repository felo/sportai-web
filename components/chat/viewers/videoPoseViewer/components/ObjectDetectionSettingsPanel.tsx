"use client";

import { Flex, Text, Select } from "@radix-ui/themes";
import selectStyles from "@/styles/selects.module.css";
import {
  SettingsSection,
  SettingsSectionHeader,
  ToggleSwitch,
  RangeSlider,
  LoadingState,
  ErrorDisplay,
} from "@/components/ui";

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
    <SettingsSection>
      <SettingsSectionHeader
        title="Object Detection (YOLO)"
        description="Detect and track objects in the video"
        enabled={isObjectDetectionEnabled}
        onEnabledChange={setIsObjectDetectionEnabled}
        disabled={isObjectDetectionLoading}
      />

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
            <RangeSlider
              value={objectConfidenceThreshold}
              onChange={setObjectConfidenceThreshold}
              min={0.1}
              max={0.9}
              step={0.05}
              label="Confidence"
              formatValue={(v) => `${(v * 100).toFixed(0)}%`}
              description="Higher = fewer false positives, lower = more detections"
              valueColor="gray"
            />

            {/* IoU Threshold (NMS) */}
            <RangeSlider
              value={objectIoUThreshold}
              onChange={setObjectIoUThreshold}
              min={0.1}
              max={0.9}
              step={0.05}
              label="NMS Threshold"
              formatValue={(v) => `${(v * 100).toFixed(0)}%`}
              description="Controls duplicate detection removal"
              valueColor="gray"
            />

            {/* Display Options */}
            <ToggleSwitch
              checked={showObjectLabels}
              onCheckedChange={setShowObjectLabels}
              label="Show Labels"
            />
            <ToggleSwitch
              checked={enableObjectTracking}
              onCheckedChange={setEnableObjectTracking}
              label="Enable Tracking"
            />
          </Flex>

          {isObjectDetectionLoading && (
            <LoadingState message="Loading object detection model..." />
          )}

          {objectDetectionError && (
            <ErrorDisplay message={`Error: ${objectDetectionError}`} />
          )}
        </Flex>
      )}
    </SettingsSection>
  );
}

