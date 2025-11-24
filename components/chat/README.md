# Chat Components Library

A collection of chat interface components for the SportAI application, organized by functionality.

## Structure

```
chat/
├── messages/            # Message display components
│   ├── MessageList.tsx          # List of chat messages
│   ├── MessageBubble.tsx        # Individual message bubble (coordinator)
│   ├── components/              # Message sub-components
│   │   ├── UserMessage.tsx          # User message with video
│   │   ├── AssistantMessage.tsx     # AI response with markdown
│   │   ├── ProUpsellBanner.tsx      # PRO membership upsell
│   │   ├── DeveloperInfo.tsx        # Token usage display
│   │   └── ThinkingIndicator.tsx    # Animated thinking dots
│   └── utils/                   # Message utilities
│       ├── proUpsellStorage.ts      # PRO upsell state management
│       └── thinkingMessages.ts      # Thinking message constants
├── input/               # User input components
│   ├── ChatInput.tsx            # Main chat input with video upload
│   └── AudioStopButton.tsx      # Stop audio playback button
├── viewers/             # Video and pose visualization components
│   ├── VideoPoseViewer.tsx      # Lazy-loaded pose detection viewer
│   ├── VideoPreview.tsx         # Video preview before upload
│   ├── SAM2Viewer.tsx           # SAM2 segmentation viewer
│   ├── Pose3DViewer.tsx         # 3D pose visualization wrapper
│   ├── Pose3DViewerCore.tsx     # Core 3D pose viewer with Three.js
│   └── videoPoseViewer/         # Advanced pose viewer module
│       ├── VideoPoseViewerCore.tsx   # Main pose detection viewer
│       ├── components/               # Pose viewer sub-components
│       ├── hooks/                    # Pose viewer custom hooks
│       ├── types/                    # Type definitions
│       ├── constants.ts              # Configuration constants
│       └── utils/                    # Utility functions
├── feedback/            # Status and feedback components
│   ├── FeedbackButtons.tsx      # Thumbs up/down feedback
│   ├── StreamingIndicator.tsx   # Streaming status indicator
│   └── ProgressIndicator.tsx    # Upload/processing progress
├── navigation/          # Scroll and navigation utilities
│   ├── ScrollToBottom.tsx       # Auto-scroll to latest message
│   └── ScrollToVideo.tsx        # Scroll to video in chat
├── overlays/            # Overlay components
│   └── DragOverlay.tsx          # Drag-and-drop overlay
├── header/              # Chat header
│   └── ChatHeader.tsx           # Chat header with title and actions
└── index.ts             # Central export file
```

## Usage

Import components from the central index:

```tsx
import { 
  MessageList, 
  ChatInput, 
  VideoPoseViewer,
  ScrollToBottom 
} from "@/components/chat";
```

Or import directly from subdirectories when needed:

```tsx
import { VideoPoseViewer } from "@/components/chat/viewers/VideoPoseViewer";
import { useVideoDimensions } from "@/components/chat/viewers/videoPoseViewer/hooks";
```

## Components

### Messages

#### MessageList
Displays a scrollable list of chat messages with loading states.

```tsx
<MessageList
  messages={messages}
  loading={loading}
  videoFile={videoFile}
  progressStage={progressStage}
  uploadProgress={uploadProgress}
  messagesEndRef={messagesEndRef}
  onAskForHelp={handleAskForHelp}
  onUpdateMessage={handleUpdateMessage}
/>
```

#### MessageBubble
Individual message component with support for text, video, and pose detection results.

```tsx
<MessageBubble
  message={message}
  allMessages={messages}
  messageIndex={index}
  onAskForHelp={handleAskForHelp}
  onUpdateMessage={handleUpdateMessage}
/>
```

### Input

#### ChatInput
Main chat input with video upload, settings, and send functionality.

```tsx
<ChatInput
  prompt={prompt}
  videoFile={videoFile}
  videoPreview={videoPreview}
  error={error}
  loading={loading}
  progressStage={progressStage}
  onPromptChange={setPrompt}
  onVideoSelect={handleVideoSelect}
  onVideoRemove={handleVideoRemove}
  onSubmit={handleSubmit}
  onStop={handleStop}
  disabled={disabled}
/>
```

#### AudioStopButton
Button to stop audio playback.

```tsx
<AudioStopButton
  onClick={stopAudio}
  isVisible={isPlaying}
/>
```

### Viewers

#### VideoPoseViewer
Lazy-loaded video player with pose detection, object detection, and projectile tracking.

```tsx
<VideoPoseViewer
  videoUrl={videoUrl}
  width={640}
  height={480}
  initialModel="movenet-multipose"
  initialShowSkeleton={true}
  initialPoseEnabled={true}
/>
```

#### VideoPreview
Preview uploaded video before sending.

```tsx
<VideoPreview
  videoUrl={videoPreview}
  fileName={fileName}
  onRemove={handleRemove}
/>
```

#### SAM2Viewer
Segment Anything Model 2 viewer for video segmentation.

```tsx
<SAM2Viewer
  videoUrl={videoUrl}
  width={640}
  height={480}
/>
```

#### Pose3DViewer
3D visualization of pose detection results using Three.js.

```tsx
<Pose3DViewer
  pose={poseData}
  width={640}
  height={480}
  showFace={true}
/>
```

### Feedback

#### FeedbackButtons
Thumbs up/down feedback buttons for messages.

```tsx
<FeedbackButtons
  messageId={messageId}
  currentFeedback={feedback}
  onFeedback={handleFeedback}
/>
```

#### StreamingIndicator
Animated indicator shown during streaming responses.

```tsx
<StreamingIndicator />
```

#### ProgressIndicator
Shows upload and processing progress with stages.

```tsx
<ProgressIndicator
  progressStage="uploading"
  uploadProgress={75}
  hasVideo={true}
/>
```

### Navigation

#### ScrollToBottom
Button to scroll to the bottom of the chat.

```tsx
<ScrollToBottom
  messagesEndRef={messagesEndRef}
  isVisible={!isAtBottom}
/>
```

#### ScrollToVideo
Scrolls to video content in chat messages.

```tsx
<ScrollToVideo
  videoMessageId={videoMessageId}
  onScrollComplete={handleScrollComplete}
/>
```

### Overlays

#### DragOverlay
Overlay shown during drag-and-drop operations.

```tsx
<DragOverlay
  isDragging={isDragging}
  onDrop={handleDrop}
/>
```

### Header

#### ChatHeader
Chat header with title, actions, and sidebar toggle.

```tsx
<ChatHeader
  onNewChat={handleNewChat}
  onToggleSidebar={toggleSidebar}
  isSidebarOpen={isSidebarOpen}
/>
```

## VideoPoseViewer Module

The `videoPoseViewer` subfolder contains a sophisticated pose detection system with its own architecture:

### Components
- `PoseSettingsPanel` - Configure pose detection settings
- `ObjectDetectionSettingsPanel` - Configure object detection
- `ProjectileDetectionSettingsPanel` - Configure ball tracking
- `PlaybackControls` - Video playback controls
- `VelocityDisplay` - Display velocity measurements
- `CollapsibleSection` - Collapsible settings sections
- `DescriptiveSelect` - Select with descriptions
- `AnglePresetButton` - Quick angle measurement presets

### Hooks
- `usePoseSettings` - Manage pose detection settings
- `useDetectionSettings` - Manage detection settings
- `useDetectionState` - Manage detection state
- `useVideoPlayback` - Video playback control
- `useVideoDimensions` - Get video dimensions
- `useVideoFPS` - Calculate video FPS
- `useVelocityTracking` - Track joint velocity
- `useJointTrajectories` - Track joint trajectories
- `useAngleMeasurement` - Measure angles between joints

### Constants
- `CONFIDENCE_PRESETS` - Confidence threshold presets
- `RESOLUTION_PRESETS` - Resolution mode presets
- `PLAYBACK_SPEEDS` - Playback speed options
- `LABEL_POSITION_STABILITY_FRAMES` - Label smoothing

## Design Principles

1. **Modularity**: Components are organized by functionality, making them easy to find and maintain
2. **Code Splitting**: Heavy components like `VideoPoseViewer` use lazy loading to improve performance
3. **Separation of Concerns**: Clear separation between UI, logic, and data
4. **Reusability**: Components are designed to be used in multiple contexts
5. **TypeScript**: Full type safety with comprehensive interfaces
6. **Performance**: Optimized rendering and memoization strategies

## Adding New Components

When adding new chat components:

1. Choose the appropriate folder based on functionality
2. Create component file with proper TypeScript types
3. Update the folder's local exports if applicable
4. Add to main `chat/index.ts` export if it's a top-level component
5. Update this README with usage example
6. Ensure proper lazy loading for heavy components
7. Follow existing patterns for consistency

## Performance Considerations

- `VideoPoseViewer` is lazy-loaded to reduce initial bundle size (~1.5MB TensorFlow.js)
- `Pose3DViewer` is lazy-loaded to reduce Three.js bundle (~600KB)
- Components use React.memo where appropriate
- Heavy computations are memoized with useMemo/useCallback
- Video processing uses Web Workers when possible

