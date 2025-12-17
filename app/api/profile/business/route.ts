import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin, getAuthenticatedUser, unauthorizedResponse } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * PUT /api/profile/business
 * Create or update business profile (upsert)
 */
export async function PUT(request: NextRequest) {
  const requestId = `business_put_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    const body = await request.json();
    
    // Company name is required for business profile
    if (!body.company_name) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Upserting business profile for user: ${userId}`);
    
    const supabase = getSupabaseAdmin();
    
    const businessData = {
      profile_id: userId,
      company_name: body.company_name,
      website: body.website || null,
      role: body.role,
      company_size: body.company_size,
      country: body.country,
      business_type: body.business_type,
      use_cases: body.use_cases || [],
    };
    
    const { data, error } = await supabase
      .from("business_profiles")
      .upsert(businessData, { onConflict: "profile_id" })
      .select()
      .single();
    
    if (error) {
      logger.error(`[${requestId}] Error upserting business profile:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    logger.info(`[${requestId}] Business profile upserted successfully`);
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
 * DELETE /api/profile/business
 * Remove business profile
 */
export async function DELETE(request: NextRequest) {
  const requestId = `business_delete_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    
    logger.info(`[${requestId}] Deleting business profile for user: ${userId}`);
    
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from("business_profiles")
      .delete()
      .eq("profile_id", userId);
    
    if (error) {
      logger.error(`[${requestId}] Error deleting business profile:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    logger.info(`[${requestId}] Business profile deleted successfully`);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
