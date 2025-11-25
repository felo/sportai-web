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
  
  -- Video-related fields
  video_url TEXT,
  video_s3_key TEXT,
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
  pose_data JSONB
);

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

