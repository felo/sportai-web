import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin, getAuthenticatedUser, unauthorizedResponse } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * POST /api/profile/sports
 * Add a new sport to the player's profile
 */
export async function POST(request: NextRequest) {
  const requestId = `sport_post_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    const body = await request.json();
    
    logger.info(`[${requestId}] Adding sport for user: ${userId}`);
    
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from("player_sports")
      .insert({
        profile_id: userId,
        sport: body.sport,
        skill_level: body.skill_level,
        years_playing: body.years_playing,
        club_name: body.club_name,
        playing_style: body.playing_style,
        preferred_surfaces: body.preferred_surfaces || [],
        goals: body.goals || [],
      })
      .select()
      .single();
    
    if (error) {
      logger.error(`[${requestId}] Error adding sport:`, error);
      // Check for unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You already have this sport in your profile" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    logger.info(`[${requestId}] Sport added successfully`);
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile/sports
 * Update an existing sport
 */
export async function PUT(request: NextRequest) {
  const requestId = `sport_put_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json({ error: "Sport ID required" }, { status: 400 });
    }
    
    logger.info(`[${requestId}] Updating sport ${body.id} for user: ${userId}`);
    
    const supabase = getSupabaseAdmin();
    
    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    const fields = [
      "skill_level",
      "years_playing",
      "club_name",
      "playing_style",
      "preferred_surfaces",
      "goals",
    ];
    
    for (const field of fields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }
    
    const { data, error } = await supabase
      .from("player_sports")
      .update(updates)
      .eq("id", body.id)
      .eq("profile_id", userId)
      .select()
      .single();
    
    if (error) {
      logger.error(`[${requestId}] Error updating sport:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: "Sport not found" }, { status: 404 });
    }
    
    logger.info(`[${requestId}] Sport updated successfully`);
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
 * DELETE /api/profile/sports?id=xxx
 * Remove a sport from the profile
 */
export async function DELETE(request: NextRequest) {
  const requestId = `sport_delete_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const sportId = searchParams.get("id");
    
    if (!sportId) {
      return NextResponse.json({ error: "Sport ID required" }, { status: 400 });
    }
    
    logger.info(`[${requestId}] Deleting sport ${sportId} for user: ${userId}`);
    
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from("player_sports")
      .delete()
      .eq("id", sportId)
      .eq("profile_id", userId);
    
    if (error) {
      logger.error(`[${requestId}] Error deleting sport:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    logger.info(`[${requestId}] Sport deleted successfully`);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
