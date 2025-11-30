# SportAI Design System — Core

> **For AI agents**: Follow these patterns exactly. For component-specific usage, see `design-components.md`.

---

## Stack

- **UI**: Radix Themes + Radix UI primitives
- **Styling**: Tailwind CSS + CSS Modules (`@/styles/*.module.css`)
- **Icons**: Radix Icons, Lucide React
- **Font**: Poppins via `var(--font-poppins)`

## Theme

```tsx
appearance="dark"  accentColor="mint"  grayColor="gray"  radius="medium"
```

---

## Colors

**ALWAYS use CSS variables. NEVER hardcode hex.**

| Purpose | Variable | Light | Dark |
|---------|----------|-------|------|
| Primary | `var(--mint-9)` | `#025940` | `#7ADB8F` |
| Primary hover | `var(--mint-10)` | `#024530` | `#95E5A6` |
| Muted accent | `var(--mint-a3)` | `rgba(2,89,64,0.15)` | `rgba(122,219,143,0.15)` |
| Background | `var(--gray-1)` | white | `#1C1C1C` |
| Surface | `var(--gray-2)` | `#FAFAFA` | `#252525` |
| Border | `var(--gray-6)` | `#E0E0E0` | `#4A4A4A` |
| Text | `var(--gray-12)` | `#1C1C1C` | `#EEEEEE` |
| Destructive | `var(--red-9)` | `#E54D2E` | `#E54D2E` |

```tsx
<Text color="gray">      // Secondary
<Text color="mint">      // Accent
<Button color="red">     // Destructive
```

---

## Spacing

| Token | Pixels | Usage |
|-------|--------|-------|
| `1` | 4px | Icon-text gap |
| `2` | 8px | Element gap |
| `3` | 12px | Component padding |
| `4` | 16px | Section padding |
| `5` | 24px | Section gap |

```tsx
<Flex gap="2" p="4">
<Box mt="4" px="3">
// CSS: padding: var(--space-4);
```

---

## Border Radius

| Shape | Value |
|-------|-------|
| Standard | `var(--radius-3)` |
| Pill | `9999px` |
| Circle | `50%` |

---

## Buttons

### IconButton (Square)
```tsx
import { IconButton } from "@/components/ui";

<IconButton
  icon={<PlusIcon />}
  onClick={fn}
  variant="ghost"      // ghost | soft | solid | outline
  size="2"             // 1=24px | 2=32px | 3=40px | 4=48px
  color="gray"
  tooltip="Add"
  ariaLabel="Add"      // REQUIRED
/>
```

### CircularIconButton (Round)
```tsx
import { CircularIconButton } from "@/components/ui";

<CircularIconButton
  icon={<PlayIcon size={16} />}
  onClick={fn}
  size="medium"        // small | medium | large
  active={isActive}
  ariaLabel="Play"     // REQUIRED
/>
```

### Action Buttons (CSS Module)
```tsx
import buttonStyles from "@/styles/buttons.module.css";

<Button className={buttonStyles.actionButton}>Start</Button>           // Green pill
<Button className={buttonStyles.actionButtonSquare}>Save</Button>      // Green square
<Button className={buttonStyles.actionButtonSquareSecondary}>Cancel</Button>  // White
<Button className={buttonStyles.actionButtonSquareRed}>Delete</Button> // Red
```

Properties: `font-weight: 600`, `text-transform: uppercase`, `border: 2px solid white`
Hover: `translateY(-2px)` + glow shadow

---

## Dialogs

### Standard Dialog
```tsx
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Content maxWidth="450px">
    <Dialog.Title>Title</Dialog.Title>
    <Dialog.Description size="2" mb="4">Description</Dialog.Description>
    
    <Flex direction="column" gap="3" mt="4">
      {/* content */}
    </Flex>
    
    <Flex gap="3" justify="end" mt="4">
      <Dialog.Close>
        <Button className={buttonStyles.actionButtonSquareSecondary}>Cancel</Button>
      </Dialog.Close>
      <Button className={buttonStyles.actionButtonSquare}>Save</Button>
    </Flex>
  </Dialog.Content>
</Dialog.Root>
```

### AlertDialog (Destructive)
```tsx
<AlertDialog.Root open={open} onOpenChange={setOpen}>
  <AlertDialog.Content maxWidth="450px">
    <AlertDialog.Title>Delete?</AlertDialog.Title>
    <AlertDialog.Description size="2">Cannot be undone.</AlertDialog.Description>
    <Flex gap="3" mt="4" justify="end">
      <AlertDialog.Cancel>
        <Button className={buttonStyles.actionButtonSquareSecondary}>Cancel</Button>
      </AlertDialog.Cancel>
      <AlertDialog.Action>
        <Button className={buttonStyles.actionButtonSquareRed}>Delete</Button>
      </AlertDialog.Action>
    </Flex>
  </AlertDialog.Content>
</AlertDialog.Root>
```

**maxWidth**: `400px` (simple) | `450px` (standard) | `600px` (large)

---

## Cards

```tsx
<Card style={{ border: "1px solid var(--gray-6)" }}>
  <Flex direction="column" gap="3" p="4">
    <Heading size="5" weight="medium">Title</Heading>
    <Text size="2" color="gray">Description</Text>
    <Button className={buttonStyles.actionButton}>Action</Button>
  </Flex>
</Card>
```

Hover: `translateY(-2px)`, `box-shadow: 0 8px 16px rgba(0,0,0,0.1)`, `border-color: var(--accent-9)`

---

## Sidebar

| State | Width |
|-------|-------|
| Collapsed | `64px` |
| Expanded | `280px` |
| Mobile | `100%` |

Structure: Header (57px) → Scrollable content → Footer (border-top)

---

## Typography

| Size | Usage |
|------|-------|
| `1` | Fine print |
| `2` | Body (default) |
| `3` | Emphasized |
| `4` | Mobile headings |
| `5` | Section headings |

```tsx
<Text size="2" color="gray">Body</Text>
<Text size="2" weight="bold" color="mint">Accent</Text>
<Heading size="5" weight="medium">Title</Heading>
```

---

## Animations

```css
transition: all 0.2s ease;              /* Default */
transition: all 0.3s ease-out;          /* Buttons */
transform: translateY(-2px);            /* Lift */
transform: scale(1.1);                  /* Scale */
box-shadow: 0 0 20px rgba(122,219,143,0.6);  /* Glow */
```

---

## Responsive

| Breakpoint | Condition |
|------------|-----------|
| Mobile | `< 768px` |
| Desktop | `≥ 768px` |
| Short | `max-height: 700px` |

```tsx
import { useIsMobile } from "@/hooks/useIsMobile";
const isMobile = useIsMobile();
```

Safe areas:
```css
padding-top: calc(var(--space-4) + env(safe-area-inset-top));
```

---

## Quick Rules

### DO ✓
- Import from `@/components/ui`
- Use `buttonStyles` for action buttons
- Use CSS variables for colors
- Include `ariaLabel` on icon buttons
- Right-align dialog actions
- Use Radix spacing props

### DON'T ✗
- Hardcode hex colors
- Create new button styles
- Left-align dialog actions
- Skip accessibility props
- Mix icon libraries in same component

---

## Imports

```tsx
// UI Components
import { IconButton, CircularIconButton, ToggleSwitch, RangeSlider,
         LoadingState, ErrorDisplay, EmptyState } from "@/components/ui";

// Button styles
import buttonStyles from "@/styles/buttons.module.css";

// Radix
import { Button, Flex, Box, Text, Heading, Card, Dialog, AlertDialog,
         TextField, Select, Switch, Badge, Tooltip } from "@radix-ui/themes";

// Icons
import { PlusIcon, Cross2Icon, CheckIcon } from "@radix-ui/react-icons";
import { Play, Pause, Volume2 } from "lucide-react";

// Hooks
import { useIsMobile } from "@/hooks/useIsMobile";
```

---

## Files

| File | Purpose |
|------|---------|
| `app/globals.css` | Global styles, color overrides |
| `styles/buttons.module.css` | Action button classes |
| `components/ui/` | Reusable UI components |
| `docs/design/design-components.md` | Full component catalog |




