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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          video_playback_speed: number | null;
          is_video_size_limit_error: boolean | null;
          is_streaming: boolean | null;
          input_tokens: number | null;
          output_tokens: number | null;
          response_duration: number | null;
          model_settings: Json | null;
          tts_usage: Json | null;
          pose_data: Json | null;
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
          video_playback_speed?: number | null;
          is_video_size_limit_error?: boolean | null;
          is_streaming?: boolean | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          response_duration?: number | null;
          model_settings?: Json | null;
          tts_usage?: Json | null;
          pose_data?: Json | null;
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
          video_playback_speed?: number | null;
          is_video_size_limit_error?: boolean | null;
          is_streaming?: boolean | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          response_duration?: number | null;
          model_settings?: Json | null;
          tts_usage?: Json | null;
          pose_data?: Json | null;
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
