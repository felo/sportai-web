/**
 * Supabase Database Types
 * Generated from the database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Type aliases for database enums
type GenderType = "male" | "female" | "non-binary" | "prefer-not-to-say";
type HandednessType = "left" | "right" | "ambidextrous";
type UnitsPreferenceType = "metric" | "imperial";
type SportType = "tennis" | "padel" | "pickleball";
type SkillLevelType = "beginner" | "novice" | "intermediate" | "advanced" | "expert";
type YearsPlayingType = "less-than-1" | "1-3" | "3-5" | "5-10" | "10-plus";
type CoachingLevelType = "assistant" | "club" | "performance" | "high-performance" | "master";
type EmploymentTypeType = "full-time" | "part-time" | "freelance";
type ClientCountType = "1-10" | "11-25" | "26-50" | "50-100" | "100-plus";
type CompanySizeType = "1-10" | "11-50" | "51-200" | "200-plus";
type BusinessRoleType = "owner" | "coach" | "marketing" | "technology" | "content" | "operations" | "other";
type BusinessTypeType = 
  | "tennis-club" | "padel-club" | "pickleball-club" | "multi-sport-academy"
  | "private-coaching" | "federation" | "broadcast-media" | "streaming-platform"
  | "equipment-brand" | "retail-proshop" | "app-developer" | "content-creator"
  | "tournament-organizer" | "fitness-wellness" | "sports-analytics" | "other";

type TaskStatusType = "pending" | "processing" | "completed" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          // Extended profile fields
          date_of_birth: string | null;
          gender: GenderType | null;
          handedness: HandednessType | null;
          height: number | null;
          weight: number | null;
          physical_limitations: string | null;
          units_preference: UnitsPreferenceType;
          country: string | null;
          timezone: string | null;
          language: string;
          is_parent_of_junior: boolean;
          referral_source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          date_of_birth?: string | null;
          gender?: GenderType | null;
          handedness?: HandednessType | null;
          height?: number | null;
          weight?: number | null;
          physical_limitations?: string | null;
          units_preference?: UnitsPreferenceType;
          country?: string | null;
          timezone?: string | null;
          language?: string;
          is_parent_of_junior?: boolean;
          referral_source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          date_of_birth?: string | null;
          gender?: GenderType | null;
          handedness?: HandednessType | null;
          height?: number | null;
          weight?: number | null;
          physical_limitations?: string | null;
          units_preference?: UnitsPreferenceType;
          country?: string | null;
          timezone?: string | null;
          language?: string;
          is_parent_of_junior?: boolean;
          referral_source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      player_sports: {
        Row: {
          id: string;
          profile_id: string;
          sport: SportType;
          skill_level: SkillLevelType;
          years_playing: YearsPlayingType | null;
          club_name: string | null;
          playing_style: string | null;
          preferred_surfaces: string[];
          goals: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          sport: SportType;
          skill_level: SkillLevelType;
          years_playing?: YearsPlayingType | null;
          club_name?: string | null;
          playing_style?: string | null;
          preferred_surfaces?: string[];
          goals?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          sport?: SportType;
          skill_level?: SkillLevelType;
          years_playing?: YearsPlayingType | null;
          club_name?: string | null;
          playing_style?: string | null;
          preferred_surfaces?: string[];
          goals?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "player_sports_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      player_equipment: {
        Row: {
          id: string;
          profile_id: string;
          sport: SportType;
          equipment_type: string;
          brand: string;
          model_name: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          sport: SportType;
          equipment_type: string;
          brand: string;
          model_name: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          sport?: SportType;
          equipment_type?: string;
          brand?: string;
          model_name?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "player_equipment_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      coach_profiles: {
        Row: {
          profile_id: string;
          is_active: boolean;
          years_experience: YearsPlayingType | null;
          coaching_level: CoachingLevelType | null;
          employment_type: EmploymentTypeType | null;
          client_count: ClientCountType | null;
          specialties: string[];
          affiliation: string | null;
          uses_video_analysis: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          is_active?: boolean;
          years_experience?: YearsPlayingType | null;
          coaching_level?: CoachingLevelType | null;
          employment_type?: EmploymentTypeType | null;
          client_count?: ClientCountType | null;
          specialties?: string[];
          affiliation?: string | null;
          uses_video_analysis?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          is_active?: boolean;
          years_experience?: YearsPlayingType | null;
          coaching_level?: CoachingLevelType | null;
          employment_type?: EmploymentTypeType | null;
          client_count?: ClientCountType | null;
          specialties?: string[];
          affiliation?: string | null;
          uses_video_analysis?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coach_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      coach_sports: {
        Row: {
          id: string;
          coach_profile_id: string;
          sport: SportType;
          certifications: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_profile_id: string;
          sport: SportType;
          certifications?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          coach_profile_id?: string;
          sport?: SportType;
          certifications?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coach_sports_coach_profile_id_fkey";
            columns: ["coach_profile_id"];
            isOneToOne: false;
            referencedRelation: "coach_profiles";
            referencedColumns: ["profile_id"];
          }
        ];
      };
      business_profiles: {
        Row: {
          profile_id: string;
          company_name: string;
          website: string | null;
          role: BusinessRoleType | null;
          company_size: CompanySizeType | null;
          country: string | null;
          business_type: BusinessTypeType | null;
          use_cases: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          company_name: string;
          website?: string | null;
          role?: BusinessRoleType | null;
          company_size?: CompanySizeType | null;
          country?: string | null;
          business_type?: BusinessTypeType | null;
          use_cases?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          company_name?: string;
          website?: string | null;
          role?: BusinessRoleType | null;
          company_size?: CompanySizeType | null;
          country?: string | null;
          business_type?: BusinessTypeType | null;
          use_cases?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      chats: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
          thinking_mode: "fast" | "deep" | null;
          media_resolution: "low" | "medium" | "high" | null;
          domain_expertise: "all-sports" | "tennis" | "pickleball" | "padel" | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
          thinking_mode?: "fast" | "deep" | null;
          media_resolution?: "low" | "medium" | "high" | null;
          domain_expertise?: "all-sports" | "tennis" | "pickleball" | "padel" | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
          thinking_mode?: "fast" | "deep" | null;
          media_resolution?: "low" | "medium" | "high" | null;
          domain_expertise?: "all-sports" | "tennis" | "pickleball" | "padel" | null;
        };
        Relationships: [
          {
            foreignKeyName: "chats_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          role: "user" | "assistant";
          content: string;
          created_at: string;
          sequence_number: number;
          video_url: string | null;
          video_s3_key: string | null;
          thumbnail_url: string | null;
          thumbnail_s3_key: string | null;
          video_playback_speed: number | null;
          is_video_size_limit_error: boolean | null;
          is_streaming: boolean | null;
          input_tokens: number | null;
          output_tokens: number | null;
          response_duration: number | null;
          model_settings: Json | null;
          tts_usage: Json | null;
          pose_data: Json | null;
          pose_data_s3_key: string | null;
        };
        Insert: {
          id?: string;
          chat_id: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string;
          sequence_number: number;
          video_url?: string | null;
          video_s3_key?: string | null;
          thumbnail_url?: string | null;
          thumbnail_s3_key?: string | null;
          video_playback_speed?: number | null;
          is_video_size_limit_error?: boolean | null;
          is_streaming?: boolean | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          response_duration?: number | null;
          model_settings?: Json | null;
          tts_usage?: Json | null;
          pose_data?: Json | null;
          pose_data_s3_key?: string | null;
        };
        Update: {
          id?: string;
          chat_id?: string;
          role?: "user" | "assistant";
          content?: string;
          created_at?: string;
          sequence_number?: number;
          video_url?: string | null;
          video_s3_key?: string | null;
          thumbnail_url?: string | null;
          thumbnail_s3_key?: string | null;
          video_playback_speed?: number | null;
          is_video_size_limit_error?: boolean | null;
          is_streaming?: boolean | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          response_duration?: number | null;
          model_settings?: Json | null;
          tts_usage?: Json | null;
          pose_data?: Json | null;
          pose_data_s3_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          }
        ];
      };
      message_feedback: {
        Row: {
          id: string;
          message_id: string; // TEXT - not a foreign key since messages may be local-only
          user_id: string | null;
          feedback_type: "up" | "down";
          reasons: string[];
          comment: string | null;
          chat_id: string | null; // TEXT - not a foreign key since chats may be local-only
          message_content: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id?: string | null;
          feedback_type: "up" | "down";
          reasons?: string[];
          comment?: string | null;
          chat_id?: string | null;
          message_content?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string | null;
          feedback_type?: "up" | "down";
          reasons?: string[];
          comment?: string | null;
          chat_id?: string | null;
          message_content?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_feedback_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      sportai_tasks: {
        Row: {
          id: string;
          user_id: string;
          task_type: string;
          sport: SportType;
          sportai_task_id: string | null;
          video_url: string;
          video_s3_key: string | null;
          thumbnail_url: string | null;
          thumbnail_s3_key: string | null;
          video_length: number | null;
          status: TaskStatusType;
          estimated_compute_time: number | null;
          request_params: Json | null;
          result_s3_key: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_type: string;
          sport?: SportType;
          sportai_task_id?: string | null;
          video_url: string;
          video_s3_key?: string | null;
          thumbnail_url?: string | null;
          thumbnail_s3_key?: string | null;
          video_duration?: number | null;
          status?: TaskStatusType;
          estimated_compute_time?: number | null;
          request_params?: Json | null;
          result_s3_key?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_type?: string;
          sport?: SportType;
          sportai_task_id?: string | null;
          video_url?: string;
          video_s3_key?: string | null;
          thumbnail_url?: string | null;
          thumbnail_s3_key?: string | null;
          video_duration?: number | null;
          status?: TaskStatusType;
          estimated_compute_time?: number | null;
          request_params?: Json | null;
          result_s3_key?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sportai_tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
