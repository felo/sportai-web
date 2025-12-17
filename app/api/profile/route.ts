import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin, getAuthenticatedUser, unauthorizedResponse } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * GET /api/profile
 * Fetch the full profile with related data (sports, equipment, coach, business)
 */
export async function GET(request: NextRequest) {
  const requestId = `profile_get_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    
    logger.info(`[${requestId}] Fetching profile for user: ${userId}`);
    
    const supabase = getSupabaseAdmin();
    
    // Fetch all profile data in parallel
    const [
      profileResult,
      sportsResult,
      equipmentResult,
      coachResult,
      coachSportsResult,
      businessResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("player_sports").select("*").eq("profile_id", userId),
      supabase.from("player_equipment").select("*").eq("profile_id", userId),
      supabase.from("coach_profiles").select("*").eq("profile_id", userId).single(),
      supabase.from("coach_sports").select("*").eq("coach_profile_id", userId),
      supabase.from("business_profiles").select("*").eq("profile_id", userId).single(),
    ]);
    
    if (profileResult.error) {
      logger.error(`[${requestId}] Error fetching profile:`, profileResult.error);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    // Construct full profile response
    const fullProfile = {
      player: profileResult.data,
      sports: sportsResult.data || [],
      equipment: equipmentResult.data || [],
      coach: coachResult.data || null,
      coachSports: coachSportsResult.data || [],
      business: businessResult.data || null,
    };
    
    logger.info(`[${requestId}] Profile fetched successfully`);
    return NextResponse.json(fullProfile);
    
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile
 * Update the base profile fields
 */
export async function PUT(request: NextRequest) {
  const requestId = `profile_put_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    
    const body = await request.json();
    
    logger.info(`[${requestId}] Updating profile for user: ${userId}`);
    
    const supabase = getSupabaseAdmin();
    
    // Filter to only allowed fields
    const allowedFields = [
      "full_name",
      "date_of_birth",
      "gender",
      "handedness",
      "height",
      "weight",
      "physical_limitations",
      "units_preference",
      "country",
      "timezone",
      "language",
      "is_parent_of_junior",
      "referral_source",
    ];
    
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();
    
    if (error) {
      logger.error(`[${requestId}] Error updating profile:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    logger.info(`[${requestId}] Profile updated successfully`);
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
