# OAuth Setup Quickstart

## Prerequisites

1. Supabase project created and running
2. Environment variables set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Google OAuth Setup (5 minutes)

### 1. Google Cloud Console

1. Go to https://console.cloud.google.com/
2. Create/select project
3. Go to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
7. Copy **Client ID** and **Client Secret**

### 2. Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **Authentication** > **Providers**
3. Find **Google** and enable it
4. Paste **Client ID** and **Client Secret**
5. Click **Save**

## Apple Sign In Setup (10 minutes)

### 1. Apple Developer Portal

1. Go to https://developer.apple.com/account/
2. Navigate to **Certificates, Identifiers & Profiles**
3. Create a **Services ID**:
   - Description: Your App Name
   - Identifier: `com.yourapp.services`
4. Enable **Sign in with Apple**
5. Configure Web Authentication:
   - Domains: `YOUR-PROJECT-REF.supabase.co`
   - Return URLs: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
6. Create a **Key** for Sign in with Apple:
   - Key Name: Apple Sign In Key
   - Enable **Sign in with Apple**
   - Configure: Select your Services ID
7. Download the `.p8` key file (keep it secure!)

### 2. Get Team ID and Key ID

- **Team ID**: Found in top-right of Apple Developer portal
- **Key ID**: Shown when you create the key

### 3. Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **Authentication** > **Providers**
3. Find **Apple** and enable it
4. Enter:
   - **Services ID**: `com.yourapp.services` (from step 1.3)
   - **Team ID**: Your Apple Team ID
   - **Key ID**: Your Key ID (from step 1.6)
   - **Private Key**: Open `.p8` file and paste entire contents
5. Click **Save**

## Testing

1. Start your app: `npm run dev`
2. Click **Sign In** button
3. Try signing in with Google and Apple
4. Check Supabase **Authentication** > **Users** to verify

## Troubleshooting

### Google: "redirect_uri_mismatch"
- Verify redirect URI in Google Console matches Supabase exactly
- Check for trailing slashes or http vs https

### Apple: "invalid_client"
- Verify Services ID, Team ID, and Key ID are correct
- Ensure `.p8` private key is pasted correctly (entire file contents)
- Check domain and return URLs in Apple configuration

### General: OAuth callback not working
- Verify `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` is correct
- Clear browser cache and cookies
- Try incognito/private browsing mode

## Production Deployment

1. Update redirect URLs in Google Console to include production domain
2. Update domains in Apple Developer Portal to include production domain
3. Update **Site URL** in Supabase **Authentication** > **URL Configuration**
4. Test OAuth flows in production environment

## Next Steps

- Customize user profile fields in database
- Add user avatars/profile pictures
- Implement role-based access control
- Set up email notifications for new sign-ins




