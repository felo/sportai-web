# Theme Color Specification Sheet

This document outlines all the color variables needed to create a new theme for the SportAI app.

---

## 1. Primary/Accent Colors (12-step scale)

These are your brand colors used for buttons, links, interactive elements:

| Variable   | Purpose                      | Green Theme Example |
| ---------- | ---------------------------- | ------------------- |
| `mint-1`   | Darkest background tint      | `#001C0F`           |
| `mint-2`   | Dark background              | `#001C0F`           |
| `mint-3`   | Subtle background            | `#002B1A`           |
| `mint-4`   | UI element background        | `#002B1A`           |
| `mint-5`   | Hovered UI element           | `#025940`           |
| `mint-6`   | Primary borders/interactive  | `#248559`           |
| `mint-7`   | Active borders               | `#248559`           |
| `mint-8`   | Hover state                  | `#2D9B6A`           |
| `mint-9`   | Solid backgrounds (buttons)  | `#248559`           |
| `mint-10`  | Button hover                 | `#2D9B6A`           |
| `mint-11`  | Low-contrast text            | `#ffffff`           |
| `mint-12`  | High-contrast text           | `#ffffff`           |

---

## 2. Gray/Neutral Colors (12-step scale)

Background surfaces, text, and neutral UI elements:

| Variable   | Purpose                | Green Theme Example |
| ---------- | ---------------------- | ------------------- |
| `gray-1`   | App background         | `#001C0F`           |
| `gray-2`   | Subtle background      | `#002B1A`           |
| `gray-3`   | Surface/card background| `#003D26`           |
| `gray-4`   | Hovered surface        | `#004F32`           |
| `gray-5`   | Borders                | `#025940`           |
| `gray-6`   | Subtle borders         | `#03694D`           |
| `gray-7`   | Active borders         | `#04795A`           |
| `gray-8`   | Separator lines        | `#058967`           |
| `gray-9`   | Solid backgrounds      | `#069974`           |
| `gray-10`  | Hovered solid          | `#07A981`           |
| `gray-11`  | Muted/secondary text   | `#A8E6CF`           |
| `gray-12`  | Primary text           | `#ffffff`           |

---

## 3. Semantic Colors

Quick reference colors for common use cases:

| Variable              | Purpose              | Green Theme Example   |
| --------------------- | -------------------- | --------------------- |
| `color-background`    | Main page background | `#001C0F` (gray-1)    |
| `color-surface`       | Cards/panels         | `#003D26` (gray-3)    |
| `color-border`        | Default borders      | `#025940` (gray-5)    |
| `color-accent`        | Primary brand accent | `#248559` (mint-7)    |
| `color-accent-hover`  | Accent hover state   | `#025940` (mint-5)    |
| `color-text`          | Primary text         | `#ffffff` (gray-12)   |
| `color-text-muted`    | Secondary text       | `#A8E6CF` (gray-11)   |

---

## 4. Alpha/Transparency Variants

For overlays, highlights, subtle tints:

| Variable    | Opacity | Green Theme Example           |
| ----------- | ------- | ----------------------------- |
| `mint-a1`   | 5%      | `rgba(36, 133, 89, 0.05)`     |
| `mint-a2`   | 10%     | `rgba(36, 133, 89, 0.1)`      |
| `mint-a3`   | 15%     | `rgba(36, 133, 89, 0.15)`     |
| `mint-a4`   | 20%     | `rgba(36, 133, 89, 0.2)`      |
| `mint-a5`   | 30%     | `rgba(36, 133, 89, 0.3)`      |
| `mint-a6`   | 40%     | `rgba(36, 133, 89, 0.4)`      |
| `mint-a7`   | 50%     | `rgba(36, 133, 89, 0.5)`      |
| `mint-a8`   | 64%     | `rgba(36, 133, 89, 0.64)`     |
| `mint-a9`   | 80%     | `rgba(36, 133, 89, 0.8)`      |
| `mint-a10`  | 90%     | `rgba(36, 133, 89, 0.9)`      |
| `mint-a11`  | 95%     | `rgba(255, 255, 255, 0.95)`   |
| `mint-a12`  | 100%    | `rgba(255, 255, 255, 1)`      |

---

## 5. Additional Accent Colors (hardcoded in markdown)

Used for bullet points, dividers, list markers:

| Usage                | Color Needed                      |
| -------------------- | --------------------------------- |
| Bullet point color   | Primary accent (e.g., `#248559`)  |
| Divider line color   | Accent at 40% opacity             |
| Dropdown highlight   | Accent at 25% opacity             |

---

## Summary for Designer

### Minimum colors needed:

1. **3-4 primary accent colors** (base, hover, active, dark/light variant)
2. **2-3 background colors** (main bg, surface, elevated surface)
3. **2-3 text colors** (primary, muted, on-accent)
4. **1-2 border colors**

### Radix 12-step scale guidelines:

- **Steps 1-2**: Very subtle backgrounds
- **Steps 3-5**: UI element backgrounds/borders
- **Steps 6-8**: Interactive element states
- **Steps 9-10**: Solid colors (buttons)
- **Steps 11-12**: Text colors

### Helpful Tools

- [Radix Colors](https://www.radix-ui.com/colors) - Generate accessible color scales
- [Leonardo](https://leonardocolor.io/) - Create 12-step scales from a base color

