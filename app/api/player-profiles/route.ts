import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { logger } from "@/lib/logger";
import type { PlayerProfileData, PlayerProfile, PlayerProfileResponse } from "@/types/player-profile";

// Use Gemini Flash for fast profile generation
const MODEL_NAME = "gemini-2.0-flash";

// Ensure this route uses Node.js runtime
export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds for profile generation

/**
 * JSON Schema for structured output - enforces consistent profile format
 */
const PROFILE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    profiles: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          playerId: { type: SchemaType.NUMBER },
          playerName: { type: SchemaType.STRING },
          attributes: {
            type: SchemaType.OBJECT,
            properties: {
              power: { type: SchemaType.NUMBER },
              agility: { type: SchemaType.NUMBER },
              consistency: { type: SchemaType.NUMBER },
              attack: { type: SchemaType.NUMBER },
              defense: { type: SchemaType.NUMBER },
              coverage: { type: SchemaType.NUMBER },
              variety: { type: SchemaType.NUMBER },
            },
            required: ["power", "agility", "consistency", "attack", "defense", "coverage", "variety"],
          },
          summary: { type: SchemaType.STRING },
          playstyle: { type: SchemaType.STRING },
          strengths: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          areasToImprove: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["playerId", "playerName", "attributes", "summary", "playstyle", "strengths", "areasToImprove"],
      },
    },
  },
  required: ["profiles"],
};

/**
 * Build the analysis prompt for profile generation
 */
function buildProfilePrompt(players: PlayerProfileData[], sport: string): string {
  const lines: string[] = [];
  
  lines.push(`You are a ${sport} performance analyst. Analyze these players and create a performance profile for each based on their match statistics.`);
  lines.push("");
  lines.push("## Attribute Scoring Guidelines (0-100 scale)");
  lines.push("");
  lines.push("Score each attribute RELATIVELY - compare players against each other:");
  lines.push("- 85-95: Best in the group at this attribute");
  lines.push("- 65-80: Above average");
  lines.push("- 50-65: Average");
  lines.push("- 35-50: Below average");
  lines.push("- 20-35: Weakest in the group");
  lines.push("");
  lines.push("**Attributes to score:**");
  lines.push("- `power`: Ball speed and hard-hitting ability (use max/avg ball speed, smash % as signals)");
  lines.push("- `agility`: Movement speed and quickness (use sprint speed, activity score)");
  lines.push("- `consistency`: Shot reliability (use total shots, steady patterns)");
  lines.push("- `attack`: Aggressive play (smash/remate %, high-speed shots, net play)");
  lines.push("- `defense`: Defensive ability (lobs, defensive shots, court recovery)");
  lines.push("- `coverage`: Court coverage (distance covered, movement patterns)");
  lines.push("- `variety`: Shot diversity (number of shot types, distribution evenness)");
  lines.push("");
  lines.push("Be honest about weaknesses - not everyone excels at everything!");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Player Data");
  lines.push("");
  
  players.forEach((player, idx) => {
    lines.push(`### Player ${idx + 1}: ${player.playerName} (playerId: ${player.playerId})`);
    lines.push("");
    lines.push(`**IMPORTANT:** Use playerId=${player.playerId} for this player in the output.`);
    lines.push("");
    lines.push("**Performance Stats:**");
    lines.push(`- Total swings: ${player.stats.totalSwings}`);
    lines.push(`- Average ball speed: ${player.stats.avgBallSpeed.toFixed(1)} km/h`);
    lines.push(`- Maximum ball speed: ${player.stats.maxBallSpeed.toFixed(1)} km/h`);
    lines.push(`- Distance covered: ${player.stats.distanceCovered.toFixed(0)} meters`);
    lines.push(`- Top sprint speed: ${player.stats.fastestSprint.toFixed(1)} km/h`);
    lines.push(`- Activity score: ${player.stats.activityScore.toFixed(2)}`);
    lines.push("");
    
    const shotTypes = Object.entries(player.shotBreakdown);
    if (shotTypes.length > 0) {
      lines.push("**Shot Breakdown:**");
      shotTypes
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([type, data]) => {
          lines.push(`- ${type}: ${data.count} shots (${data.percentage.toFixed(0)}%), avg speed ${data.avgSpeed.toFixed(0)} km/h`);
        });
      lines.push("");
    }
    
    const hasRankings = player.rankings.powerRank || player.rankings.sprintRank || 
                       player.rankings.distanceRank || player.rankings.swingsRank;
    if (hasRankings) {
      lines.push(`**Rankings (out of ${player.totalPlayers} players):**`);
      if (player.rankings.powerRank) lines.push(`- Power: #${player.rankings.powerRank}`);
      if (player.rankings.sprintRank) lines.push(`- Sprint: #${player.rankings.sprintRank}`);
      if (player.rankings.distanceRank) lines.push(`- Distance: #${player.rankings.distanceRank}`);
      if (player.rankings.swingsRank) lines.push(`- Activity: #${player.rankings.swingsRank}`);
      lines.push("");
    }
  });
  
  lines.push("---");
  lines.push("");
  lines.push("## Output Requirements");
  lines.push("");
  lines.push("For each player provide:");
  lines.push("1. **playerId**: Use the EXACT playerId number provided for each player (critical for matching)");
  lines.push("2. **playerName**: Use the exact player name provided");
  lines.push("3. Seven attribute scores (power, agility, consistency, attack, defense, coverage, variety)");
  lines.push("4. A creative playstyle nickname (2-4 words, e.g., 'The Wall', 'Speed Demon', 'Net Ninja')");
  lines.push("5. A 1-2 sentence summary of their playing style");
  lines.push("6. 2-3 key strengths (short phrases)");
  lines.push("7. 1-2 areas to improve (constructive, short phrases)");
  
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const requestId = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const startTime = Date.now();
  
  logger.info(`[${requestId}] Received player profile request`);
  
  try {
    const body = await request.json();
    const { players, sport = "padel" } = body as {
      players: PlayerProfileData[];
      sport?: string;
    };
    
    // Validate input
    if (!players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { error: "No players provided" },
        { status: 400 }
      );
    }
    
    // Filter to players with data
    const playersWithData = players.filter(p => p.stats.totalSwings > 0);
    
    if (playersWithData.length === 0) {
      return NextResponse.json(
        { error: "No players with shot data" },
        { status: 400 }
      );
    }
    
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
        temperature: 0.7, // Balance creativity with consistency
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: PROFILE_SCHEMA as Schema,
      },
    });
    
    const prompt = buildProfilePrompt(playersWithData, sport);
    logger.debug(`[${requestId}] Prompt: ${prompt.length} chars for ${playersWithData.length} players`);
    
    // Generate profiles
    const result = await model.generateContent([{ text: prompt }]);
    const responseText = result.response.text();
    
    logger.debug(`[${requestId}] Raw response: ${responseText.substring(0, 500)}...`);
    
    // Parse JSON response
    let profiles: PlayerProfile[] = [];
    
    try {
      const parsed = JSON.parse(responseText) as { profiles: PlayerProfile[] };
      profiles = parsed.profiles || [];
      
      // Validate and clamp attribute values to 0-100
      profiles = profiles.map(profile => ({
        ...profile,
        attributes: {
          power: Math.min(100, Math.max(0, profile.attributes.power)),
          agility: Math.min(100, Math.max(0, profile.attributes.agility)),
          consistency: Math.min(100, Math.max(0, profile.attributes.consistency)),
          attack: Math.min(100, Math.max(0, profile.attributes.attack)),
          defense: Math.min(100, Math.max(0, profile.attributes.defense)),
          coverage: Math.min(100, Math.max(0, profile.attributes.coverage)),
          variety: Math.min(100, Math.max(0, profile.attributes.variety)),
        },
        strengths: profile.strengths?.slice(0, 3) || [],
        areasToImprove: profile.areasToImprove?.slice(0, 2) || [],
      }));
      
    } catch (parseError) {
      logger.warn(`[${requestId}] Failed to parse profile JSON, using fallback`);
      
      // Fallback: generate basic profiles based on stats
      profiles = playersWithData.map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        attributes: {
          power: Math.min(100, Math.max(30, p.stats.maxBallSpeed * 0.8)),
          agility: Math.min(100, Math.max(30, p.stats.fastestSprint * 4)),
          consistency: Math.min(100, Math.max(30, Math.min(p.stats.totalSwings * 2, 80))),
          attack: Math.min(100, Math.max(30, p.stats.avgBallSpeed * 1.2)),
          defense: 60, // Default to average
          coverage: Math.min(100, Math.max(30, p.stats.distanceCovered / 5)),
          variety: Math.min(100, Math.max(30, Object.keys(p.shotBreakdown).length * 15)),
        },
        summary: `${p.playerName} shows balanced performance across the match.`,
        playstyle: "All-Rounder",
        strengths: ["Consistent play"],
        areasToImprove: ["Shot variety"],
      }));
    }
    
    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Generated ${profiles.length} profiles in ${duration}ms`);
    
    return NextResponse.json({
      profiles,
      modelUsed: MODEL_NAME,
    } as PlayerProfileResponse);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Request failed after ${duration}ms:`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to generate profiles";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

