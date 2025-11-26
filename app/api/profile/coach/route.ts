import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * PUT /api/profile/coach
 * Create or update coach profile (upsert)
 */
export async function PUT(request: NextRequest) {
  const requestId = `coach_put_${Date.now()}`;
  
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = authHeader.replace("Bearer ", "");
    const body = await request.json();
    
    logger.info(`[${requestId}] Upserting coach profile for user: ${userId}`);
    
    const supabase = getSupabaseClient();
    
    // Build the upsert data
    const coachData = {
      profile_id: userId,
      is_active: body.is_active ?? true,
      years_experience: body.years_experience,
      coaching_level: body.coaching_level,
      employment_type: body.employment_type,
      client_count: body.client_count,
      specialties: body.specialties || [],
      affiliation: body.affiliation,
      uses_video_analysis: body.uses_video_analysis ?? false,
    };
    
    const { data, error } = await supabase
      .from("coach_profiles")
      .upsert(coachData, { onConflict: "profile_id" })
      .select()
      .single();
    
    if (error) {
      logger.error(`[${requestId}] Error upserting coach profile:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    logger.info(`[${requestId}] Coach profile upserted successfully`);
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile/coach
 * Remove coach profile
 */
export async function DELETE(request: NextRequest) {
  const requestId = `coach_delete_${Date.now()}`;
  
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = authHeader.replace("Bearer ", "");
    
    logger.info(`[${requestId}] Deleting coach profile for user: ${userId}`);
    
    const supabase = getSupabaseClient();
    
    // Delete coach sports first (cascade should handle this, but being explicit)
    await supabase
      .from("coach_sports")
      .delete()
      .eq("coach_profile_id", userId);
    
    const { error } = await supabase
      .from("coach_profiles")
      .delete()
      .eq("profile_id", userId);
    
    if (error) {
      logger.error(`[${requestId}] Error deleting coach profile:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    logger.info(`[${requestId}] Coach profile deleted successfully`);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile/coach/sports
 * Add or update a coach sport with certifications
 * Body: { sport: string, certifications: string[] }
 */
export async function POST(request: NextRequest) {
  const requestId = `coach_sport_post_${Date.now()}`;
  
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = authHeader.replace("Bearer ", "");
    const body = await request.json();
    
    if (!body.sport) {
      return NextResponse.json({ error: "Sport is required" }, { status: 400 });
    }
    
    logger.info(`[${requestId}] Upserting coach sport for user: ${userId}`);
    
    const supabase = getSupabaseClient();
    
    // First ensure coach profile exists
    const { data: coachProfile } = await supabase
      .from("coach_profiles")
      .select("profile_id")
      .eq("profile_id", userId)
      .single();
    
    if (!coachProfile) {
      return NextResponse.json(
        { error: "Coach profile must be created first" },
        { status: 400 }
      );
    }
    
    // Upsert the coach sport
    const { data, error } = await supabase
      .from("coach_sports")
      .upsert(
        {
          coach_profile_id: userId,
          sport: body.sport,
          certifications: body.certifications || [],
        },
        { onConflict: "coach_profile_id,sport" }
      )
      .select()
      .single();
    
    if (error) {
      logger.error(`[${requestId}] Error upserting coach sport:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    logger.info(`[${requestId}] Coach sport upserted successfully`);
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

