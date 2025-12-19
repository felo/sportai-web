import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";
import { getTacticalPromptWithDomain } from "@/lib/prompts";
import type { DomainExpertise } from "@/utils/storage";
import type { 
  TacticalAnalysisRequest, 
  TacticalAnalysisAllRequest,
  PlayerTacticalData,
  BallTypeAnalysisData,
  PlayerAllBallTypesData,
} from "@/types/tactical-analysis";

// Use Gemini 3 Flash for tactical analysis (fast, text-only structured data)
const MODEL_NAME = "gemini-3-flash-preview";

// Ensure this route uses Node.js runtime
export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds should be plenty for text-only analysis

/**
 * Format player tactical data into a structured prompt
 */
function formatPlayerDataForPrompt(
  data: PlayerTacticalData,
  ballType: string,
  ballLabel: string
): string {
  const lines: string[] = [];
  
  lines.push(`## ${data.playerName}'s ${ballLabel} Analysis`);
  lines.push("");
  lines.push(`**Shot Statistics:**`);
  lines.push(`- Total ${ballLabel}s: ${data.totalShots}`);
  lines.push(`- Average Speed: ${data.avgSpeed > 0 ? `${data.avgSpeed} km/h` : "N/A"}`);
  lines.push(`- Top Speed: ${data.topSpeed > 0 ? `${data.topSpeed} km/h` : "N/A"}`);
  lines.push("");
  
  // Shot type breakdown
  if (Object.keys(data.shotTypeBreakdown).length > 0) {
    lines.push(`**Shot Type Breakdown:**`);
    Object.entries(data.shotTypeBreakdown).forEach(([type, stats]) => {
      const speedInfo = stats.avgSpeed > 0 
        ? ` (avg: ${stats.avgSpeed} km/h, top: ${stats.topSpeed} km/h)` 
        : "";
      lines.push(`- ${type}: ${stats.count} shots${speedInfo}`);
    });
    lines.push("");
  }
  
  // Origin zones (where player hits from)
  if (data.originZones.length > 0) {
    lines.push(`**Shot Origin Zones (Court Grid 12x6):**`);
    lines.push(`(Columns 0-5 = near side, 6-11 = far side, Rows 0-5 = width)`);
    const sortedOrigins = [...data.originZones].sort((a, b) => b.count - a.count);
    sortedOrigins.slice(0, 5).forEach(zone => {
      const side = zone.col < 6 ? "near-side" : "far-side";
      const widthPos = zone.row < 2 ? "left" : zone.row > 3 ? "right" : "center";
      lines.push(`- Grid (${zone.col}, ${zone.row}): ${zone.count} shots [${side}, ${widthPos}]`);
    });
    lines.push("");
  }
  
  // Target zones (where ball lands)
  if (data.targetZones.length > 0) {
    lines.push(`**Target Zones (where ball lands):**`);
    const sortedTargets = [...data.targetZones].sort((a, b) => b.count - a.count);
    sortedTargets.slice(0, 5).forEach(zone => {
      const side = zone.col < 6 ? "near-side" : "far-side";
      const widthPos = zone.row < 2 ? "left" : zone.row > 3 ? "right" : "center";
      lines.push(`- Grid (${zone.col}, ${zone.row}): ${zone.count} balls [${side}, ${widthPos}]`);
    });
    lines.push("");
  }
  
  // Trajectory patterns
  if (data.trajectories.length > 0) {
    const crossCourt = data.trajectories.filter(t => 
      (t.originRow < 3 && t.landingRow > 3) || (t.originRow > 2 && t.landingRow < 3)
    ).length;
    const downLine = data.trajectories.length - crossCourt;
    lines.push(`**Shot Direction Patterns:**`);
    lines.push(`- Cross-court shots: ${crossCourt} (${Math.round(crossCourt / data.trajectories.length * 100)}%)`);
    lines.push(`- Down-the-line shots: ${downLine} (${Math.round(downLine / data.trajectories.length * 100)}%)`);
    lines.push("");
    
    // Shot placement by swing type
    const byType: Record<string, { origins: number[][]; landings: number[][]; count: number }> = {};
    
    data.trajectories.forEach(t => {
      const type = t.swingType || "unknown";
      if (!byType[type]) {
        byType[type] = { origins: [], landings: [], count: 0 };
      }
      byType[type].origins.push([t.originCol, t.originRow]);
      byType[type].landings.push([t.landingCol, t.landingRow]);
      byType[type].count++;
    });
    
    if (Object.keys(byType).length > 0) {
      lines.push(`**Shot Placement by Type:**`);
      Object.entries(byType)
        .sort((a, b) => b[1].count - a[1].count) // Sort by count descending
        .forEach(([type, typeData]) => {
          const avgOriginCol = Math.round(typeData.origins.reduce((s, o) => s + o[0], 0) / typeData.origins.length);
          const avgOriginRow = Math.round(typeData.origins.reduce((s, o) => s + o[1], 0) / typeData.origins.length);
          const avgLandingCol = Math.round(typeData.landings.reduce((s, l) => s + l[0], 0) / typeData.landings.length);
          const avgLandingRow = Math.round(typeData.landings.reduce((s, l) => s + l[1], 0) / typeData.landings.length);
          
          const originSide = avgOriginCol < 6 ? "near-side" : "far-side";
          const originWidth = avgOriginRow < 2 ? "left" : avgOriginRow > 3 ? "right" : "center";
          const targetSide = avgLandingCol < 6 ? "near-side" : "far-side";
          const targetWidth = avgLandingRow < 2 ? "left" : avgLandingRow > 3 ? "right" : "center";
          
          lines.push(`- ${type} (${typeData.count}): from ${originSide} ${originWidth} → targets ${targetSide} ${targetWidth}`);
        });
      lines.push("");
    }
  }
  
  return lines.join("\n");
}

/**
 * Build the analysis prompt based on ball type and context
 */
function buildAnalysisPrompt(
  request: TacticalAnalysisRequest
): string {
  const { ballType, ballLabel, playerData, comparisonPlayerData } = request;
  
  const lines: string[] = [];
  
  // Context header
  lines.push(`# Tactical Analysis Request: ${ballLabel}`);
  lines.push("");
  
  // Ball type context
  const ballContextMap: Record<string, string> = {
    "serve": "Analyze this player's serve patterns. Focus on placement tendencies, speed consistency, and tactical variety.",
    "return": "Analyze this player's return of serve patterns. Assess positioning, aggressiveness, and tactical approach.",
    "third-ball": "Analyze this player's third ball (first shot after return) patterns. This is crucial for dictating rally tempo.",
    "fourth-ball": "Analyze this player's fourth ball patterns. Assess responses to the third ball and tactical choices.",
    "fifth-ball": "Analyze this player's fifth ball patterns. Evaluate rally development and court positioning.",
  };
  
  lines.push(ballContextMap[ballType] || `Analyze this player's ${ballLabel.toLowerCase()} patterns.`);
  lines.push("");
  
  // Primary player data
  lines.push(formatPlayerDataForPrompt(playerData, ballType, ballLabel));
  
  // Comparison player if provided
  if (comparisonPlayerData) {
    lines.push("---");
    lines.push("");
    lines.push(formatPlayerDataForPrompt(comparisonPlayerData, ballType, ballLabel));
    lines.push("Compare and contrast these two players' tactical approaches.");
  }
  
  lines.push("---");
  lines.push("");
  lines.push("Provide a concise tactical analysis with actionable insights.");
  
  return lines.join("\n");
}

/**
 * Build a multi-player analysis prompt (Analyse All)
 */
function buildAllAnalysisPrompt(
  players: PlayerAllBallTypesData[]
): string {
  const lines: string[] = [];
  
  lines.push(`# Complete Tactical Analysis`);
  lines.push("");
  lines.push("Analyze the following shot patterns for each player and provide one key piece of tactical advice for each.");
  lines.push("");
  
  // Add each player's data
  players.forEach((player, playerIndex) => {
    lines.push(`---`);
    lines.push(`## PLAYER: ${player.playerName}`);
    lines.push("");
    
    // Add each ball type's data for this player
    player.ballTypes.forEach((bt) => {
      if (bt.playerData.totalShots > 0) {
        lines.push(`### ${bt.ballLabel}`);
        lines.push(formatPlayerDataForPrompt(bt.playerData, bt.ballType, bt.ballLabel));
        lines.push("");
      }
    });
  });
  
  lines.push("---");
  lines.push("");
  lines.push("For EACH player, provide ONE key tactical advice (1-2 sentences). Format:");
  lines.push("");
  players.forEach(player => {
    lines.push(`**${player.playerName}**: [Your advice here]`);
  });
  
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const requestId = `tactical_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const startTime = Date.now();
  
  logger.info(`[${requestId}] Received tactical analysis request`);
  
  try {
    const body = await request.json();
    const shouldStream = body.stream ?? true;
    const sport = body.sport || "padel";
    
    // Check if this is an "Analyse All" request (has players array)
    const isAnalyzeAll = Array.isArray(body.players);
    
    let analysisPrompt: string;
    
    if (isAnalyzeAll) {
      // Multi-player analysis mode
      const { players } = body as TacticalAnalysisAllRequest;
      
      // Filter to players with data
      const playersWithData = players.filter(p => 
        p.ballTypes.some(bt => bt.playerData.totalShots > 0)
      );
      
      if (playersWithData.length === 0) {
        return NextResponse.json(
          { error: "No shot data available for analysis" },
          { status: 400 }
        );
      }
      
      logger.debug(`[${requestId}] Analyse All mode: ${playersWithData.length} players`);
      analysisPrompt = buildAllAnalysisPrompt(playersWithData);
      
    } else {
      // Single ball type analysis mode
      const { ballType, ballLabel, playerData, comparisonPlayerData } = body as TacticalAnalysisRequest;
      
      // Validate required fields
      if (!ballType || !ballLabel || !playerData) {
        return NextResponse.json(
          { error: "Missing required fields: ballType, ballLabel, playerData" },
          { status: 400 }
        );
      }
      
      if (playerData.totalShots === 0) {
        return NextResponse.json(
          { error: "No shot data available for analysis" },
          { status: 400 }
        );
      }
      
      logger.debug(`[${requestId}] Single mode: ${ballType}, Player: ${playerData.playerName}`);
      analysisPrompt = buildAnalysisPrompt({ ballType, ballLabel, playerData, comparisonPlayerData });
    }
    
    // Get API key
    if (!process.env.GEMINI_API_KEY) {
      logger.error(`[${requestId}] GEMINI_API_KEY not set`);
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const systemPrompt = getTacticalPromptWithDomain(sport as DomainExpertise);
    
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompt,
    });
    
    logger.debug(`[${requestId}] Prompt length: ${analysisPrompt.length} chars`);
    
    if (shouldStream) {
      // Streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const result = await model.generateContentStream([{ text: analysisPrompt }]);
            
            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              if (chunkText) {
                controller.enqueue(new TextEncoder().encode(chunkText));
              }
            }
            
            controller.close();
            
            const duration = Date.now() - startTime;
            logger.info(`[${requestId}] Stream completed in ${duration}ms`);
          } catch (error) {
            logger.error(`[${requestId}] Stream error:`, error);
            controller.error(error);
          }
        },
      });
      
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
        },
      });
    } else {
      // Non-streaming response
      const result = await model.generateContent([{ text: analysisPrompt }]);
      const responseText = result.response.text();
      
      const duration = Date.now() - startTime;
      logger.info(`[${requestId}] Analysis completed in ${duration}ms`);
      
      return NextResponse.json({
        analysis: responseText,
        modelUsed: MODEL_NAME,
        streamed: false,
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Request failed after ${duration}ms:`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

