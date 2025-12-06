"use client";

import { useState, useCallback, useEffect } from "react";
import { profileLogger } from "@/lib/logger";
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

interface UseProfileReturn {
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

export function useProfile(): UseProfileReturn {
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
        profileLogger.error("Error fetching profile:", profileResult.error);
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
        // Handle potentially missing columns by providing defaults
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
      profileLogger.error("Error in fetchProfile:", err);
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
        profileLogger.error("Error updating profile:", updateError);
        setError(updateError.message);
        setSaving(false);
        return false;
      }
      
      if (updated && profile) {
        // Merge updated fields with existing profile data
        setProfile({
          ...profile,
          player: { ...profile.player, ...data } as PlayerProfile,
        });
      }
      
      setSaving(false);
      return true;
    } catch (err) {
      profileLogger.error("Error in updatePlayerProfile:", err);
      setError("Failed to update profile");
      setSaving(false);
      return false;
    }
  }, [user?.id, profile]);
  
  // Add sport
  const addSport = useCallback(async (
    data: CreatePlayerSportPayload
  ): Promise<PlayerSport | null> => {
    if (!user?.id) return null;
    
    setSaving(true);
    setError(null);
    
    try {
      // Cast sport to database type - the database CHECK constraint will validate
      const dbSport = data.sport as "tennis" | "padel" | "pickleball";
      
      const { data: newSport, error: addError } = await supabase
        .from("player_sports")
        .insert({
          profile_id: user.id,
          sport: dbSport,
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
        profileLogger.error("Error adding sport:", addError);
        if (addError.code === "23505") {
          setError("You already have this sport in your profile");
        } else {
          setError(addError.message);
        }
        setSaving(false);
        return null;
      }
      
      if (newSport && profile) {
        setProfile({ ...profile, sports: [...profile.sports, newSport as PlayerSport] });
      }
      
      setSaving(false);
      return newSport as PlayerSport;
    } catch (err) {
      profileLogger.error("Error in addSport:", err);
      setError("Failed to add sport");
      setSaving(false);
      return null;
    }
  }, [user?.id, profile]);
  
  // Update sport
  const updateSport = useCallback(async (
    data: UpdatePlayerSportPayload
  ): Promise<PlayerSport | null> => {
    if (!user?.id) return null;
    
    setSaving(true);
    setError(null);
    
    try {
      const { id, sport, ...restData } = data;
      
      // Prepare update data, casting sport to database type if present
      const updateData = {
        ...restData,
        ...(sport !== undefined && { sport: sport as "tennis" | "padel" | "pickleball" }),
      };
      
      const { data: updated, error: updateError } = await supabase
        .from("player_sports")
        .update(updateData)
        .eq("id", id)
        .eq("profile_id", user.id)
        .select()
        .single();
      
      if (updateError) {
        profileLogger.error("Error updating sport:", updateError);
        setError(updateError.message);
        setSaving(false);
        return null;
      }
      
      if (updated && profile) {
        setProfile({
          ...profile,
          sports: profile.sports.map(s => s.id === updated.id ? updated as PlayerSport : s),
        });
      }
      
      setSaving(false);
      return updated as PlayerSport;
    } catch (err) {
      profileLogger.error("Error in updateSport:", err);
      setError("Failed to update sport");
      setSaving(false);
      return null;
    }
  }, [user?.id, profile]);
  
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
        profileLogger.error("Error deleting sport:", deleteError);
        setError(deleteError.message);
        setSaving(false);
        return false;
      }
      
      if (profile) {
        setProfile({
          ...profile,
          sports: profile.sports.filter(s => s.id !== sportId),
        });
      }
      
      setSaving(false);
      return true;
    } catch (err) {
      profileLogger.error("Error in deleteSport:", err);
      setError("Failed to delete sport");
      setSaving(false);
      return false;
    }
  }, [user?.id, profile]);
  
  // Add equipment
  const addEquipment = useCallback(async (
    data: CreateEquipmentPayload
  ): Promise<PlayerEquipment | null> => {
    if (!user?.id) return null;
    
    setSaving(true);
    setError(null);
    
    try {
      // Cast sport to database type - the database CHECK constraint will validate
      const dbSport = data.sport as "tennis" | "padel" | "pickleball";
      
      const { data: newEquipment, error: addError } = await supabase
        .from("player_equipment")
        .insert({
          profile_id: user.id,
          sport: dbSport,
          equipment_type: data.equipment_type,
          brand: data.brand,
          model_name: data.model_name,
          notes: data.notes || null,
        })
        .select()
        .single();
      
      if (addError) {
        profileLogger.error("Error adding equipment:", addError);
        setError(addError.message);
        setSaving(false);
        return null;
      }
      
      if (newEquipment && profile) {
        setProfile({ ...profile, equipment: [...profile.equipment, newEquipment as PlayerEquipment] });
      }
      
      setSaving(false);
      return newEquipment as PlayerEquipment;
    } catch (err) {
      profileLogger.error("Error in addEquipment:", err);
      setError("Failed to add equipment");
      setSaving(false);
      return null;
    }
  }, [user?.id, profile]);
  
  // Update equipment
  const updateEquipment = useCallback(async (
    data: UpdateEquipmentPayload
  ): Promise<PlayerEquipment | null> => {
    if (!user?.id) return null;
    
    setSaving(true);
    setError(null);
    
    try {
      const { id, sport, ...restData } = data;
      
      // Prepare update data, casting sport to database type if present
      const updateData = {
        ...restData,
        ...(sport !== undefined && { sport: sport as "tennis" | "padel" | "pickleball" }),
      };
      
      const { data: updated, error: updateError } = await supabase
        .from("player_equipment")
        .update(updateData)
        .eq("id", id)
        .eq("profile_id", user.id)
        .select()
        .single();
      
      if (updateError) {
        profileLogger.error("Error updating equipment:", updateError);
        setError(updateError.message);
        setSaving(false);
        return null;
      }
      
      if (updated && profile) {
        setProfile({
          ...profile,
          equipment: profile.equipment.map(e => e.id === updated.id ? updated as PlayerEquipment : e),
        });
      }
      
      setSaving(false);
      return updated as PlayerEquipment;
    } catch (err) {
      profileLogger.error("Error in updateEquipment:", err);
      setError("Failed to update equipment");
      setSaving(false);
      return null;
    }
  }, [user?.id, profile]);
  
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
        profileLogger.error("Error deleting equipment:", deleteError);
        setError(deleteError.message);
        setSaving(false);
        return false;
      }
      
      if (profile) {
        setProfile({
          ...profile,
          equipment: profile.equipment.filter(e => e.id !== equipmentId),
        });
      }
      
      setSaving(false);
      return true;
    } catch (err) {
      profileLogger.error("Error in deleteEquipment:", err);
      setError("Failed to delete equipment");
      setSaving(false);
      return false;
    }
  }, [user?.id, profile]);
  
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
        profileLogger.error("Error upserting coach profile:", upsertError);
        setError(upsertError.message);
        setSaving(false);
        return null;
      }
      
      if (coach && profile) {
        setProfile({ ...profile, coach: coach as CoachProfile });
      }
      
      setSaving(false);
      return coach as CoachProfile;
    } catch (err) {
      profileLogger.error("Error in upsertCoachProfile:", err);
      setError("Failed to update coach profile");
      setSaving(false);
      return null;
    }
  }, [user?.id, profile]);
  
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
        profileLogger.error("Error deleting coach profile:", deleteError);
        setError(deleteError.message);
        setSaving(false);
        return false;
      }
      
      if (profile) {
        setProfile({ ...profile, coach: null, coachSports: [] });
      }
      
      setSaving(false);
      return true;
    } catch (err) {
      profileLogger.error("Error in deleteCoachProfile:", err);
      setError("Failed to delete coach profile");
      setSaving(false);
      return false;
    }
  }, [user?.id, profile]);
  
  // Upsert coach sport
  const upsertCoachSport = useCallback(async (
    data: UpsertCoachSportPayload
  ): Promise<CoachSport | null> => {
    if (!user?.id) return null;
    
    setSaving(true);
    setError(null);
    
    try {
      // Cast sport to database type - the database CHECK constraint will validate
      const dbSport = data.sport as "tennis" | "padel" | "pickleball";
      
      const { data: coachSport, error: upsertError } = await supabase
        .from("coach_sports")
        .upsert(
          {
            coach_profile_id: user.id,
            sport: dbSport,
            certifications: data.certifications || [],
          },
          { onConflict: "coach_profile_id,sport" }
        )
        .select()
        .single();
      
      if (upsertError) {
        profileLogger.error("Error upserting coach sport:", upsertError);
        setError(upsertError.message);
        setSaving(false);
        return null;
      }
      
      if (coachSport && profile) {
        const existingIndex = profile.coachSports.findIndex(
          cs => cs.sport === (coachSport as CoachSport).sport
        );
        
        if (existingIndex >= 0) {
          const updated = [...profile.coachSports];
          updated[existingIndex] = coachSport as CoachSport;
          setProfile({ ...profile, coachSports: updated });
        } else {
          setProfile({ ...profile, coachSports: [...profile.coachSports, coachSport as CoachSport] });
        }
      }
      
      setSaving(false);
      return coachSport as CoachSport;
    } catch (err) {
      profileLogger.error("Error in upsertCoachSport:", err);
      setError("Failed to update coach sport");
      setSaving(false);
      return null;
    }
  }, [user?.id, profile]);
  
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
        profileLogger.error("Error upserting business profile:", upsertError);
        setError(upsertError.message);
        setSaving(false);
        return null;
      }
      
      if (business && profile) {
        setProfile({ ...profile, business: business as BusinessProfile });
      }
      
      setSaving(false);
      return business as BusinessProfile;
    } catch (err) {
      profileLogger.error("Error in upsertBusinessProfile:", err);
      setError("Failed to update business profile");
      setSaving(false);
      return null;
    }
  }, [user?.id, profile]);
  
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
        profileLogger.error("Error deleting business profile:", deleteError);
        setError(deleteError.message);
        setSaving(false);
        return false;
      }
      
      if (profile) {
        setProfile({ ...profile, business: null });
      }
      
      setSaving(false);
      return true;
    } catch (err) {
      profileLogger.error("Error in deleteBusinessProfile:", err);
      setError("Failed to delete business profile");
      setSaving(false);
      return false;
    }
  }, [user?.id, profile]);
  
  // Auto-fetch profile on mount when user is available
  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user?.id, fetchProfile]);
  
  return {
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
  };
}
