import { useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ViewerConfig, ViewerActions, MomentReport } from "@/components/videoPoseViewerV2";
import type { Moment } from "../components";
import { calculateAngle } from "@/types/pose";
import { ALL_ANGLES } from "../constants";
import { stripStreamMetadata } from "../utils";

interface UseMomentAnalysisOptions {
  viewerRef: React.RefObject<ViewerActions | null>;
  config: ViewerConfig;
  setConfig: React.Dispatch<React.SetStateAction<ViewerConfig>>;
  sport?: string;
}

/**
 * Hook for managing moment analysis with AI.
 * Handles frame capture, S3 upload, and streaming LLM analysis.
 */
export function useMomentAnalysis({
  viewerRef,
  config,
  setConfig,
  sport,
}: UseMomentAnalysisOptions) {
  const [reports, setReports] = useState<MomentReport[]>([]);
  
  // Get auth for rate limiting (authenticated users get higher limits)
  const { session } = useAuth();
  const accessToken = session?.access_token;

  /**
   * Generate a unique report ID.
   */
  const generateReportId = useCallback(() => {
    return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Calculate all joint angles for a given frame's pose data.
   */
  const calculateAllAngles = useCallback(
    (keypoints: Array<{ x: number; y: number; score?: number }>) => {
      const minConfidence = 0.3;

      // Helper to check if keypoint is valid
      const isValid = (idx: number) =>
        keypoints[idx] && (keypoints[idx].score ?? 0) >= minConfidence;

      // Helper to calculate angle with complementary (outer) option
      const getAngle = (a: number, b: number, c: number): number | null => {
        if (!isValid(a) || !isValid(b) || !isValid(c)) return null;
        const rawAngle = calculateAngle(keypoints[a], keypoints[b], keypoints[c]);
        // Use complementary angles (180 - angle) as that's our default display
        return Math.round(180 - rawAngle);
      };

      const angles: { name: string; value: number | null }[] = [
        { name: "Left Elbow", value: getAngle(5, 7, 9) },
        { name: "Right Elbow", value: getAngle(6, 8, 10) },
        { name: "Left Knee", value: getAngle(11, 13, 15) },
        { name: "Right Knee", value: getAngle(12, 14, 16) },
        { name: "Left Shoulder", value: getAngle(7, 5, 11) },
        { name: "Right Shoulder", value: getAngle(8, 6, 12) },
        { name: "Left Hip", value: getAngle(5, 11, 13) },
        { name: "Right Hip", value: getAngle(6, 12, 14) },
      ];

      return angles.filter((a) => a.value !== null);
    },
    []
  );

  /**
   * Analyze a moment with AI.
   */
  const handleAnalyseMoment = useCallback(
    async (moment: Moment): Promise<void> => {
      if (!viewerRef.current) {
        console.error("[useMomentAnalysis] No viewer ref available");
        return;
      }

      // Create a new report immediately
      const reportId = generateReportId();
      const newReport: MomentReport = {
        id: reportId,
        momentId: moment.id,
        momentLabel: moment.label,
        momentType: moment.type,
        protocolId: moment.protocolId,
        time: moment.time,
        frame: moment.frame,
        content: "",
        isStreaming: true,
        createdAt: Date.now(),
        sport,
      };

      // Add report to state (it will be streaming)
      setReports((prev) => [newReport, ...prev]);

      console.log(`[useMomentAnalysis] Analyse requested for moment:`, {
        id: moment.id,
        label: moment.label,
        type: moment.type,
        time: moment.time,
        frame: moment.frame,
        protocolId: moment.protocolId,
      });

      // Save current angles
      const previousAngles = [...config.angles.measuredAngles];

      // Enable all angles for comprehensive capture
      setConfig((prev) => ({
        ...prev,
        angles: {
          ...prev.angles,
          measuredAngles: ALL_ANGLES,
        },
      }));

      // Seek to the moment's time
      viewerRef.current.seekTo(moment.time);

      // Wait for frame to render with all annotations
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Capture the annotated frame
      const blob = await viewerRef.current.captureFrame();

      // Restore previous angles
      setConfig((prev) => ({
        ...prev,
        angles: {
          ...prev.angles,
          measuredAngles: previousAngles,
        },
      }));

      if (!blob) {
        console.error("[useMomentAnalysis] Failed to capture frame");
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? { ...r, isStreaming: false, content: "Failed to capture frame for analysis." }
              : r
          )
        );
        return;
      }

      console.log(
        `[useMomentAnalysis] Captured frame for moment: ${moment.label} (${(blob.size / 1024).toFixed(1)} KB)`
      );

      // Create preview URL for the report
      const previewUrl = URL.createObjectURL(blob);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, previewUrl } : r))
      );

      // Upload to S3
      try {
        const timestamp = Date.now();
        const imageFile = new File([blob], `moment_${timestamp}.jpg`, {
          type: "image/jpeg",
        });

        console.log("[useMomentAnalysis] Uploading frame to S3...");

        const urlResponse = await fetch("/api/s3/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: imageFile.name,
            contentType: imageFile.type,
          }),
        });

        if (!urlResponse.ok) {
          const errorData = await urlResponse.json();
          throw new Error(errorData.error || "Failed to get upload URL");
        }

        const { url: presignedUrl, downloadUrl } = await urlResponse.json();

        // Upload to S3
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.addEventListener("load", () => {
            if (xhr.status === 200 || xhr.status === 204) {
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          });
          xhr.addEventListener("error", () => reject(new Error("Upload failed")));
          xhr.open("PUT", presignedUrl);
          xhr.setRequestHeader("Content-Type", imageFile.type);
          xhr.send(imageFile);
        });

        console.log("[useMomentAnalysis] Frame uploaded to S3");

        // Get pose data for this frame to calculate angles
        const preprocessedPoses = viewerRef.current?.getPreprocessedPoses();
        const framePoses = preprocessedPoses?.get(moment.frame);
        const pose = framePoses?.[0]; // Use first detected pose

        // Calculate all angles if pose data is available
        let anglesMeasured = "";
        if (pose && pose.keypoints) {
          const validAngles = calculateAllAngles(pose.keypoints);
          if (validAngles.length > 0) {
            anglesMeasured = `\n\n**Measured Joint Angles (outer angles, where 180° = fully extended):**\n${validAngles.map((a) => `- ${a.name}: ${a.value}°`).join("\n")}`;
          }
        }

        // Build context-aware prompt
        const momentType = moment.type === "protocol" ? "AI-detected" : "user-marked";
        const momentContext = moment.protocolId
          ? `This is a "${moment.label}" moment detected by the ${moment.protocolId} protocol.`
          : `This is a user-marked moment labeled "${moment.label}".`;

        const sportContext = sport
          ? `The sport is ${sport}.`
          : "The sport has not been specified.";

        const prompt = `Analyze this ${momentType} moment from a sports video in the Technique Studio.

${momentContext}
${sportContext}

The image shows the player's body position with pose detection overlay and joint angle measurements at ${moment.time.toFixed(2)} seconds (frame ${moment.frame}).${anglesMeasured}

Please provide detailed biomechanical feedback on:
1. Body positioning and alignment at this moment
2. The joint angles and what they indicate about the technique
3. What's good about the technique shown
4. Specific suggestions for improvement

Keep the analysis focused and actionable.`;

        // Send to LLM API with streaming
        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("videoUrl", downloadUrl);
        formData.append("promptType", "frame");
        formData.append("thinkingMode", "deep");
        formData.append("mediaResolution", "high");
        formData.append("domainExpertise", sport || "all-sports");

        console.log("[useMomentAnalysis] Sending to LLM API...");

        const headers: Record<string, string> = { "x-stream": "true" };
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }
        
        const response = await fetch("/api/llm", {
          method: "POST",
          body: formData,
          headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error ${response.status}: ${errorText}`);
        }

        // Stream the response
        const reader = response.body?.getReader();
        if (reader) {
          let fullResponse = "";
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullResponse += chunk;

            // Update report content as we stream
            setReports((prev) =>
              prev.map((r) =>
                r.id === reportId
                  ? { ...r, content: stripStreamMetadata(fullResponse) }
                  : r
              )
            );
          }

          // Mark as complete
          setReports((prev) =>
            prev.map((r) =>
              r.id === reportId
                ? { ...r, content: stripStreamMetadata(fullResponse), isStreaming: false }
                : r
            )
          );
          console.log("[useMomentAnalysis] Analysis complete");
        }
      } catch (error) {
        console.error("[useMomentAnalysis] Analysis error:", error);
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  isStreaming: false,
                  content: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                }
              : r
          )
        );
      }
    },
    [viewerRef, config.angles.measuredAngles, setConfig, sport, generateReportId, calculateAllAngles]
  );

  /**
   * Delete a report.
   */
  const handleDeleteReport = useCallback((reportId: string) => {
    setReports((prev) => {
      const report = prev.find((r) => r.id === reportId);
      if (report?.previewUrl) {
        URL.revokeObjectURL(report.previewUrl);
      }
      return prev.filter((r) => r.id !== reportId);
    });
  }, []);

  return {
    reports,
    setReports,
    handleAnalyseMoment,
    handleDeleteReport,
  };
}
