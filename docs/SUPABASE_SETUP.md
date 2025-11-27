# Supabase Setup Guide

This guide will walk you through setting up Supabase authentication with Google and Apple OAuth for SportAI.

## 1. Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API**
3. Copy your **Project URL** and **anon/public key**
4. Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 2. Database Setup

Run the SQL migration in your Supabase SQL Editor:

1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Copy and paste the contents of `/lib/supabase-schema.sql`
4. Run the query

This will create:
- `profiles` table for user data
- `chats` table for chat history
- `messages` table for chat messages
- Row Level Security (RLS) policies
- Database triggers for auto-creating profiles

## 3. Configure Google OAuth

### In Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure OAuth consent screen if needed
6. Application type: **Web application**
7. Add authorized redirect URIs:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
8. Copy your **Client ID** and **Client Secret**

### In Supabase Dashboard

1. Go to **Authentication** > **Providers**
2. Enable **Google**
3. Paste your **Client ID** and **Client Secret**
4. Save changes

## 4. Configure Apple Sign In

### In Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Create a **Services ID**
4. Enable **Sign in with Apple**
5. Configure domains and redirect URLs:
   - Domain: `your-project.supabase.co`
   - Redirect URL: `https://your-project.supabase.co/auth/v1/callback`
6. Create a **Key** for Sign in with Apple
7. Download the key file (.p8)

### In Supabase Dashboard

1. Go to **Authentication** > **Providers**
2. Enable **Apple**
3. Enter:
   - **Services ID**: Your Services ID from Apple
   - **Team ID**: Your Apple Team ID
   - **Key ID**: Your Key ID
   - **Private Key**: Contents of your .p8 file
4. Save changes

## 5. Test Authentication

1. Start your development server: `npm run dev`
2. Open your app in a browser
3. Click on the sign-in button
4. Test both Google and Apple sign-in
5. Check Supabase dashboard > **Authentication** > **Users** to verify

## 6. Site URL Configuration

In Supabase dashboard:

1. Go to **Authentication** > **URL Configuration**
2. Set **Site URL** to:
   - Development: `http://localhost:3000`
   - Production: Your production URL
3. Add redirect URLs if needed:
   - `http://localhost:3000/**`
   - `https://yourdomain.com/**`

## Migration from localStorage

When users sign in for the first time, they'll be prompted to migrate their local chats to the cloud. This happens automatically with the `syncLocalToSupabase()` function.

## Security Notes

- Never commit your `.env.local` file
- Only use the **anon key** in client-side code (never the service role key)
- RLS policies protect all user data automatically
- Presigned S3 URLs are regenerated on demand (don't store permanently)

## Troubleshooting

### OAuth redirect errors
- Verify redirect URLs match exactly in both provider console and Supabase
- Ensure Site URL is configured correctly

### RLS Policy errors
- Check that policies are enabled on all tables
- Verify `auth.uid()` is accessible in policies

### Migration issues
- Check browser console for detailed error messages
- Ensure user is authenticated before migration
- Verify database connection in network tab





