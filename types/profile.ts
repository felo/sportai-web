/**
 * Profile Types
 * Comprehensive type definitions for user profiles, sports, coaching, and business
 */

// ============================================
// Enums and Constants
// ============================================

// Racket sports (with full sport-specific fields)
export type RacketSport = "tennis" | "padel" | "pickleball";

// All supported sports
export type Sport = 
  | RacketSport
  | "badminton"
  | "squash"
  | "table-tennis"
  | "basketball"
  | "soccer"
  | "volleyball"
  | "golf"
  | "swimming"
  | "running"
  | "cycling"
  | "fitness"
  | "yoga"
  | "martial-arts"
  | "boxing"
  | "cricket"
  | "baseball"
  | "hockey"
  | "rugby"
  | "american-football"
  | "skiing"
  | "snowboarding"
  | "surfing"
  | "climbing"
  | "gymnastics"
  | "dance"
  | "other";

// Helper to check if a sport is a racket sport
export const isRacketSport = (sport: Sport): sport is RacketSport => {
  return sport === "tennis" || sport === "padel" || sport === "pickleball";
};

export type Gender = "male" | "female" | "non-binary" | "prefer-not-to-say";

export type Handedness = "left" | "right" | "ambidextrous";

export type UnitsPreference = "metric" | "imperial";

export type SkillLevel = 
  | "beginner"      // New to the sport
  | "novice"        // Learning basics, can rally
  | "intermediate"  // Consistent strokes, plays matches
  | "advanced"      // Strong technique, competitive
  | "expert";       // Tournament/professional level

export type YearsPlaying = 
  | "less-than-1" 
  | "1-3" 
  | "3-5" 
  | "5-10" 
  | "10-plus";

export type CoachingLevel = 
  | "assistant"       // Learning to coach
  | "club"            // Club level coach
  | "performance"     // Trains competitive players
  | "high-performance" // National/international level
  | "master";         // Director, trains other coaches

export type EmploymentType = "full-time" | "part-time" | "freelance";

export type ClientCount = "1-10" | "11-25" | "26-50" | "50-100" | "100-plus";

export type CompanySize = "1-10" | "11-50" | "51-200" | "200-plus";

// ============================================
// Sport-Specific Types
// ============================================

// Tennis
export type TennisPlayingStyle = 
  | "aggressive-baseliner"
  | "defensive-baseliner"
  | "all-court"
  | "serve-and-volley"
  | "counter-puncher"
  | "developing";

export type TennisSurface = "hard" | "clay" | "grass" | "indoor" | "no-preference";

export type TennisGoal = 
  | "improve-serve"
  | "improve-return"
  | "improve-forehand"
  | "improve-backhand"
  | "improve-volleys"
  | "improve-footwork"
  | "better-fitness"
  | "mental-game"
  | "tournament-prep"
  | "just-for-fun";

export type TennisCertification = 
  | "ptr"
  | "uspta"
  | "itf"
  | "lta"
  | "fft"
  | "rpt"
  | "national-federation"
  | "none"
  | "other";

// Padel
export type PadelPlayingStyle = 
  | "aggressive"      // Smash-focused
  | "wall-specialist" // Defensive
  | "net-player"
  | "balanced"        // All-court
  | "developing";

export type PadelSurface = "artificial-grass" | "no-preference";

export type PadelGoal = 
  | "improve-bandeja-vibora"
  | "improve-smash"
  | "improve-wall-shots"
  | "improve-volleys"
  | "better-positioning"
  | "better-lob-defense"
  | "improve-serve"
  | "better-fitness"
  | "tournament-prep"
  | "just-for-fun";

export type PadelCertification = 
  | "fip"
  | "fep"
  | "wpt-academy"
  | "national-federation"
  | "none"
  | "other";

// Pickleball
export type PickleballPlayingStyle = 
  | "banger"          // Power player
  | "soft-game"       // Dinkers
  | "balanced"        // All-court
  | "aggressive-net"
  | "developing";

export type PickleballSurface = "outdoor-hard" | "indoor-hard" | "no-preference";

export type PickleballGoal = 
  | "improve-third-shot-drop"
  | "improve-dinking"
  | "improve-drives"
  | "improve-serve"
  | "improve-return"
  | "better-kitchen-play"
  | "better-positioning"
  | "better-fitness"
  | "tournament-prep"
  | "just-for-fun";

export type PickleballCertification = 
  | "ppr"
  | "iptpa"
  | "pci"
  | "usapa"
  | "none"
  | "other";

// Union types for sport-specific fields
export type PlayingStyle = TennisPlayingStyle | PadelPlayingStyle | PickleballPlayingStyle;
export type PreferredSurface = TennisSurface | PadelSurface | PickleballSurface;
export type SportGoal = TennisGoal | PadelGoal | PickleballGoal;
export type CoachCertification = TennisCertification | PadelCertification | PickleballCertification;

// ============================================
// Equipment Types
// ============================================

export type TennisEquipmentType = "racket" | "strings" | "shoes" | "bag" | "grips";
export type PadelEquipmentType = "racket" | "shoes" | "bag" | "grips";
export type PickleballEquipmentType = "paddle" | "shoes" | "bag";

export type EquipmentType = TennisEquipmentType | PadelEquipmentType | PickleballEquipmentType;

export interface PlayerEquipment {
  id: string;
  profile_id: string;
  sport: Sport;
  equipment_type: EquipmentType;
  brand: string;
  model_name: string;
  notes?: string;
  created_at: string;
}

// ============================================
// Business Types
// ============================================

export type BusinessType = 
  | "tennis-club"
  | "padel-club"
  | "pickleball-club"
  | "multi-sport-academy"
  | "private-coaching"
  | "federation"
  | "broadcast-media"
  | "streaming-platform"
  | "equipment-brand"
  | "retail-proshop"
  | "app-developer"
  | "content-creator"
  | "tournament-organizer"
  | "fitness-wellness"
  | "sports-analytics"
  | "other";

export type BusinessRole = 
  | "owner"
  | "coach"
  | "marketing"
  | "technology"
  | "content"
  | "operations"
  | "other";

export type BusinessUseCase = 
  | "player-analysis"
  | "content-creation"
  | "coach-training"
  | "marketing"
  | "research-development"
  | "other";

// ============================================
// Coach Specialty Types
// ============================================

export type CoachSpecialty = 
  | "juniors"
  | "adults"
  | "high-performance"
  | "technique"
  | "fitness"
  | "mental-game"
  | "beginners";

// ============================================
// Referral Source
// ============================================

export type ReferralSource = 
  | "google"
  | "social-media"
  | "friend-coach"
  | "club"
  | "tournament"
  | "app-store"
  | "other";

// ============================================
// Main Profile Interfaces
// ============================================

/**
 * Extended user profile with all player fields
 */
export interface PlayerProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  
  // Demographics
  date_of_birth: string | null;
  gender: Gender | null;
  handedness: Handedness | null;
  
  // Physical
  height: number | null;        // in cm or inches based on units_preference
  weight: number | null;        // in kg or lbs based on units_preference
  physical_limitations: string | null;
  
  // Preferences
  units_preference: UnitsPreference;
  country: string | null;
  timezone: string | null;
  language: string;
  
  // Flags
  is_parent_of_junior: boolean;
  
  // Meta
  referral_source: ReferralSource | null;
  created_at: string;
  updated_at: string;
}

/**
 * Sport entry for a player
 */
export interface PlayerSport {
  id: string;
  profile_id: string;
  sport: Sport;
  skill_level: SkillLevel;
  years_playing: YearsPlaying;
  club_name: string | null;
  playing_style: PlayingStyle | null;
  preferred_surfaces: PreferredSurface[];
  goals: SportGoal[];
  created_at: string;
  updated_at: string;
}

/**
 * Coach profile extension
 */
export interface CoachProfile {
  profile_id: string;
  is_active: boolean;
  years_experience: YearsPlaying;
  coaching_level: CoachingLevel;
  employment_type: EmploymentType;
  client_count: ClientCount;
  specialties: CoachSpecialty[];
  affiliation: string | null;
  uses_video_analysis: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Sport-specific coaching certifications
 */
export interface CoachSport {
  id: string;
  coach_profile_id: string;
  sport: Sport;
  certifications: CoachCertification[];
  created_at: string;
}

/**
 * Business profile extension
 */
export interface BusinessProfile {
  profile_id: string;
  company_name: string;
  website: string | null;
  role: BusinessRole;
  company_size: CompanySize;
  country: string | null;
  business_type: BusinessType;
  use_cases: BusinessUseCase[];
  created_at: string;
  updated_at: string;
}

// ============================================
// Composite Types for API Responses
// ============================================

/**
 * Full profile data including all relations
 */
export interface FullProfile {
  player: PlayerProfile;
  sports: PlayerSport[];
  equipment: PlayerEquipment[];
  coach: CoachProfile | null;
  coachSports: CoachSport[];
  business: BusinessProfile | null;
}

/**
 * Profile update payloads
 */
export interface UpdatePlayerProfilePayload {
  full_name?: string;
  date_of_birth?: string | null;
  gender?: Gender | null;
  handedness?: Handedness | null;
  height?: number | null;
  weight?: number | null;
  physical_limitations?: string | null;
  units_preference?: UnitsPreference;
  country?: string | null;
  timezone?: string | null;
  language?: string;
  is_parent_of_junior?: boolean;
  referral_source?: ReferralSource | null;
}

export interface CreatePlayerSportPayload {
  sport: Sport;
  skill_level: SkillLevel;
  years_playing?: YearsPlaying | null;
  club_name?: string | null;
  playing_style?: PlayingStyle | null;
  preferred_surfaces?: PreferredSurface[];
  goals?: SportGoal[];
}

export interface UpdatePlayerSportPayload extends Partial<CreatePlayerSportPayload> {
  id: string;
}

export interface CreateEquipmentPayload {
  sport: Sport;
  equipment_type: EquipmentType;
  brand: string;
  model_name: string;
  notes?: string;
}

export interface UpdateEquipmentPayload extends Partial<CreateEquipmentPayload> {
  id: string;
}

export interface UpsertCoachProfilePayload {
  is_active?: boolean;
  years_experience?: YearsPlaying;
  coaching_level?: CoachingLevel;
  employment_type?: EmploymentType;
  client_count?: ClientCount;
  specialties?: CoachSpecialty[];
  affiliation?: string | null;
  uses_video_analysis?: boolean;
}

export interface UpsertCoachSportPayload {
  sport: Sport;
  certifications: CoachCertification[];
}

export interface UpsertBusinessProfilePayload {
  company_name?: string;
  website?: string | null;
  role?: BusinessRole;
  company_size?: CompanySize;
  country?: string | null;
  business_type?: BusinessType;
  use_cases?: BusinessUseCase[];
}

