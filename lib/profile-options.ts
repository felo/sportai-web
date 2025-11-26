/**
 * Profile Options
 * Centralized data for profile form dropdowns, labels, and helper text
 */

import type {
  Sport,
  RacketSport,
  Gender,
  Handedness,
  SkillLevel,
  YearsPlaying,
  CoachingLevel,
  EmploymentType,
  ClientCount,
  CompanySize,
  CoachSpecialty,
  BusinessType,
  BusinessRole,
  BusinessUseCase,
  ReferralSource,
  TennisPlayingStyle,
  TennisSurface,
  TennisGoal,
  TennisCertification,
  PadelPlayingStyle,
  PadelSurface,
  PadelGoal,
  PadelCertification,
  PickleballPlayingStyle,
  PickleballSurface,
  PickleballGoal,
  PickleballCertification,
  TennisEquipmentType,
  PadelEquipmentType,
  PickleballEquipmentType,
} from "@/types/profile";

// ============================================
// Option Type
// ============================================

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

// ============================================
// Generic Options
// ============================================

// Racket sports come first (these have full sport-specific options)
export const racketSportOptions: SelectOption<Sport>[] = [
  { value: "tennis", label: "Tennis" },
  { value: "padel", label: "Padel" },
  { value: "pickleball", label: "Pickleball" },
];

// Other sports (alphabetically sorted, basic fields only)
export const otherSportOptions: SelectOption<Sport>[] = [
  { value: "american-football", label: "American Football" },
  { value: "badminton", label: "Badminton" },
  { value: "baseball", label: "Baseball" },
  { value: "basketball", label: "Basketball" },
  { value: "boxing", label: "Boxing" },
  { value: "climbing", label: "Climbing" },
  { value: "cricket", label: "Cricket" },
  { value: "cycling", label: "Cycling" },
  { value: "dance", label: "Dance" },
  { value: "fitness", label: "Fitness / Gym" },
  { value: "golf", label: "Golf" },
  { value: "gymnastics", label: "Gymnastics" },
  { value: "hockey", label: "Hockey" },
  { value: "martial-arts", label: "Martial Arts" },
  { value: "rugby", label: "Rugby" },
  { value: "running", label: "Running" },
  { value: "skiing", label: "Skiing" },
  { value: "snowboarding", label: "Snowboarding" },
  { value: "soccer", label: "Soccer / Football" },
  { value: "squash", label: "Squash" },
  { value: "surfing", label: "Surfing" },
  { value: "swimming", label: "Swimming" },
  { value: "table-tennis", label: "Table Tennis" },
  { value: "volleyball", label: "Volleyball" },
  { value: "yoga", label: "Yoga" },
  { value: "other", label: "Other" },
];

// Combined: racket sports first, then others alphabetically
export const sportOptions: SelectOption<Sport>[] = [
  ...racketSportOptions,
  ...otherSportOptions,
];

export const genderOptions: SelectOption<Gender>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

export const handednessOptions: SelectOption<Handedness>[] = [
  { value: "right", label: "Right-handed" },
  { value: "left", label: "Left-handed" },
  { value: "ambidextrous", label: "Ambidextrous" },
];

export const skillLevelOptions: SelectOption<SkillLevel>[] = [
  { value: "beginner", label: "Beginner", description: "New to the sport" },
  { value: "novice", label: "Novice", description: "Learning basics, can rally" },
  { value: "intermediate", label: "Intermediate", description: "Consistent strokes, plays matches" },
  { value: "advanced", label: "Advanced", description: "Strong technique, competitive" },
  { value: "expert", label: "Expert / Pro", description: "Tournament or professional level" },
];

export const yearsPlayingOptions: SelectOption<YearsPlaying>[] = [
  { value: "less-than-1", label: "Less than 1 year" },
  { value: "1-3", label: "1-3 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "5-10", label: "5-10 years" },
  { value: "10-plus", label: "10+ years" },
];

export const referralSourceOptions: SelectOption<ReferralSource>[] = [
  { value: "google", label: "Google Search" },
  { value: "social-media", label: "Social Media" },
  { value: "friend-coach", label: "Friend or Coach" },
  { value: "club", label: "My Club" },
  { value: "tournament", label: "Tournament" },
  { value: "app-store", label: "App Store" },
  { value: "other", label: "Other" },
];

// ============================================
// Tennis-Specific Options
// ============================================

export const tennisPlayingStyleOptions: SelectOption<TennisPlayingStyle>[] = [
  { value: "aggressive-baseliner", label: "Aggressive Baseliner", description: "Powerful groundstrokes from the baseline" },
  { value: "defensive-baseliner", label: "Defensive Baseliner", description: "Consistent, waits for opponent errors" },
  { value: "all-court", label: "All-Court Player", description: "Comfortable everywhere on the court" },
  { value: "serve-and-volley", label: "Serve & Volley", description: "Attacks the net frequently" },
  { value: "counter-puncher", label: "Counter-Puncher", description: "Defensive but can attack when opportunity arises" },
  { value: "developing", label: "Still Developing", description: "Haven't settled on a style yet" },
];

export const tennisSurfaceOptions: SelectOption<TennisSurface>[] = [
  { value: "hard", label: "Hard Court" },
  { value: "clay", label: "Clay Court" },
  { value: "grass", label: "Grass Court" },
  { value: "indoor", label: "Indoor (carpet/hard)" },
  { value: "no-preference", label: "No Preference" },
];

export const tennisGoalOptions: SelectOption<TennisGoal>[] = [
  { value: "improve-serve", label: "Improve Serve" },
  { value: "improve-return", label: "Improve Return" },
  { value: "improve-forehand", label: "Improve Forehand" },
  { value: "improve-backhand", label: "Improve Backhand" },
  { value: "improve-volleys", label: "Improve Net Game / Volleys" },
  { value: "improve-footwork", label: "Improve Footwork" },
  { value: "better-fitness", label: "Better Fitness / Endurance" },
  { value: "mental-game", label: "Mental Game / Consistency" },
  { value: "tournament-prep", label: "Tournament Preparation" },
  { value: "just-for-fun", label: "Just for Fun" },
];

export const tennisCertificationOptions: SelectOption<TennisCertification>[] = [
  { value: "ptr", label: "PTR", description: "Professional Tennis Registry" },
  { value: "uspta", label: "USPTA", description: "US Professional Tennis Association" },
  { value: "itf", label: "ITF", description: "International Tennis Federation" },
  { value: "lta", label: "LTA", description: "Lawn Tennis Association (UK)" },
  { value: "fft", label: "FFT", description: "French Tennis Federation" },
  { value: "rpt", label: "RPT", description: "Register of Professional Tennis" },
  { value: "national-federation", label: "National Federation", description: "Other national certification" },
  { value: "none", label: "None / In Progress" },
  { value: "other", label: "Other" },
];

export const tennisEquipmentTypeOptions: SelectOption<TennisEquipmentType>[] = [
  { value: "racket", label: "Racket" },
  { value: "strings", label: "Strings" },
  { value: "shoes", label: "Shoes" },
  { value: "bag", label: "Bag" },
  { value: "grips", label: "Grips / Overgrips" },
];

// ============================================
// Padel-Specific Options
// ============================================

export const padelPlayingStyleOptions: SelectOption<PadelPlayingStyle>[] = [
  { value: "aggressive", label: "Aggressive", description: "Smash-focused, attacks every chance" },
  { value: "wall-specialist", label: "Wall Specialist", description: "Excellent defensive wall play" },
  { value: "net-player", label: "Net Player", description: "Prefers playing at the net" },
  { value: "balanced", label: "Balanced / All-Court", description: "Adapts to any situation" },
  { value: "developing", label: "Still Developing", description: "Haven't settled on a style yet" },
];

export const padelSurfaceOptions: SelectOption<PadelSurface>[] = [
  { value: "artificial-grass", label: "Artificial Grass" },
  { value: "no-preference", label: "No Preference" },
];

export const padelGoalOptions: SelectOption<PadelGoal>[] = [
  { value: "improve-bandeja-vibora", label: "Improve Bandeja / Vibora" },
  { value: "improve-smash", label: "Improve Smash" },
  { value: "improve-wall-shots", label: "Improve Wall Shots (Bajada, Chiquita)" },
  { value: "improve-volleys", label: "Improve Volleys" },
  { value: "better-positioning", label: "Better Positioning / Tactics" },
  { value: "better-lob-defense", label: "Better Lob Defense" },
  { value: "improve-serve", label: "Improve Serve" },
  { value: "better-fitness", label: "Better Fitness / Movement" },
  { value: "tournament-prep", label: "Tournament Preparation" },
  { value: "just-for-fun", label: "Just for Fun" },
];

export const padelCertificationOptions: SelectOption<PadelCertification>[] = [
  { value: "fip", label: "FIP", description: "International Padel Federation" },
  { value: "fep", label: "FEP", description: "Spanish Padel Federation" },
  { value: "wpt-academy", label: "WPT Academy", description: "World Padel Tour certified" },
  { value: "national-federation", label: "National Federation", description: "Other national certification" },
  { value: "none", label: "None / In Progress" },
  { value: "other", label: "Other" },
];

export const padelEquipmentTypeOptions: SelectOption<PadelEquipmentType>[] = [
  { value: "racket", label: "Racket" },
  { value: "shoes", label: "Shoes" },
  { value: "bag", label: "Bag" },
  { value: "grips", label: "Grips / Overgrips" },
];

// ============================================
// Pickleball-Specific Options
// ============================================

export const pickleballPlayingStyleOptions: SelectOption<PickleballPlayingStyle>[] = [
  { value: "banger", label: "Banger", description: "Power player, drives and smashes" },
  { value: "soft-game", label: "Soft Game Specialist", description: "Dinkers, patient play" },
  { value: "balanced", label: "Balanced / All-Court", description: "Mix of power and finesse" },
  { value: "aggressive-net", label: "Aggressive Net Player", description: "Takes control at the kitchen" },
  { value: "developing", label: "Still Developing", description: "Haven't settled on a style yet" },
];

export const pickleballSurfaceOptions: SelectOption<PickleballSurface>[] = [
  { value: "outdoor-hard", label: "Outdoor Hard Court" },
  { value: "indoor-hard", label: "Indoor Hard Court" },
  { value: "no-preference", label: "No Preference" },
];

export const pickleballGoalOptions: SelectOption<PickleballGoal>[] = [
  { value: "improve-third-shot-drop", label: "Improve Third Shot Drop" },
  { value: "improve-dinking", label: "Improve Dinking" },
  { value: "improve-drives", label: "Improve Drives / Speed-ups" },
  { value: "improve-serve", label: "Improve Serve" },
  { value: "improve-return", label: "Improve Return" },
  { value: "better-kitchen-play", label: "Better Kitchen Play" },
  { value: "better-positioning", label: "Better Positioning / Stacking" },
  { value: "better-fitness", label: "Better Fitness / Movement" },
  { value: "tournament-prep", label: "Tournament Preparation" },
  { value: "just-for-fun", label: "Just for Fun" },
];

export const pickleballCertificationOptions: SelectOption<PickleballCertification>[] = [
  { value: "ppr", label: "PPR", description: "Professional Pickleball Registry" },
  { value: "iptpa", label: "IPTPA", description: "International Pickleball Teaching Professional Association" },
  { value: "pci", label: "PCI", description: "Pickleball Coaching International" },
  { value: "usapa", label: "USAPA", description: "USA Pickleball Association certified" },
  { value: "none", label: "None / In Progress" },
  { value: "other", label: "Other" },
];

export const pickleballEquipmentTypeOptions: SelectOption<PickleballEquipmentType>[] = [
  { value: "paddle", label: "Paddle" },
  { value: "shoes", label: "Shoes" },
  { value: "bag", label: "Bag" },
];

// ============================================
// Coach Options
// ============================================

export const coachingLevelOptions: SelectOption<CoachingLevel>[] = [
  { value: "assistant", label: "Assistant / Trainee", description: "Learning to coach" },
  { value: "club", label: "Club Coach", description: "Works at club level" },
  { value: "performance", label: "Performance Coach", description: "Trains competitive players" },
  { value: "high-performance", label: "High Performance", description: "National/international level" },
  { value: "master", label: "Master / Director", description: "Leads programs, trains coaches" },
];

export const employmentTypeOptions: SelectOption<EmploymentType>[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "freelance", label: "Freelance" },
];

export const clientCountOptions: SelectOption<ClientCount>[] = [
  { value: "1-10", label: "1-10 clients" },
  { value: "11-25", label: "11-25 clients" },
  { value: "26-50", label: "26-50 clients" },
  { value: "50-100", label: "50-100 clients" },
  { value: "100-plus", label: "100+ clients" },
];

export const coachSpecialtyOptions: SelectOption<CoachSpecialty>[] = [
  { value: "juniors", label: "Juniors" },
  { value: "adults", label: "Adults" },
  { value: "high-performance", label: "High Performance" },
  { value: "technique", label: "Technique" },
  { value: "fitness", label: "Fitness / Conditioning" },
  { value: "mental-game", label: "Mental Game" },
  { value: "beginners", label: "Beginners" },
];

// ============================================
// Business Options
// ============================================

export const companySizeOptions: SelectOption<CompanySize>[] = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "200-plus", label: "200+ employees" },
];

export const businessTypeOptions: SelectOption<BusinessType>[] = [
  { value: "tennis-club", label: "Tennis Club" },
  { value: "padel-club", label: "Padel Club" },
  { value: "pickleball-club", label: "Pickleball Club" },
  { value: "multi-sport-academy", label: "Multi-sport Academy" },
  { value: "private-coaching", label: "Private Coaching Business" },
  { value: "federation", label: "National / Regional Federation" },
  { value: "broadcast-media", label: "Broadcast / Media Company" },
  { value: "streaming-platform", label: "Streaming Platform" },
  { value: "equipment-brand", label: "Equipment Brand" },
  { value: "retail-proshop", label: "Retail / Pro Shop" },
  { value: "app-developer", label: "App / Tech Developer" },
  { value: "content-creator", label: "Content Creator / Influencer" },
  { value: "tournament-organizer", label: "Tournament Organizer" },
  { value: "fitness-wellness", label: "Fitness / Wellness Center" },
  { value: "sports-analytics", label: "Sports Analytics Company" },
  { value: "other", label: "Other" },
];

export const businessRoleOptions: SelectOption<BusinessRole>[] = [
  { value: "owner", label: "Owner / Founder" },
  { value: "coach", label: "Coach / Instructor" },
  { value: "marketing", label: "Marketing / Sales" },
  { value: "technology", label: "Technology / Product" },
  { value: "content", label: "Content / Media" },
  { value: "operations", label: "Operations" },
  { value: "other", label: "Other" },
];

export const businessUseCaseOptions: SelectOption<BusinessUseCase>[] = [
  { value: "player-analysis", label: "Player Analysis" },
  { value: "content-creation", label: "Content Creation" },
  { value: "coach-training", label: "Coach Training" },
  { value: "marketing", label: "Marketing" },
  { value: "research-development", label: "Research & Development" },
  { value: "other", label: "Other" },
];

// ============================================
// Equipment Brands
// ============================================

export const tennisBrands = [
  "Wilson",
  "Babolat",
  "Head",
  "Yonex",
  "Prince",
  "Dunlop",
  "Tecnifibre",
  "Volkl",
  "Lacoste",
  "Luxilon",
  "Solinco",
  "ProKennex",
  "Gamma",
  "Asics",
  "Nike",
  "Adidas",
  "New Balance",
  "K-Swiss",
  "Other",
] as const;

export const padelBrands = [
  "Bullpadel",
  "Head",
  "Adidas",
  "Nox",
  "StarVie",
  "Siux",
  "Dunlop",
  "Babolat",
  "Wilson",
  "Drop Shot",
  "Vibora",
  "Varlion",
  "Cartri",
  "Royal Padel",
  "Asics",
  "Joma",
  "Other",
] as const;

export const pickleballBrands = [
  "Selkirk",
  "JOOLA",
  "Paddletek",
  "Engage",
  "Franklin",
  "HEAD",
  "ProKennex",
  "Onix",
  "Diadem",
  "Electrum",
  "Gearbox",
  "Gamma",
  "Vulcan",
  "Prince",
  "Wilson",
  "CRBN",
  "Legacy Pro",
  "Other",
] as const;

// Helper to get brands by sport
export function getBrandsForSport(sport: RacketSport): readonly string[] {
  switch (sport) {
    case "tennis":
      return tennisBrands;
    case "padel":
      return padelBrands;
    case "pickleball":
      return pickleballBrands;
  }
}

// ============================================
// Sport-Specific Option Getters
// ============================================

export function getPlayingStyleOptions(sport: RacketSport) {
  switch (sport) {
    case "tennis":
      return tennisPlayingStyleOptions;
    case "padel":
      return padelPlayingStyleOptions;
    case "pickleball":
      return pickleballPlayingStyleOptions;
  }
}

export function getSurfaceOptions(sport: RacketSport) {
  switch (sport) {
    case "tennis":
      return tennisSurfaceOptions;
    case "padel":
      return padelSurfaceOptions;
    case "pickleball":
      return pickleballSurfaceOptions;
  }
}

export function getGoalOptions(sport: RacketSport) {
  switch (sport) {
    case "tennis":
      return tennisGoalOptions;
    case "padel":
      return padelGoalOptions;
    case "pickleball":
      return pickleballGoalOptions;
  }
}

export function getCertificationOptions(sport: RacketSport) {
  switch (sport) {
    case "tennis":
      return tennisCertificationOptions;
    case "padel":
      return padelCertificationOptions;
    case "pickleball":
      return pickleballCertificationOptions;
  }
}

export function getEquipmentTypeOptions(sport: RacketSport) {
  switch (sport) {
    case "tennis":
      return tennisEquipmentTypeOptions;
    case "padel":
      return padelEquipmentTypeOptions;
    case "pickleball":
      return pickleballEquipmentTypeOptions;
  }
}

// ============================================
// Helper Text for Fields
// ============================================

export const fieldHelperText = {
  // Player fields
  goals: "Helps us focus coaching tips on what matters to you",
  skillLevel: "We'll adjust technical explanations to your level",
  playingStyle: "AI will analyze your technique in context of your style",
  equipment: "We can provide brand-specific recommendations",
  physicalLimitations: "Ensures we never suggest techniques that could cause harm",
  handedness: "Important for technique analysis and positioning advice",
  height: "Helps with biomechanics analysis and technique recommendations",
  weight: "Used for power and movement analysis",
  dateOfBirth: "Helps us tailor advice to your age group",
  isParentOfJunior: "Enables junior-focused features and simpler explanations",
  
  // Coach fields
  isCoach: "Unlock coach-specific features, analytics, and multi-player management",
  coachingLevel: "We'll provide appropriate depth of technical content",
  specialties: "We'll highlight relevant coaching techniques and drills",
  usesVideoAnalysis: "We'll optimize recommendations for video-based coaching",
  certifications: "Helps us understand your coaching background",
  
  // Business fields
  isBusiness: "Access team management, reporting tools, and enterprise features",
  businessType: "We'll tailor features to your industry needs",
  useCases: "Helps us prioritize the most relevant features for you",
} as const;

// ============================================
// Countries (ISO 3166-1)
// ============================================

export const countries = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "ES", label: "Spain" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "IT", label: "Italy" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
  { value: "AR", label: "Argentina" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "CN", label: "China" },
  { value: "IN", label: "India" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "CH", label: "Switzerland" },
  { value: "AT", label: "Austria" },
  { value: "PT", label: "Portugal" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "PL", label: "Poland" },
  { value: "CZ", label: "Czech Republic" },
  { value: "RU", label: "Russia" },
  { value: "ZA", label: "South Africa" },
  { value: "NZ", label: "New Zealand" },
  { value: "SG", label: "Singapore" },
  { value: "HK", label: "Hong Kong" },
  { value: "TW", label: "Taiwan" },
  { value: "TH", label: "Thailand" },
  { value: "MY", label: "Malaysia" },
  { value: "ID", label: "Indonesia" },
  { value: "PH", label: "Philippines" },
  { value: "VN", label: "Vietnam" },
  { value: "CL", label: "Chile" },
  { value: "CO", label: "Colombia" },
  { value: "PE", label: "Peru" },
  { value: "EC", label: "Ecuador" },
  { value: "VE", label: "Venezuela" },
  { value: "IE", label: "Ireland" },
  { value: "GR", label: "Greece" },
  { value: "TR", label: "Turkey" },
  { value: "EG", label: "Egypt" },
  { value: "IL", label: "Israel" },
  { value: "OTHER", label: "Other" },
] as const;

// ============================================
// Languages
// ============================================

export const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "nl", label: "Nederlands" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
  { value: "ar", label: "العربية" },
  { value: "ru", label: "Русский" },
] as const;

// ============================================
// Common Timezones
// ============================================

export const timezones = [
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "America/Phoenix", label: "Arizona (US)" },
  { value: "America/Anchorage", label: "Alaska (US)" },
  { value: "Pacific/Honolulu", label: "Hawaii (US)" },
  { value: "America/Toronto", label: "Eastern Time (Canada)" },
  { value: "America/Vancouver", label: "Pacific Time (Canada)" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "America/Buenos_Aires", label: "Buenos Aires" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris / Berlin / Madrid" },
  { value: "Europe/Rome", label: "Rome" },
  { value: "Europe/Amsterdam", label: "Amsterdam" },
  { value: "Europe/Stockholm", label: "Stockholm" },
  { value: "Europe/Moscow", label: "Moscow" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Hong_Kong", label: "Hong Kong" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Seoul", label: "Seoul" },
  { value: "Asia/Shanghai", label: "Beijing / Shanghai" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Australia/Melbourne", label: "Melbourne" },
  { value: "Australia/Perth", label: "Perth" },
  { value: "Pacific/Auckland", label: "Auckland" },
] as const;

