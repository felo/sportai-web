# Theming Guide

Your application now has a **powerful, easy-to-use theme system** that makes it simple to:
- Switch between themes instantly
- Add new themes
- Change the entire look of the site
- Maintain consistency across all components

## How It Works

The theme system uses **CSS variables** and **Tailwind CSS** to provide theme-aware colors throughout your application. All Radix UI components automatically inherit these theme colors.

## Available Themes

1. **light** - Default light theme (blue primary)
2. **dark** - Dark theme with blue accents
3. **sport** - Sporty theme with red primary color
4. **ocean** - Ocean theme with cyan primary color
5. **forest** - Forest theme with green primary color

## Quick Start

### Switching Themes Programmatically

```typescript
import { applyTheme } from "@/lib/themes";

// Switch to any theme
applyTheme("sport");  // Changes entire site to sport theme
applyTheme("ocean");  // Changes entire site to ocean theme
applyTheme("dark");   // Changes entire site to dark theme
```

### Using the Theme Switcher Component

Add the `ThemeSwitcher` component anywhere in your app:

```tsx
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

// In your component
<ThemeSwitcher />
```

### Using Theme Colors in Components

Instead of hardcoded colors like `bg-blue-600`, use theme-aware colors:

```tsx
// ❌ Old way (hardcoded)
<div className="bg-blue-600 text-white">...</div>

// ✅ New way (theme-aware)
<div className="bg-primary text-primaryForeground">...</div>
```

## Available Theme Colors

All components can use these semantic color names:

- `bg-background` / `text-foreground` - Main background and text
- `bg-card` / `text-cardForeground` - Card backgrounds
- `bg-primary` / `text-primaryForeground` - Primary brand color
- `bg-secondary` / `text-secondaryForeground` - Secondary color
- `bg-accent` / `text-accentForeground` - Accent/highlight color
- `bg-muted` / `text-mutedForeground` - Muted/subtle backgrounds
- `border-border` - Border color
- `bg-success` / `text-successForeground` - Success states
- `bg-error` / `text-errorForeground` - Error states
- `bg-warning` / `text-warningForeground` - Warning states
- `bg-hover` / `text-hoverForeground` - Hover states
- `bg-overlay` - Modal/dialog overlays
- `bg-tooltip` / `text-tooltipForeground` - Tooltip colors

## Adding a New Theme

1. Open `lib/themes.ts`
2. Add your theme to the `themes` object:

```typescript
export const themes: Record<ThemeName, Theme> = {
  // ... existing themes
  myNewTheme: {
    name: "myNewTheme",
    colors: {
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
      primary: "221.2 83.2% 53.3%",
      // ... define all colors
    },
  },
};
```

3. Add the theme name to the `ThemeName` type:

```typescript
export type ThemeName = "light" | "dark" | "sport" | "ocean" | "forest" | "myNewTheme";
```

4. That's it! The theme is now available throughout your app.

## Migrating Existing Components

To migrate components to use theme colors:

### Before:
```tsx
<div className="bg-blue-600 text-white hover:bg-blue-700">
  <button className="bg-gray-100 text-gray-900">Click me</button>
</div>
```

### After:
```tsx
<div className="bg-primary text-primaryForeground hover:bg-primaryHover">
  <button className="bg-secondary text-secondaryForeground">Click me</button>
</div>
```

## Benefits

✅ **Easy theme switching** - Change entire site appearance with one function call  
✅ **Consistent colors** - All components use the same color system  
✅ **Type-safe** - TypeScript ensures theme names are valid  
✅ **Radix UI compatible** - All Radix components automatically use theme colors  
✅ **Dark mode ready** - Themes work seamlessly with dark mode  
✅ **Future-proof** - Easy to add new themes or modify existing ones  

## Example: Complete Theme Switch

```typescript
// In any component or page
import { applyTheme } from "@/lib/themes";

function MyComponent() {
  const handleThemeChange = (themeName: string) => {
    applyTheme(themeName as ThemeName);
    // Entire site instantly changes theme!
  };

  return (
    <div>
      <button onClick={() => handleThemeChange("sport")}>Sport Theme</button>
      <button onClick={() => handleThemeChange("ocean")}>Ocean Theme</button>
      <button onClick={() => handleThemeChange("forest")}>Forest Theme</button>
    </div>
  );
}
```

## Theme Persistence

Themes are automatically saved to `localStorage` and restored on page load. Users' theme preferences persist across sessions.

## Next Steps

1. Start using theme colors in your components (replace hardcoded colors)
2. Add the `ThemeSwitcher` component to your UI
3. Create custom themes that match your brand
4. Enjoy easy theme switching! 🎨

