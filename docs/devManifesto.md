# Development Manifesto

This document contains critical information about the SportAI Web project architecture, conventions, and important rules that must be followed.

## Critical Rules

### 🚫 NEVER Use System Color Scheme Detection

**DO NOT** use any of the following:
- `prefers-color-scheme` media queries
- `color-scheme` CSS property (except `color-scheme: only light` to disable system detection)
- `color-scheme` meta tags
- `window.matchMedia('(prefers-color-scheme: dark)')` for theme detection
- System appearance detection of any kind

**Why?** The app has its own independent theme system. Using system color scheme detection causes:
- macOS/iOS to auto-adjust text colors
- Inconsistent theming between user's choice and system preference
- Text fading/disappearing when system appearance changes

### ✅ Correct Theme Implementation

**DO** use:
- `data-theme="dark"` or `data-theme="light"` HTML attributes
- `data-radix-theme-appearance="dark"` or `data-radix-theme-appearance="light"` attributes
- Tailwind's `dark:` classes (configured to check `data-theme` attribute, not system)
- Radix UI's `appearance` prop on the `Theme` component
- CSS variables from Radix UI (e.g., `var(--gray-12)`, `var(--gray-1)`)

## Theme System Architecture

### Tailwind Configuration

```typescript
// tailwind.config.ts
darkMode: ['class', '[data-theme="dark"]']
```

This makes Tailwind's `dark:` classes check the `data-theme` attribute instead of `prefers-color-scheme`.

### Theme Provider

- Located in: `components/RadixThemeProvider.tsx`
- Wraps entire app in Radix UI's `Theme` component
- Reads theme from localStorage (`radix-theme` key)
- Sets HTML attributes (`data-theme` and `data-radix-theme-appearance`)
- Updates meta tags (`theme-color` only, NOT `color-scheme`)
- Defaults to dark mode if no preference is stored

### Theme Switching

- Located in: `components/Sidebar.tsx`
- Settings menu (cog icon) → Themes → Light/Dark
- Saves to localStorage and dispatches `theme-change` event
- Event is picked up by `RadixThemeProvider` to update the app

### CSS Variables

**Dark Mode:**
- Custom gray scale: `--gray-1` through `--gray-12` (dark backgrounds)
- Background: `--gray-1` (#1C1C1C)
- Text uses Radix UI's default dark mode text colors

**Light Mode:**
- Uses Radix UI's default light mode colors
- Background: `--color-background` (white)
- Text uses Radix UI's default light mode text colors

**Brand Colors:**
- Mint scale: `--mint-1` through `--mint-12`
- Light mode primary: `--mint-6` (#025940 - Dark Green)
- Dark mode primary: `--mint-6` (#7ADB8F - Light Green)
- These colors automatically adapt based on the theme for optimal contrast

## Component Styling Rules

### UI Component Development

**ALWAYS use Radix UI components for building UI:**

- ✅ Use `@radix-ui/themes` components: `Card`, `Button`, `Flex`, `Text`, `Heading`, `Dialog`, etc.
- ✅ Leverage Radix UI's built-in theming system with color props
- ✅ Take advantage of Radix UI's accessibility features
- ✅ Use Radix UI's responsive props and layout primitives
- ❌ Don't create custom buttons, cards, or layout components from scratch
- ❌ Don't use generic HTML elements when a Radix component exists

**Why?** Radix UI provides:
- Consistent design system integration
- Built-in dark/light theme support
- Automatic accessibility (ARIA attributes, keyboard navigation)
- Responsive utilities and layout primitives
- Lower maintenance burden

### Markdown Components

- Located in: `components/markdown/markdown-components.tsx`
- Use Tailwind classes with `dark:` prefix
- Classes like `text-gray-900 dark:text-gray-100` work because Tailwind checks `data-theme`
- DO NOT use inline styles that hardcode colors

### Message Bubbles

- Located in: `components/chat/MessageBubble.tsx`
- User messages: Use `color: "var(--gray-12)"` for text
- Assistant messages: Use `className="prose dark:prose-invert"` for markdown
- Video backgrounds: Use `var(--gray-3)`
- Borders: Use `var(--mint-6)` for user message borders

### General Components

- Prefer Radix UI color props: `color="gray"`, `color="red"`, etc.
- Use CSS variables for custom styling: `var(--gray-1)`, `var(--mint-6)`, etc.
- Use Tailwind classes with `dark:` prefix for conditional styling
- Let Radix UI handle text colors automatically when possible

## 🎨 Centralized Styling Overrides

**ALL custom styling overrides MUST be placed in `app/globals.css`**

This is the single source of truth for all theme customizations, brand colors, and component style overrides. This approach ensures:
- Easy discoverability of all customizations
- Consistent styling across the entire app
- Simple maintenance and updates
- Clear separation between defaults and custom overrides

### What Goes in globals.css

1. **Brand Color Overrides** (lines ~21-128)
   - Custom mint/green color palette for both light and dark modes
   - Overrides Radix UI's default colors with brand colors
   - Includes both solid colors and alpha variants

2. **Select Component Overrides** (lines ~186-206)
   - `.select-no-border` class for borderless select dropdowns
   - Used in chat input controls

3. **Action Button Styling** (lines ~208-244)
   - `.action-button` class for prominent green pill-shaped buttons
   - Enhanced glow effects on hover
   - Separate styling for destructive actions (red buttons)

### Action Button System

**Use the opt-in `.action-button` class for primary action buttons only.**

```tsx
// ✅ Correct - Primary action that needs prominence
<Button className="action-button" onClick={handleSubmit}>
  Start
</Button>

// ❌ Incorrect - Navigation buttons should not use this class
<Button variant="ghost" onClick={toggleSidebar}>
  Menu
</Button>
```

**When to use `.action-button`:**
- Primary call-to-action buttons (Start, Submit, Save, Confirm)
- Buttons that initiate important workflows
- Standalone action buttons on cards

**When NOT to use `.action-button`:**
- Navigation buttons (sidebar items, menu toggles)
- Secondary/tertiary actions (Cancel, Close)
- Icon-only buttons
- List item buttons
- Settings menu items

**Effect Details:**
- Full rounded pill shape (border-radius: 9999px)
- Green background (#7ADB8F) with dark text (#1C1C1C)
- Subtle glow at rest
- Enhanced multi-layer glow on hover
- 2px lift animation on hover
- Automatic color adaptation for destructive actions (red)

## Storage & State

### localStorage Keys

- `radix-theme` — Stores theme settings (appearance, accentColor, grayColor)
- `sportai-chats` — Stores all chat conversations
- `sportai-current-chat-id` — Currently active chat ID
- `sportai-developer-mode` — Developer mode toggle state

### Theme Storage Format

```typescript
{
  appearance: "dark" | "light",
  accentColor: "mint" | "blue" | "red" | ...,
  grayColor: "gray" | "mauve" | "slate" | ...
}
```

## Important Files

- **`app/globals.css`** — 🎨 **CENTRAL LOCATION FOR ALL STYLE OVERRIDES** — Brand colors, custom component styling, theme overrides
- `app/layout.tsx` — Root layout, sets up RadixThemeProvider and initial theme script
- `components/RadixThemeProvider.tsx` — Theme provider, manages theme state
- `components/Sidebar.tsx` — Contains theme switcher in settings menu
- `tailwind.config.ts` — Tailwind configuration with custom dark mode selector
- `components/markdown/markdown-components.tsx` — Markdown styling

## CSS Override Patterns

**All CSS overrides should be added to `app/globals.css` only.**

### Brand Color Overrides

```css
/* Override Radix UI mint colors with brand colors */
.radix-themes {
  --mint-6: #025940 !important; /* Dark Green for light mode */
  --mint-9: #025940 !important;
  /* ... other mint scale overrides */
}

/* Dark mode uses light green for contrast */
html[data-theme="dark"] .radix-themes {
  --mint-6: #7ADB8F !important; /* Light Green */
  --mint-9: #7ADB8F !important;
  /* ... other mint scale overrides */
}
```

### Action Button Pattern

```css
/* Opt-in class for primary action buttons */
button.action-button {
  border-radius: 9999px !important;
  background-color: #7ADB8F !important;
  color: #1C1C1C !important;
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.1),
    0 0 10px rgba(122, 219, 143, 0.2) !important;
}

button.action-button:hover:not([disabled]) {
  background-color: #95E5A6 !important;
  transform: translateY(-2px);
  box-shadow: 
    0 0 20px rgba(122, 219, 143, 0.6),
    0 0 40px rgba(122, 219, 143, 0.4),
    0 4px 16px rgba(122, 219, 143, 0.5) !important;
}
```

### Theme-Specific Selectors

```css
/* Target dark mode specifically */
html[data-theme="dark"] .some-element {
  /* dark mode styles */
}

/* Alternative dark mode selector for Radix components */
[data-radix-theme][data-radix-theme-appearance="dark"] {
  /* dark mode styles */
}

/* Light mode */
html[data-theme="light"] .some-element {
  /* light mode styles */
}
```

## Developer Mode

- Toggle in Settings menu
- Shows token usage, response times, and model settings
- Useful for debugging and monitoring API costs
- Persisted in localStorage

## Mobile Considerations

- Sidebar is hidden on mobile (uses `useIsMobile` hook)
- CSS includes mobile-specific overscroll behavior fixes
- Prevents white background flash on iOS overscroll

## Common Pitfalls

1. ❌ **Don't** add `color-scheme` meta tags or CSS property
2. ❌ **Don't** listen to `prefers-color-scheme` media query changes
3. ❌ **Don't** use system appearance detection
4. ❌ **Don't** hardcode text colors in inline styles (use CSS variables)
5. ❌ **Don't** create custom UI components when Radix UI components exist
6. ❌ **Don't** add custom CSS overrides outside of `app/globals.css`
7. ❌ **Don't** use `.action-button` class on navigation or utility buttons
8. ✅ **Do** use `data-theme` attributes for theme detection
9. ✅ **Do** use Radix UI color variables (`var(--gray-12)`, etc.)
10. ✅ **Do** use Tailwind `dark:` classes (they check `data-theme`)
11. ✅ **Do** let Radix UI handle text colors automatically
12. ✅ **Do** use Radix UI components from `@radix-ui/themes` for all UI elements
13. ✅ **Do** put all custom styling overrides in `app/globals.css`
14. ✅ **Do** use `.action-button` class only for primary action buttons

## Testing Theme Changes

1. Open browser DevTools
2. Check localStorage for `radix-theme` value
3. Verify HTML element has correct `data-theme` attribute
4. Toggle theme in Settings → Themes
5. Verify both light and dark modes work correctly
6. Test on both desktop and mobile/iOS

## When Adding New Components

- **ALWAYS** use Radix UI components (`@radix-ui/themes`) as the foundation
- Use Radix UI color props (e.g., `color="gray"`) for consistency
- Use CSS variables for custom colors (e.g., `var(--mint-6)`)
- Add `dark:` Tailwind classes for theme-aware styling
- Don't hardcode colors — use theme variables
- Leverage Radix UI's layout primitives: `Flex`, `Grid`, `Container`, `Section`, `Box`
- Use Radix UI's typography components: `Text`, `Heading`, `Code`, `Em`, `Strong`
- For interactive elements, use: `Button`, `IconButton`, `Link`, `Card` (with `asChild` when needed)
- If you need custom styling overrides, add them to `app/globals.css` ONLY
- For primary action buttons, add the `className="action-button"` prop

## When Debugging Theme Issues

1. Check HTML element's `data-theme` attribute
2. Check `[data-radix-theme]` element's `data-radix-theme-appearance` attribute
3. Inspect localStorage `radix-theme` value
4. Look for hardcoded colors that should use variables
5. Check if Tailwind classes have `dark:` variants
6. Ensure no `color-scheme` CSS or meta tags exist
7. Verify Tailwind config uses `data-theme` for dark mode detection

## Dependencies

- **Radix UI Themes** — Theme system and components
- **Tailwind CSS** — Utility-first styling
- **React Markdown** — Markdown rendering with custom components
- **AWS SDK** — S3 video storage
- **Google Generative AI** — Gemini API integration

## API Routes

- `/api/gemini` — Streaming Gemini API responses
- `/api/s3/upload-url` — Generate S3 upload URLs
- `/api/s3/download-url` — Generate S3 download URLs

---

## Custom Components Library

The SportAI Web project has a collection of reusable components. **Always check these before creating new components.**

### Quick Reference: Import Paths

```tsx
// UI Components
import { IconButton, ToggleSwitch, RangeSlider, LoadingState, ErrorDisplay, EmptyState } from "@/components/ui";

// Chat Components  
import { MessageList, ChatInput, VideoPoseViewer, ScrollToBottom, ChatHeader } from "@/components/chat";

// Sidebar Components
import { Sidebar, ChatList, ChatListItem, NewChatButton } from "@/components/sidebar";

// Markdown Components
import { MarkdownWithSwings, SwingExplanationModal, MetricConversionModal, SectionSpeaker } from "@/components/markdown";

// Auth Components
import { AuthModal } from "@/components/auth/AuthModal";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/components/auth/AuthProvider";
```

---

### UI Components (`@/components/ui`)

#### Buttons

##### IconButton
Square icon-only button with consistent sizing and optional tooltip.

```tsx
import { IconButton } from "@/components/ui";

<IconButton
  icon={<PlusIcon />}
  onClick={handleClick}
  tooltip="Add new item"
  ariaLabel="Add item"
  variant="ghost"        // "ghost" | "soft" | "solid" | "outline" | "surface"
  size="2"               // "1" | "2" | "3" | "4"
  color="gray"           // "gray" | "red" | "blue" | "green" | "mint"
  disabled={false}
/>
```

##### CircularIconButton
Circular button with hover effects, perfect for audio controls or special actions.

```tsx
import { CircularIconButton } from "@/components/ui";

<CircularIconButton
  icon={<Volume2 size={16} />}
  onClick={handlePlay}
  ariaLabel="Play audio"
  active={isPlaying}
  loading={isLoading}
/>
```

##### PresetButtonGroup
Group of small preset buttons with labels.

```tsx
import { PresetButtonGroup } from "@/components/ui";

<PresetButtonGroup
  label="Arms"
  buttons={[
    { key: 'l-arm', label: 'L Arm', onClick: selectLeftArm },
    { key: 'r-arm', label: 'R Arm', onClick: selectRightArm },
  ]}
/>
```

#### Inputs

##### ToggleSwitch
Switch with label, optional description, tooltip, and status indicator.

```tsx
import { ToggleSwitch } from "@/components/ui";

<ToggleSwitch
  checked={showSkeleton}
  onCheckedChange={setShowSkeleton}
  label="Show skeleton"
  description="Display pose skeleton overlay"
  tooltip="Toggle skeleton visibility"
  size="2"               // "1" | "2" | "3"
  labelSize="2"          // "1" | "2" | "3"
  labelColor="gray"      // "gray" | "mint" | "red" | "blue" | "green"
  showStatus={true}      // Shows "• Active" when checked
  statusText="• Active"  // Custom status text
/>
```

##### RangeSlider
Range input with label and value display.

```tsx
import { RangeSlider } from "@/components/ui";

<RangeSlider
  value={maxPoses}
  onChange={setMaxPoses}
  min={1}
  max={6}
  label="Detect players"
  formatValue={(v) => `${v} ${v === 1 ? 'player' : 'players'}`}
  description="Single player mode"
/>
```

#### Layout

##### SettingsSectionHeader
Header for settings sections with enable/disable toggle.

```tsx
import { SettingsSectionHeader } from "@/components/ui";

<SettingsSectionHeader
  title="Pose Detection"
  description="Track body movement and skeleton"
  enabled={isPoseEnabled}
  onEnabledChange={setIsPoseEnabled}
/>
```

##### SettingsSection
Wrapper for settings sections with consistent styling.

```tsx
import { SettingsSection } from "@/components/ui";

<SettingsSection showBorder pt="3" gap="2">
  <SettingsSectionHeader ... />
  <ToggleSwitch ... />
  <RangeSlider ... />
</SettingsSection>
```

#### Feedback

##### LoadingState
Loading spinner with message.

```tsx
import { LoadingState } from "@/components/ui";

<LoadingState 
  message="Loading model..." 
  size="2"       // "1" | "2" | "3"
  gap="2"        // "1" | "2" | "3" | "4"
/>
```

##### ErrorDisplay
Error message display.

```tsx
import { ErrorDisplay } from "@/components/ui";

<ErrorDisplay message="Failed to load model" showIcon />
```

##### EmptyState
Empty state message.

```tsx
import { EmptyState } from "@/components/ui";

<EmptyState message="No chats yet" />
```

##### ErrorToast
Error toast notification (auto-shows when error is set).

```tsx
import { ErrorToast } from "@/components/ui";

<ErrorToast 
  error={errorMessage}           // Shows toast when not null
  onOpenChange={(open) => { }}   // Called when toast closes
/>
```

##### FeedbackToast
Thank you feedback toast.

```tsx
import { FeedbackToast } from "@/components/ui";

<FeedbackToast 
  open={showFeedbackToast}
  onOpenChange={setShowFeedbackToast}
/>
```

#### Navigation

##### NavigationLink
Link button with icon and text.

```tsx
import { NavigationLink } from "@/components/ui";

<NavigationLink
  href="https://sportai.com/platform"
  label="SportAI Platform"
  icon={<GlobeIcon />}
  external              // Opens in new tab
/>
```

#### Badges

##### BadgeWithTooltip
Badge with hover tooltip.

```tsx
import { BadgeWithTooltip } from "@/components/ui";

<BadgeWithTooltip
  text="API version 0.5.58"
  tooltip="Stable v0.5.58 - Last updated 2025-10-01"
  variant="soft"
  color="gray"
  radius="full"
/>
```

---

### Chat Components (`@/components/chat`)

#### Messages

##### MessageList
Displays a scrollable list of chat messages with loading states.

```tsx
import { MessageList } from "@/components/chat";

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

##### MessageBubble
Individual message component with support for text, video, and pose detection.

```tsx
import { MessageBubble } from "@/components/chat";

<MessageBubble
  message={message}
  allMessages={messages}
  messageIndex={index}
  onAskForHelp={handleAskForHelp}
  onUpdateMessage={handleUpdateMessage}
/>
```

#### Input

##### ChatInput
Main chat input with video upload, settings, and send functionality.

```tsx
import { ChatInput } from "@/components/chat";

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

##### AudioStopButton
Button to stop audio playback.

```tsx
import { AudioStopButton } from "@/components/chat";

<AudioStopButton onClick={stopAudio} isVisible={isPlaying} />
```

#### Viewers

##### VideoPoseViewer
Lazy-loaded video player with pose detection, object detection, and projectile tracking.

```tsx
import { VideoPoseViewer } from "@/components/chat";

<VideoPoseViewer
  videoUrl={videoUrl}
  width={640}
  height={480}
  initialModel="movenet-multipose"
  initialShowSkeleton={true}
  initialPoseEnabled={true}
/>
```

##### VideoPreview
Preview uploaded video before sending.

```tsx
import { VideoPreview } from "@/components/chat";

<VideoPreview
  videoUrl={videoPreview}
  fileName={fileName}
  onRemove={handleRemove}
/>
```

##### SAM2Viewer
Segment Anything Model 2 viewer for video segmentation.

```tsx
import { SAM2Viewer } from "@/components/chat/viewers/SAM2Viewer";

<SAM2Viewer videoUrl={videoUrl} width={640} height={480} />
```

##### Pose3DViewer
3D visualization of pose detection results using Three.js.

```tsx
import { Pose3DViewer } from "@/components/chat/viewers/Pose3DViewer";

<Pose3DViewer pose={poseData} width={640} height={480} showFace={true} />
```

#### Feedback

##### FeedbackButtons
Thumbs up/down feedback buttons for messages.

```tsx
import { FeedbackButtons } from "@/components/chat";

<FeedbackButtons
  messageId={messageId}
  currentFeedback={feedback}
  onFeedback={handleFeedback}
/>
```

##### StreamingIndicator
Animated indicator shown during streaming responses.

```tsx
import { StreamingIndicator } from "@/components/chat";

<StreamingIndicator />
```

##### ProgressIndicator
Shows upload and processing progress with stages.

```tsx
import { ProgressIndicator } from "@/components/chat";

<ProgressIndicator
  progressStage="uploading"    // "uploading" | "processing" | "analyzing"
  uploadProgress={75}
  hasVideo={true}
/>
```

#### Navigation

##### ScrollToBottom
Button to scroll to the bottom of the chat.

```tsx
import { ScrollToBottom } from "@/components/chat";

<ScrollToBottom messagesEndRef={messagesEndRef} isVisible={!isAtBottom} />
```

##### ScrollToVideo
Scrolls to video content in chat messages.

```tsx
import { ScrollToVideo } from "@/components/chat";

<ScrollToVideo videoMessageId={videoMessageId} onScrollComplete={handleScrollComplete} />
```

#### Overlays

##### DragOverlay
Overlay shown during drag-and-drop operations.

```tsx
import { DragOverlay } from "@/components/chat";

<DragOverlay isDragging={isDragging} onDrop={handleDrop} />
```

#### Header

##### ChatHeader
Chat header with title, actions, and sidebar toggle.

```tsx
import { ChatHeader } from "@/components/chat";

<ChatHeader
  onNewChat={handleNewChat}
  onToggleSidebar={toggleSidebar}
  isSidebarOpen={isSidebarOpen}
/>
```

---

### Sidebar Components (`@/components/sidebar`)

##### Sidebar
Main sidebar component with chat list, settings, and navigation.

```tsx
import { Sidebar } from "@/components/sidebar";

<Sidebar
  chats={chats}
  currentChatId={currentChatId}
  onSelectChat={handleSelectChat}
  onNewChat={handleNewChat}
  onDeleteChat={handleDeleteChat}
  onRenameChat={handleRenameChat}
/>
```

##### ChatList
List of chat conversations.

```tsx
import { ChatList } from "@/components/sidebar";

<ChatList
  chats={chats}
  currentChatId={currentChatId}
  onSelectChat={handleSelectChat}
/>
```

##### ChatListItem
Individual chat item in the list.

```tsx
import { ChatListItem } from "@/components/sidebar";

<ChatListItem
  chat={chat}
  isSelected={isSelected}
  onSelect={handleSelect}
  onDelete={handleDelete}
  onRename={handleRename}
/>
```

##### NewChatButton
Button to create a new chat.

```tsx
import { NewChatButton } from "@/components/sidebar";

<NewChatButton onClick={handleNewChat} />
```

---

### Markdown Components (`@/components/markdown`)

##### MarkdownWithSwings
Renders markdown with interactive swing terminology links and section speakers.

```tsx
import { MarkdownWithSwings } from "@/components/markdown";

<MarkdownWithSwings 
  content={markdownContent}
  onSwingClick={handleSwingClick}
/>
```

##### SwingExplanationModal
Modal that explains swing terminology (forehand, backhand, serve, etc.).

```tsx
import { SwingExplanationModal } from "@/components/markdown";

<SwingExplanationModal
  isOpen={isOpen}
  onClose={handleClose}
  swingType="forehand"
  sport="tennis"
/>
```

##### MetricConversionModal
Modal for converting between metric and imperial units.

```tsx
import { MetricConversionModal, convertMetric } from "@/components/markdown";

<MetricConversionModal
  isOpen={isOpen}
  onClose={handleClose}
  value={100}
  unit="km/h"
/>
```

##### SectionSpeaker
Text-to-speech button for reading sections aloud.

```tsx
import { SectionSpeaker } from "@/components/markdown";

<SectionSpeaker text={sectionText} />
```

---

### Auth Components (`@/components/auth`)

##### AuthModal
Sign-in modal with Google and Apple OAuth.

```tsx
import { AuthModal } from "@/components/auth/AuthModal";

<AuthModal open={isOpen} onOpenChange={setIsOpen} />
```

##### UserMenu
User dropdown menu with settings, theme toggle, and sign out.

```tsx
import { UserMenu } from "@/components/auth/UserMenu";

<UserMenu
  appearance="dark"
  theatreMode={true}
  developerMode={false}
  onThemeSelect={(theme) => setTheme(theme)}
  onTheatreModeToggle={(enabled) => setTheatreMode(enabled)}
  onDeveloperModeToggle={(enabled) => setDeveloperMode(enabled)}
  onClearChat={handleClearChat}
/>
```

##### useAuth Hook
Access authentication state and methods.

```tsx
import { useAuth } from "@/components/auth/AuthProvider";

const { user, profile, loading, signOut } = useAuth();
```

---

### Other Components

##### StarterPrompts
Landing page with demo prompt cards.

```tsx
import { StarterPrompts } from "@/components/StarterPrompts";

<StarterPrompts
  onPromptSelect={(prompt, videoUrl, settings) => {
    // Handle prompt selection with optional settings
    // settings?: { thinkingMode, mediaResolution, domainExpertise, playbackSpeed, poseSettings }
  }}
/>
```

---

### VideoPoseViewer Sub-Components

The `videoPoseViewer` module in `@/components/chat/viewers/videoPoseViewer/` has its own set of reusable components:

#### Components (`videoPoseViewer/components`)
- `PoseSettingsPanel` - Configure pose detection settings
- `ObjectDetectionSettingsPanel` - Configure object detection
- `ProjectileDetectionSettingsPanel` - Configure ball tracking
- `PlaybackControls` - Video playback controls with speed/seek
- `VelocityDisplay` - Display velocity measurements
- `CollapsibleSection` - Collapsible settings sections
- `DescriptiveSelect` - Select dropdown with descriptions
- `AnglePresetButton` - Quick angle measurement presets

#### Hooks (`videoPoseViewer/hooks`)

```tsx
import { 
  usePoseSettings,
  useDetectionSettings,
  useDetectionState,
  useVideoPlayback,
  useVideoDimensions,
  useVideoFPS,
  useVelocityTracking,
  useJointTrajectories,
  useAngleMeasurement
} from "@/components/chat/viewers/videoPoseViewer/hooks";
```

---

**Last Updated:** November 25, 2025
**Version:** 1.2

## Changelog

### v1.2 (November 25, 2025)
- Added comprehensive Custom Components Library documentation
- Documented all UI components with props and examples
- Documented all Chat components with props and examples
- Documented Sidebar, Markdown, and Auth components
- Added quick reference import paths for LLM prompting
- Added VideoPoseViewer sub-components and hooks reference

### v1.1 (November 21, 2025)
- Added centralized styling overrides documentation
- Documented `.action-button` class system for primary action buttons
- Updated brand color documentation with light/dark mode specifics
- Emphasized `app/globals.css` as the single source of truth for all style overrides
- Added CSS override patterns for action buttons
- Updated common pitfalls with styling best practices

### v1.0 (November 20, 2024)
- Initial documentation
- Theme system architecture
- Component styling rules
- Storage and state management

