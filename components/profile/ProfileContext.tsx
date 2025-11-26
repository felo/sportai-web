"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import type {
  FullProfile,
  PlayerProfile,
  PlayerSport,
  PlayerEquipment,
  CoachProfile,
  CoachSport,
  BusinessProfile,
  UpdatePlayerProfilePayload,
  CreatePlayerSportPayload,
  UpdatePlayerSportPayload,
  CreateEquipmentPayload,
  UpdateEquipmentPayload,
  UpsertCoachProfilePayload,
  UpsertCoachSportPayload,
  UpsertBusinessProfilePayload,
} from "@/types/profile";

interface ProfileContextValue {
  // State
  profile: FullProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  
  // Player profile actions
  fetchProfile: () => Promise<void>;
  updatePlayerProfile: (data: UpdatePlayerProfilePayload) => Promise<boolean>;
  
  // Sports actions
  addSport: (data: CreatePlayerSportPayload) => Promise<PlayerSport | null>;
  updateSport: (data: UpdatePlayerSportPayload) => Promise<PlayerSport | null>;
  deleteSport: (sportId: string) => Promise<boolean>;
  
  // Equipment actions
  addEquipment: (data: CreateEquipmentPayload) => Promise<PlayerEquipment | null>;
  updateEquipment: (data: UpdateEquipmentPayload) => Promise<PlayerEquipment | null>;
  deleteEquipment: (equipmentId: string) => Promise<boolean>;
  
  // Coach actions
  upsertCoachProfile: (data: UpsertCoachProfilePayload) => Promise<CoachProfile | null>;
  deleteCoachProfile: () => Promise<boolean>;
  upsertCoachSport: (data: UpsertCoachSportPayload) => Promise<CoachSport | null>;
  
  // Business actions
  upsertBusinessProfile: (data: UpsertBusinessProfilePayload) => Promise<BusinessProfile | null>;
  deleteBusinessProfile: () => Promise<boolean>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch full profile using Supabase client directly
  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all profile data in parallel
      const [
        profileResult,
        sportsResult,
        equipmentResult,
        coachResult,
        coachSportsResult,
        businessResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("player_sports").select("*").eq("profile_id", user.id),
        supabase.from("player_equipment").select("*").eq("profile_id", user.id),
        supabase.from("coach_profiles").select("*").eq("profile_id", user.id).maybeSingle(),
        supabase.from("coach_sports").select("*").eq("coach_profile_id", user.id),
        supabase.from("business_profiles").select("*").eq("profile_id", user.id).maybeSingle(),
      ]);
      
      if (profileResult.error) {
        console.error("Error fetching profile:", profileResult.error);
        setError("Failed to load profile");
        // Create default empty profile structure
        setProfile({
          player: {
            id: user.id,
            email: user.email || null,
            full_name: null,
            avatar_url: null,
            date_of_birth: null,
            gender: null,
            handedness: null,
            height: null,
            weight: null,
            physical_limitations: null,
            units_preference: "metric",
            country: null,
            timezone: null,
            language: "en",
            is_parent_of_junior: false,
            referral_source: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          sports: [],
          equipment: [],
          coach: null,
          coachSports: [],
          business: null,
        });
      } else {
        // Map database response to FullProfile structure
        const playerData = profileResult.data;
        const playerProfile: PlayerProfile = {
          id: playerData.id,
          email: playerData.email,
          full_name: playerData.full_name,
          avatar_url: playerData.avatar_url,
          date_of_birth: (playerData as Record<string, unknown>).date_of_birth as string | null ?? null,
          gender: (playerData as Record<string, unknown>).gender as PlayerProfile["gender"] ?? null,
          handedness: (playerData as Record<string, unknown>).handedness as PlayerProfile["handedness"] ?? null,
          height: (playerData as Record<string, unknown>).height as number | null ?? null,
          weight: (playerData as Record<string, unknown>).weight as number | null ?? null,
          physical_limitations: (playerData as Record<string, unknown>).physical_limitations as string | null ?? null,
          units_preference: ((playerData as Record<string, unknown>).units_preference as PlayerProfile["units_preference"]) ?? "metric",
          country: (playerData as Record<string, unknown>).country as string | null ?? null,
          timezone: (playerData as Record<string, unknown>).timezone as string | null ?? null,
          language: ((playerData as Record<string, unknown>).language as string) ?? "en",
          is_parent_of_junior: ((playerData as Record<string, unknown>).is_parent_of_junior as boolean) ?? false,
          referral_source: (playerData as Record<string, unknown>).referral_source as PlayerProfile["referral_source"] ?? null,
          created_at: playerData.created_at,
          updated_at: playerData.updated_at,
        };
        
        setProfile({
          player: playerProfile,
          sports: (sportsResult.data || []) as PlayerSport[],
          equipment: (equipmentResult.data || []) as PlayerEquipment[],
          coach: coachResult.data as CoachProfile | null,
          coachSports: (coachSportsResult.data || []) as CoachSport[],
          business: businessResult.data as BusinessProfile | null,
        });
      }
    } catch (err) {
      console.error("Error in fetchProfile:", err);
      setError("Failed to load profile");
    }
    
    setLoading(false);
  }, [user?.id, user?.email]);
  
  // Update player profile
  const updatePlayerProfile = useCallback(async (
    data: UpdatePlayerProfilePayload
  ): Promise<boolean> => {
    if (!user?.id) return false;
    
    setSaving(true);
    setError(null);
    
    try {
      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error("Error updating profile:", updateError);
        setError(updateError.message);
        setSaving(false);
        return false;
      }
      
      if (updated) {
        setProfile(prev => prev ? {
          ...prev,
          player: { ...prev.player, ...data } as PlayerProfile,
        } : null);
      }
      
      setSaving(false);
      return true;
    } catch (err) {
      console.error("Error in updatePlayerProfile:", err);
      setError("Failed to update profile");
      setSaving(false);
      return false;
    }
  }, [user?.id]);
  
  // Add sport
  const addSport = useCallback(async (
    data: CreatePlayerSportPayload
  ): Promise<PlayerSport | null> => {
    if (!user?.id) return null;
    
    setSaving(true);
    setError(null);
    
    try {
      const { data: newSport, error: addError } = await supabase
        .from("player_sports")
        .insert({
          profile_id: user.id,
          sport: data.sport,
          skill_level: data.skill_level,
          years_playing: data.years_playing,
          club_name: data.club_name,
          playing_style: data.playing_style,
          preferred_surfaces: data.preferred_surfaces || [],
          goals: data.goals || [],
        })
        .select()
        .single();
      
      if (addError) {
        console.error("Error adding sport:", addError);
        if (addError.code === "23505") {
          setError("You already have this sport in your profile");
        } else {
          setError(addError.message);
        }
        setSaving(false);
        return null;
      }
      
      if (newSport) {
        setProfile(prev => prev ? { 
          ...prev, 
          sports: [...prev.sports, newSport as PlayerSport] 
        } : null);
      }
      
      setSaving(false);
      return newSport as PlayerSport;
    } catch (err) {
      console.error("Error in addSport:", err);
      setError("Failed to add sport");
      setSaving(false);
      return null;
    }
  }, [user?.id]);
  
  // Update sport
  const updateSport = useCallback(async (
    data: UpdatePlayerSportPayload
  ): Promise<PlayerSport | null> => {
    if (!user?.id) return null;
    
    setSaving(true);
    setError(null);
    
    try {
      const { id, ...updateData } = data;
      
      const { data: updated, error: updateError } = await supabase
        .from("player_sports")
        .update(updateData)
        .eq("id", id)
        .eq("profile_id", user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error("Error updating sport:", updateError);
        setError(updateError.message);
        setSaving(false);
        return null;
      }
      
      if (updated) {
        setProfile(prev => prev ? {
          ...prev,
          sports: prev.sports.map(s => s.id === updated.id ? updated as PlayerSport : s),
        } : null);
      }
      
      setSaving(false);
      return updated as PlayerSport;
    } catch (err) {
      console.error("Error in updateSport:", err);
      setError("Failed to update sport");
      setSaving(false);
      return null;
    }
  }, [user?.id]);
  
  // Delete sport
  const deleteSport = useCallback(async (sportId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    setSaving(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from("player_sports")
        .delete()
        .eq("id", sportId)
        .eq("profile_id", user.id);
      
      if (deleteError) {
        console.error("Error deleting sport:", deleteError);
        setError(deleteError.message);
        setSaving(false);
        return false;
      }
      
      setProfile(prev => prev ? {
        ...prev,
        sports: prev.sports.filter(s => s.id !== sportId),
      } : null);
      
      setSaving(false);
      return true;
    } catch (err) {
      console.error("Error in deleteSport:", err);
      setError("Failed to delete sport");
      setSaving(false);
      return false;
    }
  }, [user?.id]);
  
  // Add equipment
  const addEquipment = useCallback(async (
    data: CreateEquipmentPayload
  ): Promise<PlayerEquipment | null> => {
    if (!user?.id) return null;
    
    setSaving(true);
    setError(null);
    
    try {
      const { data: newEquipment, error: addError } = await supabase
        .from("player_equipment")
        .insert({
          profile_id: user.id,
          sport: data.sport,
          equipment_type: data.equipment_type,
          brand: data.brand,
          model_name: data.model_name,
          notes: data.notes || null,
        })
        .select()
        .single();
      
      if (addError) {
        console.error("Error adding equipment:", addError);
        setError(addError.message);
        setSaving(false);
        return null;
      }
      
      if (newEquipment) {
        setProfile(prev => prev ? { 
          ...prev, 
          equipment: [...prev.equipment, newEquipment as PlayerEquipment] 
        } : null);
      }
      
      setSaving(false);
      return newEquipment as PlayerEquipment;
    } catch (err) {
      console.error("Error in addEquipment:", err);
      setError("Failed to add equipment");
      setSaving(false);
      return null;
    }
  }, [user?.id]);
  
  // Update equipment
  const updateEquipment = useCallback(async (
    data: UpdateEquipmentPayload
  ): Promise<PlayerEquipment | null> => {
    if (!user?.id) return null;
    
    setSaving(true);
    setError(null);
    
    try {
      const { id, ...updateData } = data;
      
      const { data: updated, error: updateError } = await supabase
        .from("player_equipment")
        .update(updateData)
        .eq("id", id)
        .eq("profile_id", user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error("Error updating equipment:", updateError);
        setError(updateError.message);
        setSaving(false);
        return null;
      }
      
      if (updated) {
        setProfile(prev => prev ? {
          ...prev,
          equipment: prev.equipment.map(e => e.id === updated.id ? updated as PlayerEquipment : e),
        } : null);
      }
      
      setSaving(false);
      return updated as PlayerEquipment;
    } catch (err) {
      console.error("Error in updateEquipment:", err);
      setError("Failed to update equipment");
      setSaving(false);
      return null;
    }
  }, [user?.id]);
  
  // Delete equipment
  const deleteEquipment = useCallback(async (equipmentId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    setSaving(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from("player_equipment")
        .delete()
        .eq("id", equipmentId)
        .eq("profile_id", user.id);
      
      if (deleteError) {
        console.error("Error deleting equipment:", deleteError);
        setError(deleteError.message);
        setSaving(false);
        return false;
      }
      
      setProfile(prev => prev ? {
        ...prev,
        equipment: prev.equipment.filter(e => e.id !== equipmentId),
      } : null);
      
      setSaving(false);
      return true;
    } catch (err) {
      console.error("Error in deleteEquipment:", err);
      setError("Failed to delete equipment");
      setSaving(false);
      return false;
    }
  }, [user?.id]);
  
  // Upsert coach profile
  const upsertCoachProfile = useCallback(async (
    data: UpsertCoachProfilePayload
  ): Promise<CoachProfile | null> => {
    if (!user?.id) return null;
    
    setSaving(true);
    setError(null);
    
    try {
      const coachData = {
        profile_id: user.id,
        is_active: data.is_active ?? true,
        years_experience: data.years_experience,
        coaching_level: data.coaching_level,
        employment_type: data.employment_type,
        client_count: data.client_count,
        specialties: data.specialties || [],
        affiliation: data.affiliation,
        uses_video_analysis: data.uses_video_analysis ?? false,
      };
      
      const { data: coach, error: upsertError } = await supabase
        .from("coach_profiles")
        .upsert(coachData, { onConflict: "profile_id" })
        .select()
        .single();
      
      if (upsertError) {
        console.error("Error upserting coach profile:", upsertError);
        setError(upsertError.message);
        setSaving(false);
        return null;
      }
      
      if (coach) {
        setProfile(prev => prev ? { ...prev, coach: coach as CoachProfile } : null);
      }
      
      setSaving(false);
      return coach as CoachProfile;
    } catch (err) {
      console.error("Error in upsertCoachProfile:", err);
      setError("Failed to update coach profile");
      setSaving(false);
      return null;
    }
  }, [user?.id]);
  
  // Delete coach profile
  const deleteCoachProfile = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;
    
    setSaving(true);
    setError(null);
    
    try {
      // Delete coach sports first
      await supabase
        .from("coach_sports")
        .delete()
        .eq("coach_profile_id", user.id);
      
      const { error: deleteError } = await supabase
        .from("coach_profiles")
        .delete()
        .eq("profile_id", user.id);
      
      if (deleteError) {
        console.error("Error deleting coach profile:", deleteError);
        setError(deleteError.message);
        setSaving(false);
        return false;
      }
      
      setProfile(prev => prev ? { ...prev, coach: null, coachSports: [] } : null);
      
      setSaving(false);
      return true;
    } catch (err) {
      console.error("Error in deleteCoachProfile:", err);
      setError("Failed to delete coach profile");
      setSaving(false);
      return false;
    }
  }, [user?.id]);
  
  // Upsert coach sport
  const upsertCoachSport = useCallback(async (
    data: UpsertCoachSportPayload
  ): Promise<CoachSport | null> => {
    if (!user?.id) return null;
    
    setSaving(true);
    setError(null);
    
    try {
      const { data: coachSport, error: upsertError } = await supabase
        .from("coach_sports")
        .upsert(
          {
            coach_profile_id: user.id,
            sport: data.sport,
            certifications: data.certifications || [],
          },
          { onConflict: "coach_profile_id,sport" }
        )
        .select()
        .single();
      
      if (upsertError) {
        console.error("Error upserting coach sport:", upsertError);
        setError(upsertError.message);
        setSaving(false);
        return null;
      }
      
      if (coachSport) {
        setProfile(prev => {
          if (!prev) return null;
          const existingIndex = prev.coachSports.findIndex(
            cs => cs.sport === (coachSport as CoachSport).sport
          );
          
          if (existingIndex >= 0) {
            const updated = [...prev.coachSports];
            updated[existingIndex] = coachSport as CoachSport;
            return { ...prev, coachSports: updated };
          } else {
            return { ...prev, coachSports: [...prev.coachSports, coachSport as CoachSport] };
          }
        });
      }
      
      setSaving(false);
      return coachSport as CoachSport;
    } catch (err) {
      console.error("Error in upsertCoachSport:", err);
      setError("Failed to update coach sport");
      setSaving(false);
      return null;
    }
  }, [user?.id]);
  
  // Upsert business profile
  const upsertBusinessProfile = useCallback(async (
    data: UpsertBusinessProfilePayload
  ): Promise<BusinessProfile | null> => {
    if (!user?.id || !data.company_name) return null;
    
    setSaving(true);
    setError(null);
    
    try {
      const businessData = {
        profile_id: user.id,
        company_name: data.company_name,
        website: data.website || null,
        role: data.role,
        company_size: data.company_size,
        country: data.country,
        business_type: data.business_type,
        use_cases: data.use_cases || [],
      };
      
      const { data: business, error: upsertError } = await supabase
        .from("business_profiles")
        .upsert(businessData, { onConflict: "profile_id" })
        .select()
        .single();
      
      if (upsertError) {
        console.error("Error upserting business profile:", upsertError);
        setError(upsertError.message);
        setSaving(false);
        return null;
      }
      
      if (business) {
        setProfile(prev => prev ? { ...prev, business: business as BusinessProfile } : null);
      }
      
      setSaving(false);
      return business as BusinessProfile;
    } catch (err) {
      console.error("Error in upsertBusinessProfile:", err);
      setError("Failed to update business profile");
      setSaving(false);
      return null;
    }
  }, [user?.id]);
  
  // Delete business profile
  const deleteBusinessProfile = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;
    
    setSaving(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from("business_profiles")
        .delete()
        .eq("profile_id", user.id);
      
      if (deleteError) {
        console.error("Error deleting business profile:", deleteError);
        setError(deleteError.message);
        setSaving(false);
        return false;
      }
      
      setProfile(prev => prev ? { ...prev, business: null } : null);
      
      setSaving(false);
      return true;
    } catch (err) {
      console.error("Error in deleteBusinessProfile:", err);
      setError("Failed to delete business profile");
      setSaving(false);
      return false;
    }
  }, [user?.id]);
  
  // Auto-fetch profile on mount when user is available
  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user?.id, fetchProfile]);
  
  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        saving,
        error,
        fetchProfile,
        updatePlayerProfile,
        addSport,
        updateSport,
        deleteSport,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        upsertCoachProfile,
        deleteCoachProfile,
        upsertCoachSport,
        upsertBusinessProfile,
        deleteBusinessProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfileContext must be used within a ProfileProvider");
  }
  return context;
}

