#!/bin/bash

# Generate a thumbnail from a video URL using ffmpeg
# Usage: ./scripts/generate-thumbnail.sh <video_url> [output_path] [timestamp]
#
# Examples:
#   ./scripts/generate-thumbnail.sh "https://example.com/video.mp4"
#   ./scripts/generate-thumbnail.sh "https://example.com/video.mp4" thumbnail.jpg
#   ./scripts/generate-thumbnail.sh "https://example.com/video.mp4" thumbnail.jpg 00:00:01

VIDEO_URL="${1}"
OUTPUT_PATH="${2:-thumbnail.jpg}"
TIMESTAMP="${3:-00:00:01}"  # Default to 1 second into video

if [ -z "$VIDEO_URL" ]; then
  echo "Usage: $0 <video_url> [output_path] [timestamp]"
  echo ""
  echo "Arguments:"
  echo "  video_url   - URL of the video to extract thumbnail from"
  echo "  output_path - Output file path (default: thumbnail.jpg)"
  echo "  timestamp   - Time in video to capture (default: 00:00:01)"
  echo ""
  echo "Examples:"
  echo "  $0 'https://sportai-llm-uploads-public.s3.eu-north-1.amazonaws.com/samples/technique-analysis-serve-sample.mp4'"
  echo "  $0 'https://example.com/video.mp4' my-thumbnail.jpg 00:00:02"
  exit 1
fi

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
  echo "❌ Error: ffmpeg is not installed."
  echo ""
  echo "Install it with:"
  echo "  macOS:  brew install ffmpeg"
  echo "  Ubuntu: sudo apt install ffmpeg"
  exit 1
fi

echo "🎬 Generating thumbnail..."
echo "   Video URL: $VIDEO_URL"
echo "   Output:    $OUTPUT_PATH"
echo "   Timestamp: $TIMESTAMP"
echo ""

# Generate thumbnail
# -ss: seek to timestamp
# -i: input URL
# -vframes 1: extract 1 frame
# -q:v 2: high quality JPEG (1-31, lower is better)
# -vf scale: resize to max 640px width, maintaining aspect ratio
ffmpeg -ss "$TIMESTAMP" -i "$VIDEO_URL" -vframes 1 -q:v 2 -vf "scale=640:-1" "$OUTPUT_PATH" -y 2>&1

if [ $? -eq 0 ] && [ -f "$OUTPUT_PATH" ]; then
  FILE_SIZE=$(ls -lh "$OUTPUT_PATH" | awk '{print $5}')
  DIMENSIONS=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUTPUT_PATH" 2>/dev/null)
  
  echo ""
  echo "✅ Thumbnail generated successfully!"
  echo "   File: $OUTPUT_PATH"
  echo "   Size: $FILE_SIZE"
  echo "   Dimensions: $DIMENSIONS"
  echo ""
  echo "📤 To upload to S3, run:"
  echo "   aws s3 cp $OUTPUT_PATH s3://sportai-llm-uploads-public/samples/$(basename $OUTPUT_PATH) --acl public-read"
else
  echo ""
  echo "❌ Failed to generate thumbnail"
  exit 1
fi








