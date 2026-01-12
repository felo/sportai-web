/**
 * External API Types
 * 
 * Type definitions for the external developer API endpoints.
 * These types define the contract between external apps (e.g., Pickleball app)
 * and the SportAI backend.
 */

// ============================================================================
// Swing Analysis Data Model
// ============================================================================

/**
 * Feature-level analysis (individual technique aspects)
 * Each feature represents a measurable aspect of the player's swing
 */
export interface SwingFeature {
  feature_name: string;      // e.g., "stance_open_closed"
  human_name: string;        // e.g., "Stance before swinging"
  event: string;             // e.g., "load_position", "ball_hit"
  timestamp?: number;        // Video timestamp (optional)
  score: number;             // 0-100
  level: string;             // "beginner" | "intermediate" | "advanced" | "professional"
  value: number;             // Measured value
  unit: string;              // e.g., "°", "cm", "m/s"
  observation: string;       // Human-readable observation
  suggestion: string;        // Improvement suggestion
  description: string;       // Detailed description of the feature
}

/**
 * Category scores (power, stability, balance)
 * Groups related features into meaningful categories
 */
export interface SwingCategory {
  name: string;              // e.g., "power", "stability", "balance"
  average_score: number;     // 0-100
  features: string[];        // feature_name references
}

/**
 * Kinetic chain peak analysis
 * Tracks the timing/sequencing of body segments during the swing
 */
export interface KineticChainPeaks {
  hip_peak_index: number;
  shoulder_peak_index: number;
  wrist_peak_index: number;
  hip_success: string;       // Success indicator
  shoulder_success: string;  // Success indicator
  wrist_success: string;     // Success indicator
}

/**
 * Kinetic chain analysis
 * Analyzes the energy transfer through the body during the swing
 */
export interface KineticChainMetrics {
  observation: string;
  suggestion: string;
  description: string;       // Detailed description
  peaks: KineticChainPeaks;
}

/**
 * Wrist speed metrics
 */
export interface WristSpeedMetrics {
  player_wrist_velocity: number;
  min: number;
  max: number;
  unit: string;
  observation: string;
  description: string;       // Detailed description
}

/**
 * Full swing context from client
 * This is the main payload sent by external apps containing all swing analysis data
 */
export interface SwingAnalysisContext {
  context_version: string;            // Schema version (e.g., "1.0")
  domain: string;                     // "swing_coaching"
  sport?: string;                     // "pickleball", "tennis", etc.
  swing_type: string;                 // e.g., "forehand_drive"
  playerLevel?: string;               // "beginner" | "intermediate" | "advanced"
  progress?: number;                  // 0-100 overall progress score
  dominant_hand?: string;             // "right" | "left"
  player_height_mm?: number;          // Player height in millimeters
  summary?: {
    top_priorities?: SwingFeature[];  // Weakest areas to improve
    strengths?: SwingFeature[];       // What they're doing well
  };
  categories?: SwingCategory[];
  metrics?: {
    wrist_speed?: WristSpeedMetrics;
    kinetic_chain?: KineticChainMetrics;
  };
  all_features?: SwingFeature[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Conversation message for multi-turn chats
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Technique Chat API Request
 * POST /api/external/pickleball/technique-chat
 */
export interface TechniqueChatRequest {
  /** User's question about their swing (REQUIRED) */
  prompt: string;
  
  /** Pre-analyzed swing data (REQUIRED - at minimum swing_type) */
  swingContext: SwingAnalysisContext;
  
  /** Custom agent name (e.g., "Shark", "Ted") - defaults to "Coach" */
  agentName?: string;
  
  /** Conversation history for multi-turn chats */
  conversationHistory?: ConversationMessage[];
}

/**
 * Technique Chat API Response (for non-streaming mode)
 */
export interface TechniqueChatResponse {
  response: string;
  modelUsed: string;
}

/**
 * API Error Response
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  retryAfter?: number;
}

// ============================================================================
// API Key Types (internal use)
// ============================================================================

/**
 * API Key record from database
 */
export interface ApiKeyRecord {
  id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  owner_email: string | null;
  description: string | null;
  permissions: string[];
  rate_limit_tier: string;
  monthly_request_limit: number;
  requests_this_month: number;
  month_reset_at: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  last_used_at: string | null;
  total_requests: number;
  metadata: Record<string, unknown>;
}

/**
 * Validated API key info (returned after validation)
 */
export interface ValidatedApiKey {
  id: string;
  name: string;
  permissions: string[];
  rateLimitTier: string;
  monthlyLimit: number;
  requestsThisMonth: number;
}
