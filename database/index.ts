// Export types
export type { SwingExplanation } from "./types";

// Import all swing databases
import { sharedSwings } from "./shared/swings";
import { tennisSwings } from "./tennis/swings";
import { pickleballSwings } from "./pickleball/swings";
import { padelSwings } from "./padel/swings";

// Import all terminology databases
import { sharedTerminology } from "./shared/terminology";
import { tennisTerminology } from "./tennis/terminology";
import { pickleballTerminology } from "./pickleball/terminology";
import { padelTerminology } from "./padel/terminology";

// Import technique analysis terms
import { sharedTechnique } from "./shared/technique";

// Import all court databases
import { tennisCourts } from "./tennis/courts";
import { pickleballCourts } from "./pickleball/courts";
import { padelCourts } from "./padel/courts";

// Combine all databases into a single glossary for automatic detection
export const swingExplanations = {
  ...sharedSwings,
  ...tennisSwings,
  ...pickleballSwings,
  ...padelSwings,
  ...sharedTerminology,
  ...tennisTerminology,
  ...pickleballTerminology,
  ...padelTerminology,
  ...sharedTechnique,
  ...tennisCourts,
  ...pickleballCourts,
  ...padelCourts,
};

// Export individual databases for filtered access if needed
export { sharedSwings } from "./shared/swings";
export { tennisSwings } from "./tennis/swings";
export { pickleballSwings } from "./pickleball/swings";
export { padelSwings } from "./padel/swings";

export { sharedTerminology } from "./shared/terminology";
export { tennisTerminology } from "./tennis/terminology";
export { pickleballTerminology } from "./pickleball/terminology";
export { padelTerminology } from "./padel/terminology";

export { sharedTechnique } from "./shared/technique";

export { tennisCourts } from "./tennis/courts";
export { pickleballCourts } from "./pickleball/courts";
export { padelCourts } from "./padel/courts";

