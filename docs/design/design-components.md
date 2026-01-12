# SportAI Component Catalog

> **For AI agents**: Complete component reference. For design tokens and patterns, see `design-core.md`.

---

## UI Components (`@/components/ui`)

### Buttons

#### IconButton
```tsx
import { IconButton } from "@/components/ui";

<IconButton
  icon={<PlusIcon />}
  onClick={fn}
  variant="ghost"       // ghost | soft | solid | outline | surface
  size="2"              // 1=24px | 2=32px | 3=40px | 4=48px
  color="gray"          // gray | mint | red
  tooltip="Add item"
  ariaLabel="Add"       // REQUIRED
  disabled={false}
/>
```

#### CircularIconButton
```tsx
import { CircularIconButton } from "@/components/ui";

<CircularIconButton
  icon={<PlayIcon size={16} />}
  onClick={fn}
  size="medium"         // small=24px | medium=32px | large=40px
  active={isPlaying}    // mint background
  loading={false}
  ariaLabel="Play"      // REQUIRED
/>
```

#### PresetButtonGroup
```tsx
import { PresetButtonGroup } from "@/components/ui";

<PresetButtonGroup
  label="Select arm"
  buttons={[
    { key: "left", label: "L Arm", onClick: fn, active: true },
    { key: "right", label: "R Arm", onClick: fn },
  ]}
  size="1"
  gap="1"
  disabled={false}
/>
```

---

### Inputs

#### ToggleSwitch
```tsx
import { ToggleSwitch } from "@/components/ui";

<ToggleSwitch
  checked={value}
  onCheckedChange={setValue}
  label="Enable feature"
  description="Help text"
  tooltip="More info"
  showStatus              // shows "• Active"
  statusText="• Enabled"
  size="2"
  disabled={false}
/>
```

#### RangeSlider
```tsx
import { RangeSlider } from "@/components/ui";

<RangeSlider
  value={count}
  onChange={setCount}
  min={1}
  max={10}
  step={1}
  label="Player count"
  formatValue={(v) => `${v} players`}
  description="Adjust detection"
  valueColor="mint"
  showValue={true}
  disabled={false}
/>
```

---

### Layout

#### SettingsSection
```tsx
import { SettingsSection } from "@/components/ui";

<SettingsSection showBorder pt="3" gap="2">
  <SettingsSectionHeader ... />
  <ToggleSwitch ... />
</SettingsSection>
```

#### SettingsSectionHeader
```tsx
import { SettingsSectionHeader } from "@/components/ui";

// With toggle
<SettingsSectionHeader
  title="Pose Detection"
  description="Track body movement"
  enabled={isEnabled}
  onEnabledChange={setIsEnabled}
/>

// Header only
<SettingsSectionHeader
  title="Frame Analysis"
  description="Analyze current frame"
/>
```

---

### Feedback

#### LoadingState
```tsx
import { LoadingState } from "@/components/ui";

<LoadingState message="Loading model..." size="2" gap="2" />
```

#### ErrorDisplay
```tsx
import { ErrorDisplay } from "@/components/ui";

<ErrorDisplay message="Failed to load" showIcon size="2" />
```

#### EmptyState
```tsx
import { EmptyState } from "@/components/ui";

<EmptyState message="No chats yet" />
```

#### FeedbackToast
```tsx
import { FeedbackToast } from "@/components/ui";

<FeedbackToast open={showToast} onOpenChange={setShowToast} />
```

#### ErrorToast
```tsx
import { ErrorToast } from "@/components/ui";

<ErrorToast open={showError} onOpenChange={setShowError} message="Error" />
```

---

### Navigation

#### NavigationLink
```tsx
import { NavigationLink } from "@/components/ui";

<NavigationLink
  href="https://sportai.com"
  label="Visit Platform"
  icon={<GlobeIcon />}
  external              // new tab
  variant="ghost"
  size="2"
/>
```

---

### Badges

#### BadgeWithTooltip
```tsx
import { BadgeWithTooltip } from "@/components/ui";

<BadgeWithTooltip
  text="v0.5.58"
  tooltip="Last updated: 2025-01-01"
  variant="soft"
  color="gray"
  radius="full"
  tooltipSide="bottom"
/>
```

---

### Brand

#### LogoNewChatButton
```tsx
import { LogoNewChatButton } from "@/components/ui";

<LogoNewChatButton
  onNewChat={handleNewChat}
  width={120}
  height={38}
  directTapAction        // mobile: tap = action
/>
```

---

## Chat Components (`@/components/chat`)

### Messages

#### MessageList
```tsx
import { MessageList } from "@/components/chat";

<MessageList
  messages={messages}
  loading={isLoading}
  videoFile={videoFile}
  progressStage={stage}
  uploadProgress={progress}
  messagesEndRef={endRef}
  onAskForHelp={fn}
  onUpdateMessage={fn}
/>
```

#### MessageBubble
```tsx
import { MessageBubble } from "@/components/chat";

<MessageBubble
  message={message}
  allMessages={messages}
  messageIndex={idx}
  onAskForHelp={fn}
  onUpdateMessage={fn}
/>
```

---

### Input

#### ChatInput
```tsx
import { ChatInput } from "@/components/chat";

<ChatInput
  prompt={text}
  videoFile={file}
  videoPreview={preview}
  error={error}
  loading={isLoading}
  progressStage={stage}
  onPromptChange={setText}
  onVideoSelect={handleVideo}
  onVideoRemove={removeVideo}
  onSubmit={handleSubmit}
  onStop={handleStop}
  disabled={false}
/>
```

#### AudioStopButton
```tsx
import { AudioStopButton } from "@/components/chat";

<AudioStopButton onClick={stopAudio} isVisible={isPlaying} />
```

---

### Viewers

#### VideoPoseViewer
Heavy component (~1.5MB). Lazy-loaded.

```tsx
import { VideoPoseViewer } from "@/components/chat";

<VideoPoseViewer
  videoUrl={url}
  width={640}
  height={480}
  initialModel="movenet-multipose"
  initialShowSkeleton={true}
  initialPoseEnabled={true}
/>
```

#### VideoPreview
```tsx
import { VideoPreview } from "@/components/chat";

<VideoPreview
  videoFile={file}
  videoPreview={previewUrl}
  onRemove={handleRemove}
  disableTooltips={false}
/>
```

---

### Feedback

#### ProgressIndicator
```tsx
import { ProgressIndicator } from "@/components/chat";

<ProgressIndicator
  progressStage={stage}   // "uploading" | "analyzing" | "generating"
  uploadProgress={75}
  hasVideo={true}
/>
```

#### StreamingIndicator
```tsx
import { StreamingIndicator } from "@/components/chat";

<StreamingIndicator />
```

#### FeedbackButtons
```tsx
import { FeedbackButtons } from "@/components/chat";

<FeedbackButtons
  messageId={id}
  chatId={chatId}
  messageContent={content}
  onFeedback={(id, type) => {}}
/>
```

---

### Navigation

#### ScrollToBottom
```tsx
import { ScrollToBottom } from "@/components/chat";

<ScrollToBottom
  scrollContainerRef={containerRef}
  onScrollToBottom={scrollToBottom}
  threshold={200}
/>
```

#### ScrollToVideo
```tsx
import { ScrollToVideo } from "@/components/chat";

<ScrollToVideo
  videoMessageId={id}
  onScrollComplete={fn}
/>
```

---

### Overlays

#### DragOverlay
```tsx
import { DragOverlay } from "@/components/chat";

{isDragging && <DragOverlay />}
```

---

### Header

#### ChatHeader
```tsx
import { ChatHeader } from "@/components/chat";

<ChatHeader
  onNewChat={fn}
  onToggleSidebar={fn}
  isSidebarOpen={isOpen}
/>
```

---

## Auth Components (`@/components/auth`)

#### AuthModal
```tsx
import { AuthModal } from "@/components/auth/AuthModal";

<AuthModal open={isOpen} onOpenChange={setIsOpen} />
```

#### UserMenu
```tsx
import { UserMenu } from "@/components/auth/UserMenu";

<UserMenu
  appearance={theme}
  theatreMode={isTheatre}
  developerMode={isDev}
  highlightingPrefs={prefs}
  ttsSettings={tts}
  messageCount={count}
  isMobile={isMobile}
  collapsed={isCollapsed}
  onThemeSelect={fn}
  onTheatreModeToggle={fn}
  onDeveloperModeToggle={fn}
  onHighlightingToggle={fn}
  onTTSSettingChange={fn}
  onClearChat={fn}
  onOpenStorageDebug={fn}
  onSetAlertOpen={fn}
/>
```

---

## Sidebar Components (`@/components/sidebar`)

#### Sidebar
```tsx
import { Sidebar } from "@/components/sidebar";

<Sidebar
  onClearChat={fn}
  messageCount={count}
  onChatSwitchAttempt={fn}
>
  {/* Optional content */}
</Sidebar>
```

#### ChatListItem
```tsx
import { ChatListItem } from "@/components/sidebar/ChatListItem";

<ChatListItem
  chat={chat}
  isActive={isActive}
  isHovered={isHovered}
  isMobile={isMobile}
  onMouseEnter={fn}
  onMouseLeave={fn}
  onClick={fn}
  onEdit={fn}
  onDelete={fn}
/>
```

---

## Page Components

#### StarterPrompts
```tsx
import { StarterPrompts } from "@/components/StarterPrompts";

<StarterPrompts
  onPromptSelect={(prompt, videoUrl, settings) => {}}
/>
```

#### ThemeSwitcher
```tsx
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

<ThemeSwitcher />
```

---

## Hooks

```tsx
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSidebar } from "@/components/SidebarContext";
import { useAIChat } from "@/hooks/useAIChat";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useFloatingVideo } from "@/hooks/useFloatingVideo";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { useObjectDetection } from "@/hooks/useObjectDetection";
```

| Hook | Returns |
|------|---------|
| `useIsMobile` | `boolean` — viewport < 768px |
| `useSidebar` | `{ isCollapsed, toggleSidebar, closeSidebar }` |
| `useAIChat` | Chat state and API methods |
| `useVideoUpload` | Video file handling |
| `useDragAndDrop` | `{ isDragging, dragProps }` |
| `useFloatingVideo` | Floating player state |
| `usePoseDetection` | Pose model and inference |
| `useObjectDetection` | YOLOv8 detection |

---

## Decision Tree

```
Button?
├── Icon only → IconButton (square) or CircularIconButton (round)
├── Primary CTA → buttonStyles.actionButton or .actionButtonSquare
├── Secondary → buttonStyles.actionButtonSquareSecondary
├── Destructive → buttonStyles.actionButtonSquareRed
└── Link → NavigationLink

Input?
├── Boolean → ToggleSwitch
├── Range → RangeSlider
├── Text → TextField.Root
└── Select → Select.Root

Feedback?
├── Loading → LoadingState
├── Error → ErrorDisplay
├── Empty → EmptyState
└── Success → FeedbackToast

Dialog?
├── Destructive → AlertDialog + red button
└── Form → Dialog

Video?
├── Preview → VideoPreview
├── Playback → VideoPoseViewer
└── Progress → ProgressIndicator
```
