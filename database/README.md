# SportAI Database

This folder contains structured data for various sports, techniques, terminology, and analytics.

## Structure

```
database/
├── types.ts              # Shared TypeScript interfaces
├── index.ts              # Main export file - combines all data
├── README.md             # This documentation
├── shared/               # Common to multiple sports
│   ├── swings.ts         # Common techniques
│   └── terminology.ts    # Shared terms
├── tennis/               # Tennis-specific data
│   ├── swings.ts         # Tennis techniques
│   ├── terminology.ts    # Tennis terms
│   └── courts.ts         # Tennis court surfaces
├── pickleball/           # Pickleball-specific data
│   ├── swings.ts         # Pickleball techniques
│   ├── terminology.ts    # Pickleball terms
│   └── courts.ts         # Pickleball court types
└── padel/                # Padel-specific data
    ├── swings.ts         # Padel techniques
    ├── terminology.ts    # Padel terms
    └── courts.ts         # Padel court types
```

## Usage

```typescript
// Import all terms (swings + terminology + courts combined)
import { swingExplanations } from "@/database";

// Import specific sport swings
import { tennisSwings, pickleballSwings, padelSwings, sharedSwings } from "@/database";

// Import specific sport terminology
import { tennisTerminology, pickleballTerminology, padelTerminology, sharedTerminology } from "@/database";

// Import specific sport courts
import { tennisCourts, pickleballCourts, padelCourts } from "@/database";

// Import types
import type { SwingExplanation } from "@/database";
```

**Note**: `swingExplanations` contains swings, terminology, AND court types for automatic detection in markdown.

## Adding New Data

### Adding a New Swing or Term

1. Determine if it's sport-specific or shared across sports
2. Choose the appropriate category:
   - **Swings**: Add to `{sport}/swings.ts`
   - **Terminology**: Add to `{sport}/terminology.ts`
3. Follow the `SwingExplanation` interface structure
4. Use lowercase keys for automatic detection in markdown
5. For multi-word terms, use hyphens or spaces (both work)

Example:
```typescript
"your-term-name": {
  name: "Display Name",
  sport: "Pickleball",
  description: "A clear, concise description...",
  keyPoints: [
    "Key point 1",
    "Key point 2",
    "Key point 3",
    "Key point 4"
  ]
}
```

**Multi-word terms**: Use the exact phrase as it appears in text
- `"non-volley zone"` or `"nvz"` for abbreviations
- `"third shot drop"` for compound terms
- `"drop shot"` for two-word techniques

### Adding New Data Types

As the database grows, you can add new folders and files:
- `tactics/` - Tactical patterns and strategies
- `formations/` - Court positioning and formations
- `drills/` - Training drills and exercises
- `rules/` - Sport-specific rules and regulations

## Current Content

### Techniques (Swings)
- **Shared**: 10 common swings (forehand, backhand, serve, volley, etc.)
- **Tennis**: 1 technique (ATP)
- **Pickleball**: 2 techniques (dink, erne)
- **Padel**: 5 techniques (bandeja, víbora, chiquita, bajada, remate)

### Techniques (Swings)
- **Shared**: 12 common techniques (forehand, backhand, serve, volley, split step, flat, etc.)
- **Tennis**: 1 technique (ATP)
- **Pickleball**: 3 techniques (dink, erne, third shot drive)
- **Padel**: 5 techniques (bandeja, víbora, chiquita, bajada, remate)

### Technical Analysis
- **Shared**: 10 terms (trophy position, contact point, follow through, backswing, unit turn, sweet spot, ready position, grip, stroke mechanics, weight transfer)

### Terminology
- **Shared**: 5 common terms (baseline, rally, cross-court, down the line, mishit)
- **Tennis**: 4 terms (deuce, advantage, ace, let serve)
- **Pickleball**: 6 terms (kitchen, NVZ, two-bounce rule, third shot drop, side-out)
- **Padel**: 5 terms (golden rule, glass, por 3, contrapared, fence)

### Court Types
- **Tennis**: 7 surfaces (hard court, clay court, grass court, carpet court, red clay, green clay, acrylic court)
- **Pickleball**: 4 types (indoor court, outdoor court, dedicated court, converted court)
- **Padel**: 5 types (indoor court, outdoor court, panoramic court, single glass court, artificial turf)

**Total**: 67 interactive glossary entries + clickable metric conversions

