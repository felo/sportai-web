"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createLogger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { track, analytics } from "@/lib/analytics";
import { clearUserDataFromStorage, migrateGuestTasks } from "@/utils/storage";
import { migrateChatIds } from "@/utils/chat-id-migration";

const authLogger = createLogger("Auth");

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database with optional retry for new users
  const fetchProfile = useCallback(async (
    userId: string, 
    retryCount = 0, 
    maxRetries = 3
  ): Promise<UserProfile | null> => {
    try {
      authLogger.debug(`fetchProfile attempt ${retryCount + 1}/${maxRetries + 1}`);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        authLogger.debug(`Profile fetch error:`, error.code, error.message);
        // For new users, the profile might not exist yet (created by trigger)
        // Retry on "not found" or auth errors
        const shouldRetry = (error.code === "PGRST116" || error.code === "PGRST301" || error.message?.includes("JWT")) && retryCount < maxRetries;
        
        if (shouldRetry) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
          authLogger.debug(`Retrying profile fetch in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchProfile(userId, retryCount + 1, maxRetries);
        }
        authLogger.error("Error fetching profile after retries:", error);
        return null;
      }

      authLogger.debug(`Profile fetched successfully from database:`, data?.email);
      return data as UserProfile;
    } catch (error) {
      authLogger.error("Exception fetching profile:", error);
      return null;
    }
  }, []);

  // Sync profile data from OAuth provider (Google)
  const syncProfileFromOAuth = useCallback(async (user: User): Promise<void> => {
    try {
      const metadata = user.user_metadata;
      const fullName = metadata?.full_name || metadata?.name;
      const oauthAvatarUrl = metadata?.avatar_url || metadata?.picture;

      authLogger.debug("Syncing profile from OAuth:", {
        userId: user.id,
        email: user.email,
        fullName,
        hasAvatarUrl: !!oauthAvatarUrl,
      });

      // Fetch current profile from database
      authLogger.debug("Fetching profile from database for user:", user.id);
      let currentProfile = await fetchProfile(user.id);
      authLogger.debug("Fetch result:", currentProfile ? "found" : "not found");
      
      // If profile doesn't exist after retries, create it manually
      if (!currentProfile) {
        authLogger.debug("Profile not found, attempting to create it...");
        
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
            full_name: fullName || null,
            avatar_url: null,
          })
          .select()
          .single();
          
        if (createError) {
          // Profile might already exist (race condition with trigger), try fetching again
          authLogger.debug("Create failed, trying to fetch again:", createError.message);
          currentProfile = await fetchProfile(user.id, 0, 2);
        } else {
          currentProfile = newProfile as UserProfile;
          authLogger.debug("Profile created successfully");
        }
      }
      
      if (!currentProfile) {
        authLogger.warn("Failed to get or create profile in database");
        authLogger.debug("User will continue with OAuth profile data");
        // Profile was already set from OAuth data before this background sync
        // No need to set it again
        return;
      }
      
      authLogger.debug("Profile ready:", currentProfile.id);

      // Check if we need to update the profile
      const needsNameUpdate = fullName && !currentProfile.full_name;
      const needsAvatarUpdate = oauthAvatarUrl && !currentProfile.avatar_url;

      if (!needsNameUpdate && !needsAvatarUpdate) {
        authLogger.debug("Profile already up to date");
        setProfile(currentProfile);
        return;
      }

      let newAvatarUrl = currentProfile.avatar_url;

      // Upload avatar to S3 if we have a new one
      if (needsAvatarUpdate && oauthAvatarUrl) {
        try {
          authLogger.debug("Uploading avatar to S3...");
          const uploadPromise = fetch("/api/profile/avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              avatarUrl: oauthAvatarUrl,
            }),
          });

          // Add timeout to prevent hanging
          const timeoutPromise = new Promise<Response>((_, reject) => 
            setTimeout(() => reject(new Error("Avatar upload timeout")), 10000)
          );

          const response = await Promise.race([uploadPromise, timeoutPromise]);

          if (response.ok) {
            const data = await response.json();
            newAvatarUrl = data.avatarUrl;
            authLogger.debug("Avatar uploaded to S3:", newAvatarUrl);
          } else {
            authLogger.error("Failed to upload avatar:", await response.text());
          }
        } catch (error) {
          authLogger.error("Error uploading avatar:", error);
          // Continue anyway - avatar upload is not critical
        }
      }

      // Update profile in database
      const updates: Partial<UserProfile> = {};
      if (needsNameUpdate && fullName) updates.full_name = fullName;
      if (newAvatarUrl && newAvatarUrl !== currentProfile.avatar_url) updates.avatar_url = newAvatarUrl;

      if (Object.keys(updates).length > 0) {
        authLogger.debug("Updating profile:", updates);
        const { data, error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", user.id)
          .select()
          .single();

        if (error) {
          authLogger.error("Error updating profile:", error);
        } else {
          authLogger.debug("Profile updated successfully");
          setProfile(data as UserProfile);
          return;
        }
      }

      // Update profile state (replacing the temporary OAuth profile)
      setProfile(currentProfile);
      authLogger.debug("Database profile synced and set in state:", currentProfile?.email);
    } catch (error) {
      authLogger.error("Error syncing profile:", error);
    }
  }, [fetchProfile]);

  // Refresh profile from database
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    if (profileData) {
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;
    let subscription: any = null;

    // Run chat ID migration on mount (for users already signed in)
    // This is a one-time migration that converts old chat IDs to UUID format
    const runMigrationOnMount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          authLogger.debug("Running chat ID migration on mount...");
          const stats = migrateChatIds();
          if (stats.migrated > 0) {
            authLogger.info(`Migrated ${stats.migrated} chat(s) on mount`);
          }
        }
      } catch (error) {
        authLogger.error("Failed to run migration on mount:", error);
      }
    };
    runMigrationOnMount();

    // Set up auth state change listener - this will catch OAuth callbacks
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      authLogger.debug("Auth state changed:", _event, session?.user?.email);
      
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // Handle different auth events
      // SIGNED_IN is fired when Supabase successfully processes OAuth callback
      if (_event === "SIGNED_IN" && session?.user) {
        authLogger.info("User signed in");
        
        // Track successful authentication
        track('auth_completed', {
          method: session.user.app_metadata?.provider || 'unknown',
          success: true,
        });
        
        // Identify user for analytics
        analytics.identify(session.user.id, {
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
        });
        
        // Clean up OAuth parameters from URL
        const url = new URL(window.location.href);
        if (url.searchParams.has('code') || url.searchParams.has('error')) {
          authLogger.debug("Cleaning up OAuth params from URL");
          url.searchParams.delete('code');
          url.searchParams.delete('error');
          url.searchParams.delete('error_code');
          url.searchParams.delete('error_description');
          window.history.replaceState({}, '', url.toString());
        }
        
        // Immediately create a temporary profile from OAuth data for instant UI update
        const metadata = session.user.user_metadata;
        const tempProfile: UserProfile = {
          id: session.user.id,
          email: session.user.email || null,
          full_name: metadata?.full_name || metadata?.name || null,
          avatar_url: metadata?.avatar_url || metadata?.picture || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        authLogger.debug("Setting temporary profile from OAuth data");
        setProfile(tempProfile);
        setLoading(false);
        
        // Migrate old chat IDs to UUID format before syncing
        authLogger.debug("Checking for chat ID migration...");
        try {
          const migrationStats = migrateChatIds();
          if (migrationStats.migrated > 0) {
            authLogger.info(`Migrated ${migrationStats.migrated} chat(s) to UUID format`);
          }
        } catch (error) {
          authLogger.error("Chat ID migration failed:", error);
          // Continue anyway - this won't block sign-in
        }
        
        // Migrate guest tasks to user's account (non-blocking)
        authLogger.debug("Checking for guest task migration...");
        migrateGuestTasks(session.user.id).then(result => {
          if (result.migrated > 0) {
            authLogger.info(`Migrated ${result.migrated} guest task(s) to account`);
          }
          if (!result.success) {
            authLogger.error("Guest task migration failed:", result.error);
          }
        }).catch(error => {
          authLogger.error("Guest task migration error:", error);
          // Continue anyway - guest tasks still work locally
        });
        
        // Dispatch event immediately so UI updates
        window.dispatchEvent(new CustomEvent("auth-state-change", { detail: { event: _event } }));
        authLogger.debug("UI updated, now syncing with database in background...");
        
        // Sync with database in background (non-blocking)
        syncProfileFromOAuth(session.user).catch(error => {
          authLogger.error("Background profile sync failed:", error);
          // UI already works with temp profile, so this is not critical
        });
      } else if (_event === "SIGNED_OUT") {
        authLogger.info("User signed out");
        
        // Track logout
        track('logout', {});
        
        // Reset analytics identity
        analytics.reset();
        
        setProfile(null);
        window.dispatchEvent(new CustomEvent("auth-state-change", { detail: { event: _event } }));
        setLoading(false);
      } else if (_event === "INITIAL_SESSION") {
        authLogger.debug("Initial session check");
        if (session?.user) {
          await syncProfileFromOAuth(session.user);
        }
        setLoading(false);
      }
    });
    
    subscription = authListener.subscription;

    // Check for existing session after a brief delay to let Supabase process URL params
    const timer = setTimeout(async () => {
      if (!mounted) return;
      const { data: { session } } = await supabase.auth.getSession();
      authLogger.debug("Initial getSession check:", session?.user?.email || "no session");
      
      // If we have a session, make sure state is updated (fallback in case event didn't fire)
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        await syncProfileFromOAuth(session.user);
        setLoading(false);
      } else if (!session) {
        // No session at all
        setLoading(false);
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription?.unsubscribe();
    };
  }, [syncProfileFromOAuth]);

  const signOut = async () => {
    // Clear user data from localStorage before signing out
    clearUserDataFromStorage();
    
    await supabase.auth.signOut();
    setProfile(null);
    
    // Reload the page to reset all state
    window.location.reload();
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
    refreshProfile,
  };

  // Debug: Log when context value changes
  useEffect(() => {
    authLogger.debug("Context value updated:", {
      hasUser: !!user,
      userEmail: user?.email,
      hasProfile: !!profile,
      profileName: profile?.full_name,
      loading,
    });
  }, [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

