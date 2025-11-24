# UI Components Library

A collection of reusable, consistent UI components for the SportAI application.

## Structure

```
ui/
├── buttons/             # Button components
│   ├── IconButton.tsx           # Square icon-only button
│   ├── CircularIconButton.tsx   # Circular button with hover effects
│   └── PresetButtonGroup.tsx    # Group of preset buttons
├── inputs/              # Form input components
│   ├── ToggleSwitch.tsx         # Toggle switch with label
│   └── RangeSlider.tsx          # Range slider with label and value
├── layout/              # Layout and structural components
│   ├── SettingsSectionHeader.tsx # Section header with toggle
│   └── SettingsSection.tsx       # Section wrapper with border
├── feedback/            # User feedback components
│   ├── LoadingState.tsx         # Loading spinner with message
│   ├── ErrorDisplay.tsx         # Error message display
│   └── EmptyState.tsx           # Empty state message
├── navigation/          # Navigation components
│   └── NavigationLink.tsx       # Link button with icon
├── badges/              # Badge components
│   └── BadgeWithTooltip.tsx     # Badge with hover tooltip
└── index.ts             # Central export file
```

## Usage

Import components from the central index:

```tsx
import { IconButton, ToggleSwitch, RangeSlider } from "@/components/ui";
```

## Components

### Buttons

#### IconButton
Square icon-only button with consistent sizing and optional tooltip.

```tsx
<IconButton
  icon={<PlusIcon />}
  onClick={handleClick}
  tooltip="Add new item"
  ariaLabel="Add item"
  size="2"
/>
```

#### CircularIconButton
Circular button with hover effects, perfect for audio controls or special actions.

```tsx
<CircularIconButton
  icon={<Volume2 size={16} />}
  onClick={handlePlay}
  ariaLabel="Play audio"
  active={isPlaying}
  loading={isLoading}
/>
```

#### PresetButtonGroup
Group of small preset buttons with labels.

```tsx
<PresetButtonGroup
  label="Arms"
  buttons={[
    { key: 'l-arm', label: 'L Arm', onClick: selectLeftArm },
    { key: 'r-arm', label: 'R Arm', onClick: selectRightArm },
  ]}
/>
```

### Inputs

#### ToggleSwitch
Switch with label and optional description.

```tsx
<ToggleSwitch
  checked={showSkeleton}
  onCheckedChange={setShowSkeleton}
  label="Show skeleton"
  description="Display pose skeleton overlay"
  tooltip="Toggle skeleton visibility"
/>
```

#### RangeSlider
Range input with label and value display.

```tsx
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

### Layout

#### SettingsSectionHeader
Header for settings sections with enable/disable toggle.

```tsx
<SettingsSectionHeader
  title="Pose Detection"
  description="Track body movement and skeleton"
  enabled={isPoseEnabled}
  onEnabledChange={setIsPoseEnabled}
/>
```

#### SettingsSection
Wrapper for settings sections with consistent styling.

```tsx
<SettingsSection showBorder pt="3" gap="2">
  <SettingsSectionHeader ... />
  <ToggleSwitch ... />
  <RangeSlider ... />
</SettingsSection>
```

### Feedback

#### LoadingState
Loading spinner with message.

```tsx
<LoadingState message="Loading model..." />
```

#### ErrorDisplay
Error message display.

```tsx
<ErrorDisplay message="Failed to load model" showIcon />
```

#### EmptyState
Empty state message.

```tsx
<EmptyState message="No chats yet" />
```

### Navigation

#### NavigationLink
Link button with icon and text.

```tsx
<NavigationLink
  href="https://sportai.com/platform"
  label="SportAI Platform"
  icon={<GlobeIcon />}
  external
/>
```

### Badges

#### BadgeWithTooltip
Badge with hover tooltip.

```tsx
<BadgeWithTooltip
  text="API version 0.5.58"
  tooltip="Stable v0.5.58 - Last updated 2025-10-01"
  variant="soft"
  color="gray"
  radius="full"
/>
```

## Design Principles

1. **Consistency**: All components follow the same design patterns and use Radix UI primitives
2. **Accessibility**: Components include proper ARIA labels and keyboard support
3. **Flexibility**: Props allow customization while maintaining consistency
4. **TypeScript**: Full type safety with exported interfaces
5. **Documentation**: Each component includes JSDoc comments and examples

## Adding New Components

When adding new components:

1. Create component file in appropriate folder
2. Export component and types from folder index
3. Add to main `ui/index.ts` export
4. Update this README with usage example
5. Ensure TypeScript types are exported
6. Include JSDoc comments with @example

