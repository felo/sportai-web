"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { clearUserDataFromStorage } from "@/utils/storage";
import { migrateChatIds } from "@/utils/chat-id-migration";

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
      console.log(`[AuthProvider] fetchProfile attempt ${retryCount + 1}/${maxRetries + 1}`);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.log(`[AuthProvider] Profile fetch error:`, error.code, error.message);
        // For new users, the profile might not exist yet (created by trigger)
        // Retry on "not found" or auth errors
        const shouldRetry = (error.code === "PGRST116" || error.code === "PGRST301" || error.message?.includes("JWT")) && retryCount < maxRetries;
        
        if (shouldRetry) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
          console.log(`[AuthProvider] Retrying profile fetch in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchProfile(userId, retryCount + 1, maxRetries);
        }
        console.error("[AuthProvider] Error fetching profile after retries:", error);
        return null;
      }

      console.log(`[AuthProvider] Profile fetched successfully from database:`, data?.email);
      return data as UserProfile;
    } catch (error) {
      console.error("[AuthProvider] Exception fetching profile:", error);
      return null;
    }
  }, []);

  // Sync profile data from OAuth provider (Google)
  const syncProfileFromOAuth = useCallback(async (user: User): Promise<void> => {
    try {
      const metadata = user.user_metadata;
      const fullName = metadata?.full_name || metadata?.name;
      const oauthAvatarUrl = metadata?.avatar_url || metadata?.picture;

      console.log("[AuthProvider] Syncing profile from OAuth:", {
        userId: user.id,
        email: user.email,
        fullName,
        hasAvatarUrl: !!oauthAvatarUrl,
      });

      // Fetch current profile from database
      console.log("[AuthProvider] Fetching profile from database for user:", user.id);
      let currentProfile = await fetchProfile(user.id);
      console.log("[AuthProvider] Fetch result:", currentProfile ? "found" : "not found");
      
      // If profile doesn't exist after retries, create it manually
      if (!currentProfile) {
        console.log("[AuthProvider] Profile not found, attempting to create it...");
        
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
          console.log("[AuthProvider] Create failed, trying to fetch again:", createError.message);
          currentProfile = await fetchProfile(user.id, 0, 2);
        } else {
          currentProfile = newProfile as UserProfile;
          console.log("[AuthProvider] Profile created successfully");
        }
      }
      
      if (!currentProfile) {
        console.warn("[AuthProvider] Failed to get or create profile in database");
        console.log("[AuthProvider] User will continue with OAuth profile data");
        // Profile was already set from OAuth data before this background sync
        // No need to set it again
        return;
      }
      
      console.log("[AuthProvider] Profile ready:", currentProfile.id);

      // Check if we need to update the profile
      const needsNameUpdate = fullName && !currentProfile.full_name;
      const needsAvatarUpdate = oauthAvatarUrl && !currentProfile.avatar_url;

      if (!needsNameUpdate && !needsAvatarUpdate) {
        console.log("[AuthProvider] Profile already up to date");
        setProfile(currentProfile);
        return;
      }

      let newAvatarUrl = currentProfile.avatar_url;

      // Upload avatar to S3 if we have a new one
      if (needsAvatarUpdate && oauthAvatarUrl) {
        try {
          console.log("[AuthProvider] Uploading avatar to S3...");
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
            console.log("[AuthProvider] Avatar uploaded to S3:", newAvatarUrl);
          } else {
            console.error("[AuthProvider] Failed to upload avatar:", await response.text());
          }
        } catch (error) {
          console.error("[AuthProvider] Error uploading avatar:", error);
          // Continue anyway - avatar upload is not critical
        }
      }

      // Update profile in database
      const updates: Partial<UserProfile> = {};
      if (needsNameUpdate && fullName) updates.full_name = fullName;
      if (newAvatarUrl && newAvatarUrl !== currentProfile.avatar_url) updates.avatar_url = newAvatarUrl;

      if (Object.keys(updates).length > 0) {
        console.log("[AuthProvider] Updating profile:", updates);
        const { data, error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", user.id)
          .select()
          .single();

        if (error) {
          console.error("[AuthProvider] Error updating profile:", error);
        } else {
          console.log("[AuthProvider] Profile updated successfully");
          setProfile(data as UserProfile);
          return;
        }
      }

      // Update profile state (replacing the temporary OAuth profile)
      setProfile(currentProfile);
      console.log("[AuthProvider] Database profile synced and set in state:", currentProfile?.email);
    } catch (error) {
      console.error("[AuthProvider] Error syncing profile:", error);
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
          console.log("[AuthProvider] Running chat ID migration on mount...");
          const stats = migrateChatIds();
          if (stats.migrated > 0) {
            console.log(`[AuthProvider] ✅ Migrated ${stats.migrated} chat(s) on mount`);
          }
        }
      } catch (error) {
        console.error("[AuthProvider] Failed to run migration on mount:", error);
      }
    };
    runMigrationOnMount();

    // Set up auth state change listener - this will catch OAuth callbacks
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("[AuthProvider] Auth state changed:", _event, session?.user?.email);
      
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // Handle different auth events
      // SIGNED_IN is fired when Supabase successfully processes OAuth callback
      if (_event === "SIGNED_IN" && session?.user) {
        console.log("[AuthProvider] User signed in");
        
        // Clean up OAuth parameters from URL
        const url = new URL(window.location.href);
        if (url.searchParams.has('code') || url.searchParams.has('error')) {
          console.log("[AuthProvider] Cleaning up OAuth params from URL");
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
        
        console.log("[AuthProvider] Setting temporary profile from OAuth data");
        setProfile(tempProfile);
        setLoading(false);
        
        // Migrate old chat IDs to UUID format before syncing
        console.log("[AuthProvider] Checking for chat ID migration...");
        try {
          const migrationStats = migrateChatIds();
          if (migrationStats.migrated > 0) {
            console.log(`[AuthProvider] ✅ Migrated ${migrationStats.migrated} chat(s) to UUID format`);
          }
        } catch (error) {
          console.error("[AuthProvider] ❌ Chat ID migration failed:", error);
          // Continue anyway - this won't block sign-in
        }
        
        // Dispatch event immediately so UI updates
        window.dispatchEvent(new CustomEvent("auth-state-change", { detail: { event: _event } }));
        console.log("[AuthProvider] UI updated, now syncing with database in background...");
        
        // Sync with database in background (non-blocking)
        syncProfileFromOAuth(session.user).catch(error => {
          console.error("[AuthProvider] Background profile sync failed:", error);
          // UI already works with temp profile, so this is not critical
        });
      } else if (_event === "SIGNED_OUT") {
        console.log("[AuthProvider] User signed out");
        setProfile(null);
        window.dispatchEvent(new CustomEvent("auth-state-change", { detail: { event: _event } }));
        setLoading(false);
      } else if (_event === "INITIAL_SESSION") {
        console.log("[AuthProvider] Initial session check");
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
      console.log("[AuthProvider] Initial getSession check:", session?.user?.email || "no session");
      
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
    console.log("[AuthProvider] Context value updated:", {
      hasUser: !!user,
      userEmail: user?.email,
      hasProfile: !!profile,
      profileName: profile?.full_name,
      loading,
    });
  }, [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

