"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { clearUserDataFromStorage } from "@/utils/storage";

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
    maxRetries = 5
  ): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // For new users, the profile might not exist yet (created by trigger)
        // Retry with exponential backoff
        if (error.code === "PGRST116" && retryCount < maxRetries) {
          const delay = Math.min(500 * Math.pow(2, retryCount), 4000);
          console.log(`[AuthProvider] Profile not found, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchProfile(userId, retryCount + 1, maxRetries);
        }
        console.error("[AuthProvider] Error fetching profile:", error);
        return null;
      }

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

      // First, fetch current profile (will retry if not found immediately)
      let currentProfile = await fetchProfile(user.id);
      
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
        console.error("[AuthProvider] Failed to get or create profile");
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
          const response = await fetch("/api/profile/avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              avatarUrl: oauthAvatarUrl,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            newAvatarUrl = data.avatarUrl;
            console.log("[AuthProvider] Avatar uploaded to S3:", newAvatarUrl);
          } else {
            console.error("[AuthProvider] Failed to upload avatar:", await response.text());
          }
        } catch (error) {
          console.error("[AuthProvider] Error uploading avatar:", error);
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

      // Set profile even if we didn't update
      setProfile(currentProfile);
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
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch and sync profile data
        await syncProfileFromOAuth(session.user);
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("[AuthProvider] Auth state changed:", _event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (_event === "SIGNED_IN" && session?.user) {
        // Sync profile on sign in
        await syncProfileFromOAuth(session.user);
        // Dispatch custom event to notify components (like Sidebar) to refresh
        window.dispatchEvent(new CustomEvent("auth-state-change", { detail: { event: _event } }));
      } else if (_event === "SIGNED_OUT") {
        setProfile(null);
        // Dispatch custom event to notify components
        window.dispatchEvent(new CustomEvent("auth-state-change", { detail: { event: _event } }));
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

