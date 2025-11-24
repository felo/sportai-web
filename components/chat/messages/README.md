# Message Components

Message display components for the chat interface, refactored for better maintainability and code organization.

## Structure

```
messages/
├── MessageBubble.tsx        # Main coordinator component
├── MessageList.tsx          # Message list container
├── components/              # Sub-components
│   ├── AssistantMessage.tsx     # Assistant message renderer
│   ├── UserMessage.tsx          # User message with video support
│   ├── ProUpsellBanner.tsx      # PRO membership upsell
│   ├── DeveloperInfo.tsx        # Token usage & metrics
│   ├── ThinkingIndicator.tsx    # Animated thinking dots
│   └── index.ts                 # Component exports
└── utils/                   # Utilities and constants
    ├── proUpsellStorage.ts      # PRO upsell localStorage logic
    ├── thinkingMessages.ts      # Thinking message constants
    └── index.ts                 # Utility exports
```

## Components

### MessageBubble

Main coordinator component that orchestrates all message rendering logic.

**Responsibilities:**
- State management (developer mode, theatre mode, TTS usage)
- Token and pricing calculations
- Video container styling for theatre mode
- Component composition and layout

**Usage:**
```tsx
<MessageBubble
  message={message}
  allMessages={messages}
  messageIndex={index}
  onAskForHelp={handleAskForHelp}
  onUpdateMessage={handleUpdateMessage}
/>
```

### UserMessage

Renders user messages with video/image upload support.

**Features:**
- Video playback with pose detection
- Image display
- Text message rendering
- Theatre mode responsive layout
- Video container styling

**Props:**
```tsx
interface UserMessageProps {
  message: Message;
  videoContainerStyle: React.CSSProperties;
  theatreMode: boolean;
  isMobile: boolean;
}
```

### AssistantMessage

Renders assistant responses with markdown and streaming support.

**Features:**
- Markdown rendering with syntax highlighting
- Streaming indicator during response generation
- Feedback buttons for completed messages
- TTS usage tracking
- Thinking indicator when no content yet

**Props:**
```tsx
interface AssistantMessageProps {
  messageId: string;
  content: string;
  isStreaming?: boolean;
  thinkingMessage: string;
  onAskForHelp?: (termName: string, swing?: any) => void;
  onTTSUsage: (characters: number, cost: number, quality: string) => void;
  onFeedback: () => void;
}
```

### ProUpsellBanner

PRO membership upsell banner shown once per chat after assistant response.

**Features:**
- Fade-in animation
- localStorage tracking to show only once per chat
- Call-to-action button
- Markdown-style divider

### DeveloperInfo

Developer mode information panel showing token usage and performance metrics.

**Features:**
- Token usage (per message and cumulative)
- Cost calculations
- Response time
- TTS usage tracking
- Model settings display

**Props:**
```tsx
interface DeveloperInfoProps {
  show: boolean;
  messageTokens: { input: number; output: number };
  cumulativeTokens: { input: number; output: number };
  messagePricing: Pricing | null;
  cumulativePricing: Pricing | null;
  ttsUsage: TTSUsage;
  totalTTSUsage: { characters: number; cost: number; requests: number };
  responseDuration?: number;
  modelSettings?: ModelSettings;
}
```

### ThinkingIndicator

Animated thinking indicator with pulsing dots.

**Features:**
- Three animated dots
- Custom thinking message
- Smooth pulsing animation

## Utilities

### proUpsellStorage

localStorage utilities for managing PRO upsell display state.

**Functions:**
- `hasShownProUpsell(chatId)` - Check if upsell was shown for a chat
- `markProUpsellShown(chatId)` - Mark upsell as shown (keeps last 100 chat IDs)

### thinkingMessages

Array of thinking messages displayed while AI processes video content.

**Messages:**
- Initializing environment model
- Detecting participants
- Estimating motion paths
- Understanding interaction dynamics
- ...and more

## Refactoring Benefits

### Before (782 lines)
- Single monolithic component
- Mixed concerns (UI, state, logic, utilities)
- Difficult to test and maintain
- Hard to understand component responsibilities

### After (Multiple focused components)
- **MessageBubble** (237 lines) - Coordinator
- **UserMessage** (223 lines) - User content
- **AssistantMessage** (45 lines) - AI responses
- **ProUpsellBanner** (67 lines) - Upsell UI
- **DeveloperInfo** (143 lines) - Debug info
- **ThinkingIndicator** (50 lines) - Loading state
- **Utilities** (67 lines) - Helpers

### Improvements
1. ✅ **Separation of Concerns** - Each component has a single responsibility
2. ✅ **Easier Testing** - Components can be tested in isolation
3. ✅ **Better Maintainability** - Smaller, focused files
4. ✅ **Code Reusability** - Components can be used independently
5. ✅ **Improved Readability** - Clear component hierarchy
6. ✅ **Easier Debugging** - Isolated component logic

## Usage Examples

### Import Components
```tsx
import { MessageBubble } from "@/components/chat/messages/MessageBubble";
import { UserMessage, AssistantMessage } from "@/components/chat/messages/components";
import { THINKING_MESSAGES } from "@/components/chat/messages/utils";
```

### Standalone Assistant Message
```tsx
<AssistantMessage
  messageId="msg-123"
  content={markdownContent}
  isStreaming={false}
  thinkingMessage="Analyzing..."
  onAskForHelp={handleHelp}
  onTTSUsage={trackTTS}
  onFeedback={handleFeedback}
/>
```

### Standalone User Message
```tsx
<UserMessage
  message={userMessage}
  videoContainerStyle={containerStyle}
  theatreMode={true}
  isMobile={false}
/>
```

### Developer Info Panel
```tsx
<DeveloperInfo
  show={showDevInfo}
  messageTokens={{ input: 1000, output: 500 }}
  cumulativeTokens={{ input: 5000, output: 2500 }}
  messagePricing={pricing}
  cumulativePricing={totalPricing}
  ttsUsage={ttsData}
  totalTTSUsage={totalTTS}
  responseDuration={1234}
  modelSettings={{ thinkingMode: "deep", mediaResolution: "high" }}
/>
```

## Design Patterns

### Component Composition
The `MessageBubble` component uses composition to render different message types, delegating specific responsibilities to specialized components.

### Container/Presenter Pattern
- **MessageBubble** (Container) - Manages state and logic
- **UserMessage/AssistantMessage** (Presenters) - Pure UI rendering

### Single Responsibility Principle
Each component has one clear purpose:
- UserMessage renders user content
- AssistantMessage renders AI responses
- ProUpsellBanner shows upgrade prompt
- DeveloperInfo displays debug metrics

## Future Improvements

Potential enhancements:
1. Extract video player logic into separate component
2. Create custom hooks for token calculations
3. Add unit tests for each component
4. Implement component stories for Storybook
5. Add accessibility improvements (ARIA labels, keyboard navigation)
6. Create hooks for PRO upsell logic
7. Add animation utilities

## Testing Strategy

Components are designed for easy testing:

```tsx
// Test UserMessage video rendering
it('renders video with pose detection', () => {
  render(<UserMessage message={videoMessage} {...props} />);
  expect(screen.getByRole('video')).toBeInTheDocument();
});

// Test AssistantMessage markdown
it('renders markdown content', () => {
  render(<AssistantMessage content="# Title" {...props} />);
  expect(screen.getByText('Title')).toBeInTheDocument();
});

// Test ProUpsellBanner visibility
it('shows upsell when show=true', () => {
  render(<ProUpsellBanner show={true} />);
  expect(screen.getByText(/PRO/i)).toBeInTheDocument();
});
```

## Related Components

- `StreamingIndicator` - From `feedback/` folder
- `FeedbackButtons` - From `feedback/` folder
- `VideoPoseViewer` - From `viewers/` folder
- `MarkdownWithSwings` - From `markdown/` folder
- `FeedbackToast` - From `ui/` folder

