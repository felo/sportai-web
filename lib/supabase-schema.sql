-- =============================================
-- SportAI Database Schema
-- Supabase PostgreSQL with Row Level Security
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,  -- URL to profile picture stored in S3
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies: users can only see and update their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger to automatically create profile on user signup
-- Extracts full_name and avatar_url from OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- MIGRATION: Add columns if they don't exist
-- Run this if you already have the profiles table
-- =============================================
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- =============================================
-- PROFILES TABLE - EXTENDED FIELDS
-- Run these migrations if you already have the profiles table
-- =============================================
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say'));
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handedness TEXT CHECK (handedness IN ('left', 'right', 'ambidextrous'));
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height NUMERIC;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight NUMERIC;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS physical_limitations TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS units_preference TEXT CHECK (units_preference IN ('metric', 'imperial')) DEFAULT 'metric';
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_parent_of_junior BOOLEAN DEFAULT FALSE;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- =============================================
-- PLAYER_SPORTS TABLE
-- Sports that a player participates in
-- =============================================
CREATE TABLE IF NOT EXISTS player_sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sport TEXT NOT NULL CHECK (sport IN ('tennis', 'padel', 'pickleball')),
  skill_level TEXT NOT NULL CHECK (skill_level IN ('beginner', 'novice', 'intermediate', 'advanced', 'expert')),
  years_playing TEXT CHECK (years_playing IN ('less-than-1', '1-3', '3-5', '5-10', '10-plus')),
  club_name TEXT,
  playing_style TEXT,
  preferred_surfaces TEXT[] DEFAULT '{}',
  goals TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure a player can only have one entry per sport
  UNIQUE(profile_id, sport)
);

-- Create index on profile_id for faster queries
CREATE INDEX IF NOT EXISTS player_sports_profile_id_idx ON player_sports(profile_id);

-- Enable RLS on player_sports
ALTER TABLE player_sports ENABLE ROW LEVEL SECURITY;

-- Player sports policies
CREATE POLICY "Users can view their own sports"
  ON player_sports FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own sports"
  ON player_sports FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own sports"
  ON player_sports FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own sports"
  ON player_sports FOR DELETE
  USING (auth.uid() = profile_id);

-- Trigger to update player_sports.updated_at
CREATE TRIGGER update_player_sports_updated_at
  BEFORE UPDATE ON player_sports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PLAYER_EQUIPMENT TABLE
-- Equipment owned by a player
-- =============================================
CREATE TABLE IF NOT EXISTS player_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sport TEXT NOT NULL CHECK (sport IN ('tennis', 'padel', 'pickleball')),
  equipment_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on profile_id for faster queries
CREATE INDEX IF NOT EXISTS player_equipment_profile_id_idx ON player_equipment(profile_id);

-- Enable RLS on player_equipment
ALTER TABLE player_equipment ENABLE ROW LEVEL SECURITY;

-- Player equipment policies
CREATE POLICY "Users can view their own equipment"
  ON player_equipment FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own equipment"
  ON player_equipment FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own equipment"
  ON player_equipment FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own equipment"
  ON player_equipment FOR DELETE
  USING (auth.uid() = profile_id);

-- =============================================
-- COACH_PROFILES TABLE
-- Optional coach extension for profiles
-- =============================================
CREATE TABLE IF NOT EXISTS coach_profiles (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  years_experience TEXT CHECK (years_experience IN ('less-than-1', '1-3', '3-5', '5-10', '10-plus')),
  coaching_level TEXT CHECK (coaching_level IN ('assistant', 'club', 'performance', 'high-performance', 'master')),
  employment_type TEXT CHECK (employment_type IN ('full-time', 'part-time', 'freelance')),
  client_count TEXT CHECK (client_count IN ('1-10', '11-25', '26-50', '50-100', '100-plus')),
  specialties TEXT[] DEFAULT '{}',
  affiliation TEXT,
  uses_video_analysis BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on coach_profiles
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;

-- Coach profiles policies
CREATE POLICY "Users can view their own coach profile"
  ON coach_profiles FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own coach profile"
  ON coach_profiles FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own coach profile"
  ON coach_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own coach profile"
  ON coach_profiles FOR DELETE
  USING (auth.uid() = profile_id);

-- Trigger to update coach_profiles.updated_at
CREATE TRIGGER update_coach_profiles_updated_at
  BEFORE UPDATE ON coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COACH_SPORTS TABLE
-- Sports and certifications for coaches
-- =============================================
CREATE TABLE IF NOT EXISTS coach_sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_profile_id UUID NOT NULL REFERENCES coach_profiles(profile_id) ON DELETE CASCADE,
  sport TEXT NOT NULL CHECK (sport IN ('tennis', 'padel', 'pickleball')),
  certifications TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure a coach can only have one entry per sport
  UNIQUE(coach_profile_id, sport)
);

-- Create index on coach_profile_id for faster queries
CREATE INDEX IF NOT EXISTS coach_sports_coach_profile_id_idx ON coach_sports(coach_profile_id);

-- Enable RLS on coach_sports
ALTER TABLE coach_sports ENABLE ROW LEVEL SECURITY;

-- Coach sports policies
CREATE POLICY "Users can view their own coach sports"
  ON coach_sports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_profiles
      WHERE coach_profiles.profile_id = coach_sports.coach_profile_id
      AND auth.uid() = coach_profiles.profile_id
    )
  );

CREATE POLICY "Users can insert their own coach sports"
  ON coach_sports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coach_profiles
      WHERE coach_profiles.profile_id = coach_sports.coach_profile_id
      AND auth.uid() = coach_profiles.profile_id
    )
  );

CREATE POLICY "Users can update their own coach sports"
  ON coach_sports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM coach_profiles
      WHERE coach_profiles.profile_id = coach_sports.coach_profile_id
      AND auth.uid() = coach_profiles.profile_id
    )
  );

CREATE POLICY "Users can delete their own coach sports"
  ON coach_sports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM coach_profiles
      WHERE coach_profiles.profile_id = coach_sports.coach_profile_id
      AND auth.uid() = coach_profiles.profile_id
    )
  );

-- =============================================
-- BUSINESS_PROFILES TABLE
-- Optional business extension for profiles
-- =============================================
CREATE TABLE IF NOT EXISTS business_profiles (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website TEXT,
  role TEXT CHECK (role IN ('owner', 'coach', 'marketing', 'technology', 'content', 'operations', 'other')),
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '200-plus')),
  country TEXT,
  business_type TEXT CHECK (business_type IN (
    'tennis-club', 'padel-club', 'pickleball-club', 'multi-sport-academy',
    'private-coaching', 'federation', 'broadcast-media', 'streaming-platform',
    'equipment-brand', 'retail-proshop', 'app-developer', 'content-creator',
    'tournament-organizer', 'fitness-wellness', 'sports-analytics', 'other'
  )),
  use_cases TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on business_profiles
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

-- Business profiles policies
CREATE POLICY "Users can view their own business profile"
  ON business_profiles FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own business profile"
  ON business_profiles FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own business profile"
  ON business_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own business profile"
  ON business_profiles FOR DELETE
  USING (auth.uid() = profile_id);

-- Trigger to update business_profiles.updated_at
CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CHATS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  thinking_mode TEXT CHECK (thinking_mode IN ('fast', 'deep')) DEFAULT 'fast',
  media_resolution TEXT CHECK (media_resolution IN ('low', 'medium', 'high')) DEFAULT 'medium',
  domain_expertise TEXT CHECK (domain_expertise IN ('all-sports', 'tennis', 'pickleball', 'padel')) DEFAULT 'all-sports'
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS chats_user_id_idx ON chats(user_id);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS chats_updated_at_idx ON chats(updated_at DESC);

-- Enable RLS on chats
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Chats policies: users can only access their own chats
CREATE POLICY "Users can view their own chats"
  ON chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
  ON chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
  ON chats FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sequence_number INTEGER NOT NULL DEFAULT 0, -- Preserves message order within a chat
  
  -- Video-related fields
  video_url TEXT,
  video_s3_key TEXT,
  thumbnail_url TEXT,  -- S3 URL for video thumbnail (first frame)
  thumbnail_s3_key TEXT,  -- S3 key for thumbnail
  video_playback_speed NUMERIC DEFAULT 1.0,
  is_video_size_limit_error BOOLEAN DEFAULT FALSE,
  
  -- Streaming flag
  is_streaming BOOLEAN DEFAULT FALSE,
  
  -- Token usage
  input_tokens INTEGER,
  output_tokens INTEGER,
  response_duration INTEGER, -- in milliseconds
  
  -- Model settings (JSONB for flexibility)
  model_settings JSONB,
  
  -- TTS usage data
  tts_usage JSONB,
  
  -- Pose detection data
  pose_data JSONB,
  
  -- Pose detection S3 storage (for preprocessed frame-by-frame data)
  pose_data_s3_key TEXT
);

-- =============================================
-- MIGRATION: Add sequence_number if it doesn't exist
-- Run this if you already have the messages table
-- =============================================
-- ALTER TABLE messages ADD COLUMN IF NOT EXISTS sequence_number INTEGER NOT NULL DEFAULT 0;

-- =============================================
-- MIGRATION: Add pose_data_s3_key for storing preprocessed pose data
-- Run this if you already have the messages table
-- =============================================
-- ALTER TABLE messages ADD COLUMN IF NOT EXISTS pose_data_s3_key TEXT;

-- =============================================
-- MIGRATION: Add thumbnail columns for storing video first frame
-- Run this if you already have the messages table
-- =============================================
-- ALTER TABLE messages ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
-- ALTER TABLE messages ADD COLUMN IF NOT EXISTS thumbnail_s3_key TEXT;

-- Create index on chat_id for faster message retrieval
CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages(chat_id);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Messages policies: users can only access messages from their own chats
CREATE POLICY "Users can view messages from their own chats"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their own chats"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their own chats"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from their own chats"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chats.updated_at when chat is modified
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update profiles.updated_at when profile is modified
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- MESSAGE_FEEDBACK TABLE
-- Stores user feedback on assistant responses
-- =============================================
CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT NOT NULL, -- Store as TEXT since messages may be local-only
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL if anonymous
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('up', 'down')),
  
  -- Preset reasons (stored as array for multiple selections)
  reasons TEXT[] DEFAULT '{}',
  
  -- Free-form comment
  comment TEXT,
  
  -- Context data
  chat_id TEXT, -- Store as TEXT since chats may be local-only
  message_content TEXT, -- Snapshot of message content at feedback time
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS message_feedback_message_id_idx ON message_feedback(message_id);
CREATE INDEX IF NOT EXISTS message_feedback_user_id_idx ON message_feedback(user_id);
CREATE INDEX IF NOT EXISTS message_feedback_feedback_type_idx ON message_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS message_feedback_created_at_idx ON message_feedback(created_at DESC);

-- Enable RLS on message_feedback
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;

-- Message feedback policies
-- Anyone can insert feedback (allows anonymous feedback)
CREATE POLICY "Anyone can insert feedback"
  ON message_feedback FOR INSERT
  WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON message_feedback FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own feedback
CREATE POLICY "Users can update their own feedback"
  ON message_feedback FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own feedback
CREATE POLICY "Users can delete their own feedback"
  ON message_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- HELPFUL QUERIES (commented out)
-- =============================================

-- Get all chats for a user with message count:
-- SELECT 
--   c.*,
--   COUNT(m.id) as message_count
-- FROM chats c
-- LEFT JOIN messages m ON c.id = m.chat_id
-- WHERE c.user_id = auth.uid()
-- GROUP BY c.id
-- ORDER BY c.updated_at DESC;

-- Get a chat with all its messages:
-- SELECT 
--   c.*,
--   json_agg(
--     json_build_object(
--       'id', m.id,
--       'role', m.role,
--       'content', m.content,
--       'videoUrl', m.video_url,
--       'videoS3Key', m.video_s3_key,
--       'videoPlaybackSpeed', m.video_playback_speed,
--       'poseData', m.pose_data,
--       'modelSettings', m.model_settings,
--       'ttsUsage', m.tts_usage
--     ) ORDER BY m.created_at
--   ) as messages
-- FROM chats c
-- LEFT JOIN messages m ON c.id = m.chat_id
-- WHERE c.id = 'chat-uuid-here' AND c.user_id = auth.uid()
-- GROUP BY c.id;

-- =============================================
-- SPORTAI_TASKS TABLE
-- Generic table for all SportAI API tasks
-- =============================================
CREATE TABLE IF NOT EXISTS sportai_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Task type (statistics, activity_detection, etc.)
  task_type TEXT NOT NULL,
  
  -- Sport type ('all' is valid only for technique tasks)
  sport TEXT NOT NULL DEFAULT 'padel' CHECK (sport IN ('tennis', 'padel', 'pickleball', 'all')),
  
  -- SportAI API fields
  sportai_task_id UUID, -- Task ID returned from SportAI API
  video_url TEXT NOT NULL,
  video_s3_key TEXT,  -- S3 key for video (to refresh expired presigned URLs)
  thumbnail_url TEXT,  -- S3 URL for video thumbnail (first frame)
  thumbnail_s3_key TEXT,  -- S3 key for thumbnail
  video_length NUMERIC, -- Video length in seconds
  
  -- Task status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  estimated_compute_time NUMERIC, -- From API response
  
  -- Request parameters (flexible JSONB for different task types)
  request_params JSONB,
  
  -- Results (S3 key for the result JSON file)
  result_s3_key TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS sportai_tasks_user_id_idx ON sportai_tasks(user_id);
CREATE INDEX IF NOT EXISTS sportai_tasks_status_idx ON sportai_tasks(status);
CREATE INDEX IF NOT EXISTS sportai_tasks_task_type_idx ON sportai_tasks(task_type);
CREATE INDEX IF NOT EXISTS sportai_tasks_sportai_task_id_idx ON sportai_tasks(sportai_task_id);

-- Enable RLS
ALTER TABLE sportai_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sportai tasks"
  ON sportai_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sportai tasks"
  ON sportai_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sportai tasks"
  ON sportai_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sportai tasks"
  ON sportai_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_sportai_tasks_updated_at
  BEFORE UPDATE ON sportai_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- MIGRATION: Add thumbnail columns for storing video first frame
-- Run this if you already have the sportai_tasks table
-- =============================================
-- ALTER TABLE sportai_tasks ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
-- ALTER TABLE sportai_tasks ADD COLUMN IF NOT EXISTS thumbnail_s3_key TEXT;

-- =============================================
-- MIGRATION: Add 'all' as valid sport for technique tasks
-- Run this if you already have the sportai_tasks table
-- =============================================
-- ALTER TABLE sportai_tasks DROP CONSTRAINT sportai_tasks_sport_check;
-- ALTER TABLE sportai_tasks ADD CONSTRAINT sportai_tasks_sport_check CHECK (sport IN ('tennis', 'padel', 'pickleball', 'all'));

-- =============================================
-- MIGRATION: Add video_s3_key column for URL refresh
-- Run this if you already have the sportai_tasks table
-- This allows refreshing expired presigned URLs
-- =============================================
-- ALTER TABLE sportai_tasks ADD COLUMN IF NOT EXISTS video_s3_key TEXT;

-- =============================================
-- PRICING_WAITLIST TABLE
-- Captures interest for upcoming PRO plans
-- =============================================
CREATE TABLE IF NOT EXISTS pricing_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  plan_interest TEXT NOT NULL CHECK (plan_interest IN ('pro-player', 'pro-coach')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate signups per plan
  UNIQUE(email, plan_interest)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS pricing_waitlist_email_idx ON pricing_waitlist(email);
CREATE INDEX IF NOT EXISTS pricing_waitlist_plan_interest_idx ON pricing_waitlist(plan_interest);

-- Enable RLS
ALTER TABLE pricing_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (no auth required for waitlist)
CREATE POLICY "Anyone can join waitlist"
  ON pricing_waitlist FOR INSERT
  WITH CHECK (true);