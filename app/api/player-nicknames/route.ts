import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";
import type { DomainExpertise } from "@/utils/storage";
import type { PlayerTacticalData } from "@/types/tactical-analysis";

// Use Gemini Flash for ultra-fast nickname generation
const MODEL_NAME = "gemini-2.0-flash";

// Ensure this route uses Node.js runtime
export const runtime = "nodejs";
export const maxDuration = 15; // 15 seconds should be plenty for Flash model

/**
 * Player data with tactical summary for nickname generation
 */
interface PlayerNicknameData {
  playerId: number;
  playerName: string;
  totalShots: number;
  avgSpeed: number;
  topSpeed: number;
  // Simplified tactical summary
  preferredZones: string[]; // e.g., ["left side", "net area"]
  dominantShotTypes: string[]; // e.g., ["forehand", "smash"]
  playstyle: string; // e.g., "aggressive", "defensive", "balanced"
}

/**
 * Request payload for nickname generation
 */
export interface PlayerNicknameRequest {
  players: PlayerNicknameData[];
  sport?: DomainExpertise;
}

/**
 * Build simplified player data for nickname generation
 */
function buildPlayerSummary(data: PlayerTacticalData): PlayerNicknameData {
  // Determine preferred zones
  const preferredZones: string[] = [];
  const sortedOrigins = [...data.originZones].sort((a, b) => b.count - a.count);
  
  if (sortedOrigins.length > 0) {
    const topZone = sortedOrigins[0];
    // Position analysis (based on 12x6 grid)
    if (topZone.col < 6) preferredZones.push("near side");
    else preferredZones.push("far side");
    
    if (topZone.row < 2) preferredZones.push("left");
    else if (topZone.row > 3) preferredZones.push("right");
    else preferredZones.push("center");
  }
  
  // Get dominant shot types
  const dominantShotTypes = Object.entries(data.shotTypeBreakdown)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 2)
    .map(([type]) => type);
  
  // Determine playstyle based on metrics
  let playstyle = "balanced";
  if (data.avgSpeed > 60) playstyle = "aggressive";
  else if (data.avgSpeed < 40 && data.totalShots > 5) playstyle = "patient";
  
  // If they have lots of smashes or volleys
  const hasSmashes = Object.keys(data.shotTypeBreakdown).some(t => 
    t.toLowerCase().includes("smash") || t.toLowerCase().includes("volley")
  );
  if (hasSmashes && data.topSpeed > 70) playstyle = "power player";
  
  return {
    playerId: data.playerId,
    playerName: data.playerName,
    totalShots: data.totalShots,
    avgSpeed: data.avgSpeed,
    topSpeed: data.topSpeed,
    preferredZones,
    dominantShotTypes,
    playstyle,
  };
}

/**
 * Build prompt for nickname generation
 */
function buildNicknamePrompt(players: PlayerNicknameData[], sport: string): string {
  const lines: string[] = [];
  
  lines.push(`Generate a creative, fun nickname for each player based on their playing style in ${sport}.`);
  lines.push("");
  lines.push("Requirements:");
  lines.push("- Nicknames should be 2-4 words max");
  lines.push("- Be creative and playful, inspired by their stats");
  lines.push("- Examples: 'The Wall', 'Speed Demon', 'Net Ninja', 'Corner King', 'The Strategist'");
  lines.push("- Each nickname should reflect their unique playing style");
  lines.push("");
  lines.push("Players to analyze:");
  lines.push("");
  
  players.forEach((player, idx) => {
    lines.push(`Player ${idx + 1}: ${player.playerName}`);
    lines.push(`- Total shots: ${player.totalShots}`);
    lines.push(`- Avg speed: ${player.avgSpeed} km/h, Top speed: ${player.topSpeed} km/h`);
    lines.push(`- Preferred zones: ${player.preferredZones.join(", ") || "varied"}`);
    lines.push(`- Dominant shots: ${player.dominantShotTypes.join(", ") || "mixed"}`);
    lines.push(`- Style: ${player.playstyle}`);
    lines.push("");
  });
  
  lines.push("Respond ONLY with JSON in this exact format:");
  lines.push("{");
  lines.push('  "nicknames": [');
  players.forEach((player, idx) => {
    const comma = idx < players.length - 1 ? "," : "";
    lines.push(`    { "playerId": ${player.playerId}, "nickname": "The Nickname" }${comma}`);
  });
  lines.push("  ]");
  lines.push("}");
  
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const requestId = `nickname_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const startTime = Date.now();
  
  logger.info(`[${requestId}] Received player nickname request`);
  
  try {
    const body = await request.json();
    const { players, sport = "padel" } = body as {
      players: PlayerTacticalData[];
      sport?: DomainExpertise;
    };
    
    // Validate
    if (!players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { error: "No players provided" },
        { status: 400 }
      );
    }
    
    // Filter to players with data
    const playersWithData = players.filter(p => p.totalShots > 0);
    
    if (playersWithData.length === 0) {
      return NextResponse.json(
        { error: "No players with shot data" },
        { status: 400 }
      );
    }
    
    // Build simplified summaries
    const playerSummaries = playersWithData.map(buildPlayerSummary);
    
    // Get API key
    if (!process.env.GEMINI_API_KEY) {
      logger.error(`[${requestId}] GEMINI_API_KEY not set`);
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }
    
    // Initialize Gemini Flash
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.9, // Higher creativity for fun nicknames
        maxOutputTokens: 256,
      },
    });
    
    const prompt = buildNicknamePrompt(playerSummaries, sport);
    logger.debug(`[${requestId}] Prompt length: ${prompt.length} chars`);
    
    // Generate nicknames
    const result = await model.generateContent([{ text: prompt }]);
    const responseText = result.response.text();
    
    logger.debug(`[${requestId}] Raw response: ${responseText}`);
    
    // Parse JSON from response
    let nicknames: Array<{ playerId: number; nickname: string }> = [];
    
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        nicknames = parsed.nicknames || [];
      }
    } catch (parseError) {
      logger.warn(`[${requestId}] Failed to parse nickname JSON, using fallback`);
      // Fallback: generate simple nicknames based on playstyle
      nicknames = playerSummaries.map(p => ({
        playerId: p.playerId,
        nickname: p.playstyle === "aggressive" ? "Power Player" 
                : p.playstyle === "patient" ? "The Strategist"
                : "All-Rounder",
      }));
    }
    
    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Generated ${nicknames.length} nicknames in ${duration}ms`);
    
    return NextResponse.json({
      nicknames,
      modelUsed: MODEL_NAME,
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Request failed after ${duration}ms:`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to generate nicknames";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}





