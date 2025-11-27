# Cloud Sync Fix - Profile Race Condition

## Issue
When signing in with OAuth and choosing to sync chats to cloud, the sync would fail silently. The chats appeared to be syncing (progress bar completed), but they were never actually saved to Supabase.

## Root Cause
The issue was a **race condition** between profile creation and chat migration:

1. User signs in with OAuth (Google/Apple)
2. Supabase creates the authentication session
3. A database trigger (`handle_new_user()`) creates a profile record **asynchronously**
4. The `MigrationPrompt` component shows immediately after sign-in
5. User clicks "Sync to Cloud"
6. Migration attempts to save chats to the `chats` table
7. **The `chats` table has a foreign key constraint to `profiles(id)`**
8. If the profile hasn't been created yet, the insert fails with error code `23503` (foreign key violation)
9. The error was logged but not surfaced to the user, and the migration continued as if successful

## Database Schema Context

```sql
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- ... other fields
);
```

The foreign key constraint means we **cannot** insert a chat until the profile exists.

## The Fix

### 1. Added Profile Existence Check (`utils/migration.ts`)

Created a new `waitForProfile()` function that:
- Checks if the user's profile exists in the database
- Retries up to 10 times with 500ms delays (total: 5 seconds)
- Returns `true` if profile is found, `false` otherwise

```typescript
async function waitForProfile(
  userId: string,
  maxRetries: number = 10,
  delayMs: number = 500
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (data && !error) {
      return true;
    }

    if (error?.code === "PGRST116") { // Not found
      await new Promise(resolve => setTimeout(resolve, delayMs));
      continue;
    }

    return false;
  }
  return false;
}
```

### 2. Updated Migration Flow

Modified `syncLocalToSupabase()` to wait for the profile before attempting migration:

```typescript
export async function syncLocalToSupabase(userId: string, onProgress) {
  // First, ensure the user's profile exists
  const profileExists = await waitForProfile(userId);
  
  if (!profileExists) {
    return {
      status: "error",
      error: "Profile not found. Please try signing out and signing in again."
    };
  }
  
  // Now proceed with migration...
}
```

### 3. Enhanced Error Logging

Improved error messages in `storage-supabase.ts` to clearly indicate when a foreign key error occurs:

```typescript
if (chatError.code === "23503") {
  console.error("[Supabase] Foreign key error - profile does not exist for user:", userId);
  console.error("[Supabase] This usually happens if sync happens too quickly after sign-in.");
}
```

## Testing

To test the fix:

1. **Clear all browser data** (or use incognito mode)
2. **Create some local chats** (before signing in)
3. **Sign in with Google/Apple**
4. **Wait for the migration prompt** to appear
5. **Click "Sync to Cloud"**
6. **Check the browser console** for migration logs:
   - Should see: `[Migration] Checking for profile (attempt 1/10)...`
   - Should see: `[Migration] Profile found, ready to migrate`
   - Should see: `[Migration] Syncing chats...`
   - Should see: `[Supabase] Chat upserted successfully`
7. **Verify chats are in Supabase** by checking the Supabase dashboard or signing in from another device

## Expected Console Output (Success)

```
[AuthProvider] Auth state changed: SIGNED_IN user@example.com
[Migration] Waiting for user profile to be created...
[Migration] Checking for profile (attempt 1/10)...
[Migration] Profile found, ready to migrate
[Migration] Starting migration of 3 chats
[Supabase] Saving chat: abc123 for user: xyz789
[Supabase] Chat upserted successfully
[Supabase] Inserting 5 messages
[Supabase] Messages inserted successfully
... (repeated for each chat)
```

## Expected Console Output (Profile Not Found - Should Be Rare)

```
[Migration] Checking for profile (attempt 1/10)...
[Migration] Profile not found yet, retrying in 500ms...
[Migration] Checking for profile (attempt 2/10)...
[Migration] Profile not found yet, retrying in 500ms...
...
[Migration] Profile not found after 10 attempts
Error: Profile not found. Please try signing out and signing in again.
```

## Why This Should Work

1. **Database trigger is fast**: The `handle_new_user()` trigger typically executes within 100-500ms
2. **Generous retry window**: 10 retries × 500ms = 5 seconds total wait time
3. **User doesn't notice**: The migration progress indicator already shows "Migrating...", so the brief wait is transparent
4. **Graceful degradation**: If profile truly doesn't exist after 5 seconds, show clear error message

## Alternative Solutions Considered

### Option 1: Delay the Migration Prompt (Rejected)
- Could delay showing the prompt for 1-2 seconds after sign-in
- **Problem**: Still a race condition, just less likely. Not robust.

### Option 2: Remove Foreign Key Constraint (Rejected)
- Could make `user_id` nullable or remove the FK constraint
- **Problem**: Loses referential integrity. Bad database design.

### Option 3: Create Profile Client-Side (Rejected)
- Could have `AuthProvider` create the profile if it doesn't exist
- **Problem**: Race condition with trigger. Could create duplicates.

### Option 4: Wait for Profile Before Showing Prompt (Considered)
- Could check for profile before showing `MigrationPrompt`
- **Problem**: Adds delay to every sign-in, even for users without local chats
- **Our solution is better**: Only wait when actually migrating (on-demand)

## Related Files

- `utils/migration.ts` - Migration logic with profile waiting
- `utils/storage-supabase.ts` - Supabase storage functions
- `components/auth/MigrationPrompt.tsx` - UI component
- `components/auth/AuthProvider.tsx` - Authentication state management
- `lib/supabase-schema.sql` - Database schema with FK constraints

## Future Improvements

1. **Add UI feedback**: Show "Preparing to sync..." message while waiting for profile
2. **Retry individual chats**: If one chat fails, continue with others and show partial success
3. **Background sync**: Automatically retry failed syncs in the background
4. **Conflict resolution**: Better handling of chats that exist in both local and cloud




