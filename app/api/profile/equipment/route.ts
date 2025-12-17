import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin, getAuthenticatedUser, unauthorizedResponse } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * POST /api/profile/equipment
 * Add a new equipment item
 */
export async function POST(request: NextRequest) {
  const requestId = `equipment_post_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    const body = await request.json();
    
    // Validate required fields
    if (!body.sport || !body.equipment_type || !body.brand || !body.model_name) {
      return NextResponse.json(
        { error: "sport, equipment_type, brand, and model_name are required" },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Adding equipment for user: ${userId}`);
    
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from("player_equipment")
      .insert({
        profile_id: userId,
        sport: body.sport,
        equipment_type: body.equipment_type,
        brand: body.brand,
        model_name: body.model_name,
        notes: body.notes || null,
      })
      .select()
      .single();
    
    if (error) {
      logger.error(`[${requestId}] Error adding equipment:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    logger.info(`[${requestId}] Equipment added successfully`);
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
 * PUT /api/profile/equipment
 * Update an existing equipment item
 */
export async function PUT(request: NextRequest) {
  const requestId = `equipment_put_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json({ error: "Equipment ID required" }, { status: 400 });
    }
    
    logger.info(`[${requestId}] Updating equipment ${body.id} for user: ${userId}`);
    
    const supabase = getSupabaseAdmin();
    
    const updates: Record<string, unknown> = {};
    const fields = ["sport", "equipment_type", "brand", "model_name", "notes"];
    
    for (const field of fields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }
    
    const { data, error } = await supabase
      .from("player_equipment")
      .update(updates)
      .eq("id", body.id)
      .eq("profile_id", userId)
      .select()
      .single();
    
    if (error) {
      logger.error(`[${requestId}] Error updating equipment:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }
    
    logger.info(`[${requestId}] Equipment updated successfully`);
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
 * DELETE /api/profile/equipment?id=xxx
 * Remove an equipment item
 */
export async function DELETE(request: NextRequest) {
  const requestId = `equipment_delete_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get("id");
    
    if (!equipmentId) {
      return NextResponse.json({ error: "Equipment ID required" }, { status: 400 });
    }
    
    logger.info(`[${requestId}] Deleting equipment ${equipmentId} for user: ${userId}`);
    
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from("player_equipment")
      .delete()
      .eq("id", equipmentId)
      .eq("profile_id", userId);
    
    if (error) {
      logger.error(`[${requestId}] Error deleting equipment:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    logger.info(`[${requestId}] Equipment deleted successfully`);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
