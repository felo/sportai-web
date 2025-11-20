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
- Primary brand color: `--mint-6` (#74BC9C)

## Component Styling Rules

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

- `app/layout.tsx` — Root layout, sets up RadixThemeProvider and initial theme script
- `app/globals.css` — Global styles, theme-specific CSS variables and overrides
- `components/RadixThemeProvider.tsx` — Theme provider, manages theme state
- `components/Sidebar.tsx` — Contains theme switcher in settings menu
- `tailwind.config.ts` — Tailwind configuration with custom dark mode selector
- `components/markdown/markdown-components.tsx` — Markdown styling

## CSS Override Patterns

### Background Colors

```css
/* Dark mode */
html[data-theme="dark"] body {
  background-color: var(--gray-1, #1C1C1C) !important;
}

/* Light mode */
html[data-theme="light"] body {
  background-color: var(--color-background, #ffffff) !important;
}
```

### Radix Theme Wrapper

```css
[data-radix-theme][data-radix-theme-appearance="dark"] {
  background-color: var(--gray-1) !important;
}

[data-radix-theme][data-radix-theme-appearance="light"] {
  background-color: var(--color-background, #ffffff) !important;
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
5. ✅ **Do** use `data-theme` attributes for theme detection
6. ✅ **Do** use Radix UI color variables (`var(--gray-12)`, etc.)
7. ✅ **Do** use Tailwind `dark:` classes (they check `data-theme`)
8. ✅ **Do** let Radix UI handle text colors automatically

## Testing Theme Changes

1. Open browser DevTools
2. Check localStorage for `radix-theme` value
3. Verify HTML element has correct `data-theme` attribute
4. Toggle theme in Settings → Themes
5. Verify both light and dark modes work correctly
6. Test on both desktop and mobile/iOS

## When Adding New Components

- Use Radix UI components when possible
- Use Radix UI color props (e.g., `color="gray"`) for consistency
- Use CSS variables for custom colors (e.g., `var(--mint-6)`)
- Add `dark:` Tailwind classes for theme-aware styling
- Don't hardcode colors — use theme variables

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

**Last Updated:** November 20, 2024
**Version:** 1.0

