import { createLogger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import type { Chat, Message } from "@/types/chat";
import type { Database } from "@/types/supabase";

const supabaseLogger = createLogger("Supabase");

type DbChat = Database["public"]["Tables"]["chats"]["Row"];
type DbMessage = Database["public"]["Tables"]["messages"]["Row"];
type DbChatInsert = Database["public"]["Tables"]["chats"]["Insert"];
type DbMessageInsert = Database["public"]["Tables"]["messages"]["Insert"];

/**
 * Convert database chat to Chat type (without messages)
 */
function dbChatToChat(dbChat: DbChat, messages: Message[] = []): Chat {
  return {
    id: dbChat.id,
    title: dbChat.title,
    createdAt: new Date(dbChat.created_at).getTime(),
    updatedAt: new Date(dbChat.updated_at).getTime(),
    messages,
    thinkingMode: (dbChat.thinking_mode as "fast" | "deep") || "fast",
    mediaResolution: (dbChat.media_resolution as "low" | "medium" | "high") || "medium",
    domainExpertise: (dbChat.domain_expertise as "all-sports" | "tennis" | "pickleball" | "padel") || "all-sports",
  };
}

/**
 * Convert database message to Message type
 */
function dbMessageToMessage(dbMsg: DbMessage): Message {
  // Extract special fields from pose_data if stored there
  const poseData = dbMsg.pose_data as any;
  const isTechniqueLiteEligible = poseData?.isTechniqueLiteEligible;
  const messageType = poseData?.messageType;
  const analysisOptions = poseData?.analysisOptions;
  const techniqueStudioPrompt = poseData?.techniqueStudioPrompt;
  
  // Remove special fields from poseData to keep it clean
  const cleanPoseData = poseData ? (() => {
    const { isTechniqueLiteEligible: _, messageType: __, analysisOptions: ___, techniqueStudioPrompt: ____, ...rest } = poseData;
    return Object.keys(rest).length > 0 ? rest : undefined;
  })() : undefined;
  
  // Extract additional telemetry fields from model_settings
  const modelSettingsRaw = dbMsg.model_settings as any;
  const timeToFirstToken = modelSettingsRaw?.timeToFirstToken;
  const contextUsage = modelSettingsRaw?.contextUsage;
  const cacheName = modelSettingsRaw?.cacheName;
  const cacheUsed = modelSettingsRaw?.cacheUsed;
  const modelUsed = modelSettingsRaw?.modelUsed;
  const modelReason = modelSettingsRaw?.modelReason;
  
  // Clean model_settings by removing the extra telemetry fields
  const cleanModelSettings = modelSettingsRaw ? (() => {
    const { timeToFirstToken: _, contextUsage: __, cacheName: ___, cacheUsed: ____, modelUsed: _____, modelReason: ______, ...rest } = modelSettingsRaw;
    return Object.keys(rest).length > 0 ? rest : undefined;
  })() : undefined;
  
  return {
    id: dbMsg.id,
    role: dbMsg.role as "user" | "assistant",
    content: dbMsg.content,
    messageType: messageType || undefined,
    analysisOptions: analysisOptions || undefined,
    techniqueStudioPrompt: techniqueStudioPrompt || undefined,
    videoUrl: dbMsg.video_url || undefined,
    videoS3Key: dbMsg.video_s3_key || undefined,
    thumbnailUrl: dbMsg.thumbnail_url || undefined,
    thumbnailS3Key: dbMsg.thumbnail_s3_key || undefined,
    videoPlaybackSpeed: dbMsg.video_playback_speed || undefined,
    isVideoSizeLimitError: dbMsg.is_video_size_limit_error || undefined,
    isStreaming: dbMsg.is_streaming || undefined,
    inputTokens: dbMsg.input_tokens || undefined,
    outputTokens: dbMsg.output_tokens || undefined,
    responseDuration: dbMsg.response_duration || undefined,
    timeToFirstToken: timeToFirstToken ?? undefined,
    modelSettings: cleanModelSettings,
    contextUsage: contextUsage || undefined,
    cacheName: cacheName || undefined,
    cacheUsed: cacheUsed ?? undefined,
    modelUsed: modelUsed || undefined,
    modelReason: modelReason || undefined,
    ttsUsage: dbMsg.tts_usage ? (dbMsg.tts_usage as any) : undefined,
    poseData: cleanPoseData,
    poseDataS3Key: dbMsg.pose_data_s3_key || undefined,
    videoFile: null,
    videoPreview: null,
    isTechniqueLiteEligible: isTechniqueLiteEligible ?? undefined,
  };
}

/**
 * Convert Chat to database chat insert
 */
function chatToDbInsert(chat: Chat, userId: string): DbChatInsert {
  return {
    id: chat.id,
    user_id: userId,
    title: chat.title,
    created_at: new Date(chat.createdAt).toISOString(),
    updated_at: new Date(chat.updatedAt).toISOString(),
    thinking_mode: chat.thinkingMode || "fast",
    media_resolution: chat.mediaResolution || "medium",
    domain_expertise: chat.domainExpertise || "all-sports",
  };
}

/**
 * Convert Message to database message insert
 * @param message - The message to convert
 * @param chatId - The chat ID this message belongs to
 * @param sequenceNumber - The position of this message in the chat (0-indexed)
 */
function messageToDbInsert(message: Message, chatId: string, sequenceNumber: number): DbMessageInsert {
  // Include special fields in pose_data for persistence
  const hasSpecialFields = message.poseData || 
    message.isTechniqueLiteEligible !== undefined ||
    message.messageType ||
    message.analysisOptions ||
    message.techniqueStudioPrompt;
    
  const poseDataWithExtras = hasSpecialFields
    ? {
        ...(message.poseData || {}),
        ...(message.isTechniqueLiteEligible !== undefined ? { isTechniqueLiteEligible: message.isTechniqueLiteEligible } : {}),
        ...(message.messageType ? { messageType: message.messageType } : {}),
        ...(message.analysisOptions ? { analysisOptions: message.analysisOptions } : {}),
        ...(message.techniqueStudioPrompt ? { techniqueStudioPrompt: message.techniqueStudioPrompt } : {}),
      }
    : null;
  
  // Expand model_settings to include additional telemetry fields
  // These are stored together since they're all model/performance related
  const expandedModelSettings = message.modelSettings || 
    message.timeToFirstToken !== undefined ||
    message.contextUsage ||
    message.cacheName ||
    message.cacheUsed !== undefined ||
    message.modelUsed ||
    message.modelReason
    ? {
        ...(message.modelSettings || {}),
        // Additional telemetry fields stored in model_settings JSONB
        ...(message.timeToFirstToken !== undefined ? { timeToFirstToken: message.timeToFirstToken } : {}),
        ...(message.contextUsage ? { contextUsage: message.contextUsage } : {}),
        ...(message.cacheName ? { cacheName: message.cacheName } : {}),
        ...(message.cacheUsed !== undefined ? { cacheUsed: message.cacheUsed } : {}),
        ...(message.modelUsed ? { modelUsed: message.modelUsed } : {}),
        ...(message.modelReason ? { modelReason: message.modelReason } : {}),
      }
    : null;
    
  return {
    id: message.id,
    chat_id: chatId,
    role: message.role,
    content: message.content,
    sequence_number: sequenceNumber,
    video_url: message.videoUrl || null,
    video_s3_key: message.videoS3Key || null,
    thumbnail_url: message.thumbnailUrl || null,
    thumbnail_s3_key: message.thumbnailS3Key || null,
    video_playback_speed: message.videoPlaybackSpeed || null,
    is_video_size_limit_error: message.isVideoSizeLimitError || null,
    is_streaming: message.isStreaming || null,
    input_tokens: message.inputTokens || null,
    output_tokens: message.outputTokens || null,
    response_duration: message.responseDuration || null,
    model_settings: expandedModelSettings as any,
    tts_usage: message.ttsUsage ? (message.ttsUsage as any) : null,
    pose_data: poseDataWithExtras as any,
    pose_data_s3_key: message.poseDataS3Key || null,
  };
}

/**
 * Load all chats for the current user from Supabase
 */
export async function loadChatsFromSupabase(): Promise<Chat[]> {
  try {
    // First check if we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      supabaseLogger.error("Session error:", sessionError);
      return [];
    }
    
    if (!session) {
      supabaseLogger.debug("No active session, skipping Supabase load");
      return [];
    }
    
    supabaseLogger.debug("Loading chats for user:", session.user.id);
    
    const { data: chatsData, error: chatsError } = await supabase
      .from("chats")
      .select("*")
      .order("created_at", { ascending: false });

    if (chatsError) {
      supabaseLogger.error("Error loading chats:", chatsError.message, chatsError.code, chatsError.details);
      return [];
    }

    supabaseLogger.debug("Loaded", chatsData?.length || 0, "chats");

    if (!chatsData || chatsData.length === 0) {
      return [];
    }

    // Load messages for all chats
    const chats: Chat[] = [];
    for (const chatData of chatsData) {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatData.id)
        .order("sequence_number", { ascending: true });

      if (messagesError) {
        supabaseLogger.error(`Error loading messages for chat ${chatData.id}:`, messagesError);
        continue;
      }

      const messages = messagesData ? messagesData.map(dbMessageToMessage) : [];
      chats.push(dbChatToChat(chatData, messages));
    }

    return chats;
  } catch (error) {
    supabaseLogger.error("Failed to load chats from Supabase:", error);
    return [];
  }
}

/**
 * Load a single chat with its messages from Supabase
 */
export async function loadChatFromSupabase(chatId: string): Promise<Chat | null> {
  try {
    const { data: chatData, error: chatError } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .single();

    if (chatError) {
      // PGRST116 means no rows found - this is expected for new chats not yet synced
      if (chatError.code === "PGRST116") {
        supabaseLogger.debug(`Chat ${chatId} not found in Supabase (may exist only locally)`);
        return null;
      }
      supabaseLogger.error("Error loading chat from Supabase:", chatError.message || chatError);
      return null;
    }
    
    if (!chatData) {
      return null;
    }

    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("sequence_number", { ascending: true });

    if (messagesError) {
      supabaseLogger.error("Error loading messages from Supabase:", messagesError);
      return null;
    }

    const messages = messagesData ? messagesData.map(dbMessageToMessage) : [];
    return dbChatToChat(chatData, messages);
  } catch (error) {
    supabaseLogger.error("Failed to load chat from Supabase:", error);
    return null;
  }
}

/**
 * Save a chat to Supabase (upsert)
 */
export async function saveChatToSupabase(chat: Chat, userId: string): Promise<boolean> {
  try {
    supabaseLogger.debug("Saving chat:", chat.id, "for user:", userId);
    
    // Verify the session is valid and auth.uid() will match the userId
    // This prevents RLS violations when the session is stale
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      supabaseLogger.error("Session error while saving chat:", sessionError);
      return false;
    }
    
    if (!session) {
      supabaseLogger.error("No active session, cannot save chat to Supabase");
      return false;
    }
    
    // Verify the session user matches the userId we're trying to save
    if (session.user.id !== userId) {
      supabaseLogger.error("Session user mismatch! Session:", session.user.id, "Expected:", userId);
      supabaseLogger.error("This could indicate a stale session or auth state inconsistency");
      return false;
    }
    
    // Check if the token might be expired (Supabase auto-refreshes, but let's be safe)
    const tokenExpiry = session.expires_at;
    if (tokenExpiry) {
      const expiresAt = new Date(tokenExpiry * 1000);
      const now = new Date();
      if (expiresAt <= now) {
        supabaseLogger.warn("Session token appears expired, attempting refresh...");
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          supabaseLogger.error("Failed to refresh session:", refreshError);
          return false;
        }
        supabaseLogger.info("Session refreshed successfully");
      }
    }
    
    // First, check if the chat already exists and belongs to a different user
    // This prevents RLS violations when trying to insert messages for a chat
    // that exists but is owned by another user
    const { data: existingChat, error: checkError } = await supabase
      .from("chats")
      .select("id, user_id")
      .eq("id", chat.id)
      .maybeSingle();
    
    if (checkError) {
      supabaseLogger.error("Error checking existing chat:", checkError.message);
      // Continue anyway - the upsert will handle it
    } else if (existingChat && existingChat.user_id !== userId) {
      supabaseLogger.error("Chat ownership mismatch! Chat belongs to:", existingChat.user_id, "Current user:", userId);
      supabaseLogger.error("Cannot update chat owned by another user. This could be a chat ID collision.");
      return false;
    }
    
    // Use UPSERT to avoid race conditions
    // This handles both insert and update atomically
    const chatUpsert = {
      id: chat.id,
      user_id: userId,
      title: chat.title,
      created_at: new Date(chat.createdAt).toISOString(),
      updated_at: new Date(chat.updatedAt).toISOString(),
      thinking_mode: chat.thinkingMode || "fast",
      media_resolution: chat.mediaResolution || "medium",
      domain_expertise: chat.domainExpertise || "all-sports",
    };
    
    const { error: chatError } = await supabase
      .from("chats")
      .upsert(chatUpsert, {
        onConflict: "id",
        ignoreDuplicates: false, // Update existing chats
      });

    if (chatError) {
      supabaseLogger.error("Error upserting chat:", chatError.message, chatError.code, chatError.details, chatError.hint);
      
      // Check if it's a foreign key error (profile doesn't exist)
      if (chatError.code === "23503") {
        supabaseLogger.error("Foreign key error - profile does not exist for user:", userId);
        supabaseLogger.error("This usually happens if the sync happens too quickly after sign-in.");
        supabaseLogger.error("The profile should be created by a database trigger.");
      }
      
      // Check if it's an RLS violation
      if (chatError.code === "42501") {
        supabaseLogger.error("RLS violation - user may not have permission to upsert this chat");
        supabaseLogger.error("This could indicate the chat belongs to another user");
      }
      
      // Log detailed error information
      supabaseLogger.error("Chat save failed for:", {
        chatId: chat.id,
        userId,
        errorCode: chatError.code,
        errorMessage: chatError.message,
      });
      
      return false;
    }
    
    supabaseLogger.debug("Chat upserted successfully");

    // Upsert messages (insert or update if they already exist)
    // This is safer than delete + insert and handles race conditions
    if (chat.messages && chat.messages.length > 0) {
      supabaseLogger.debug("Upserting", chat.messages.length, "messages");
      const messageInserts = chat.messages.map((msg, index) => messageToDbInsert(msg, chat.id, index));
      
      const { error: messagesError } = await supabase
        .from("messages")
        .upsert(messageInserts, { 
          onConflict: "id",
          ignoreDuplicates: false // Update existing messages instead of ignoring
        });

      if (messagesError) {
        supabaseLogger.error("Error upserting messages:", messagesError.message, messagesError.code);
        
        // Check if it's an RLS violation
        if (messagesError.code === "42501") {
          supabaseLogger.error("RLS violation on messages table. Possible causes:");
          supabaseLogger.error("  1. Session token may have expired during the request");
          supabaseLogger.error("  2. Chat ownership mismatch (chat.user_id != auth.uid())");
          supabaseLogger.error("  3. Chat was not properly created before inserting messages");
          supabaseLogger.error("Debug info:", {
            chatId: chat.id,
            userId,
            messageCount: messageInserts.length,
            sessionUserId: session?.user?.id,
          });
        }
        
        return false;
      }
      supabaseLogger.debug("Messages upserted successfully");
      
      // Now delete any messages that are in the database but not in our current set
      // This handles the case where messages were removed from the chat
      const currentMessageIds = chat.messages.map(m => m.id);
      
      // Only delete if we have message IDs to keep (prevent deleting all messages)
      if (currentMessageIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("messages")
          .delete()
          .eq("chat_id", chat.id)
          .not("id", "in", `(${currentMessageIds.join(",")})`);

        if (deleteError) {
          supabaseLogger.warn("Could not clean up old messages:", deleteError.message);
          // Don't fail the whole operation for this
        }
      }
    } else {
      // If chat has no messages, delete all messages for this chat
      supabaseLogger.debug("Chat has no messages, deleting all messages for chat:", chat.id);
      const { error: deleteError } = await supabase
        .from("messages")
        .delete()
        .eq("chat_id", chat.id);

      if (deleteError) {
        supabaseLogger.warn("Could not delete messages:", deleteError.message);
        // Don't fail for this
      }
    }

    return true;
  } catch (error) {
    supabaseLogger.error("Failed to save chat to Supabase:", error);
    return false;
  }
}

/**
 * Save multiple chats to Supabase (batch operation)
 */
export async function saveChatsToSupabase(chats: Chat[], userId: string): Promise<boolean> {
  try {
    for (const chat of chats) {
      const success = await saveChatToSupabase(chat, userId);
      if (!success) {
        supabaseLogger.error(`Failed to save chat ${chat.id}`);
        // Continue with other chats
      }
    }
    return true;
  } catch (error) {
    supabaseLogger.error("Failed to save chats to Supabase:", error);
    return false;
  }
}

/**
 * Delete a chat from Supabase
 */
export async function deleteChatFromSupabase(chatId: string): Promise<boolean> {
  try {
    // Messages will be automatically deleted due to CASCADE
    const { error } = await supabase.from("chats").delete().eq("id", chatId);

    if (error) {
      supabaseLogger.error("Error deleting chat from Supabase:", error);
      return false;
    }

    return true;
  } catch (error) {
    supabaseLogger.error("Failed to delete chat from Supabase:", error);
    return false;
  }
}

/**
 * Update a chat's metadata (title, settings) in Supabase
 */
export async function updateChatInSupabase(
  chatId: string,
  updates: Partial<Omit<Chat, "id" | "messages">>
): Promise<boolean> {
  try {
    const dbUpdates: any = {};
    
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.thinkingMode !== undefined) dbUpdates.thinking_mode = updates.thinkingMode;
    if (updates.mediaResolution !== undefined) dbUpdates.media_resolution = updates.mediaResolution;
    if (updates.domainExpertise !== undefined) dbUpdates.domain_expertise = updates.domainExpertise;
    if (updates.updatedAt !== undefined) dbUpdates.updated_at = new Date(updates.updatedAt).toISOString();

    const { error } = await supabase
      .from("chats")
      .update(dbUpdates)
      .eq("id", chatId);

    if (error) {
      supabaseLogger.error("Error updating chat in Supabase:", error);
      return false;
    }

    return true;
  } catch (error) {
    supabaseLogger.error("Failed to update chat in Supabase:", error);
    return false;
  }
}

/**
 * Add a message to a chat in Supabase
 */
export async function addMessageToSupabase(message: Message, chatId: string): Promise<boolean> {
  try {
    // Get the current max sequence number for this chat
    const { data: maxSeqData } = await supabase
      .from("messages")
      .select("sequence_number")
      .eq("chat_id", chatId)
      .order("sequence_number", { ascending: false })
      .limit(1)
      .single();
    
    const nextSequence = (maxSeqData?.sequence_number ?? -1) + 1;
    const messageInsert = messageToDbInsert(message, chatId, nextSequence);
    const { error } = await supabase.from("messages").insert(messageInsert);

    if (error) {
      supabaseLogger.error("Error adding message to Supabase:", error);
      return false;
    }

    // Update chat's updated_at timestamp
    await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId);

    return true;
  } catch (error) {
    supabaseLogger.error("Failed to add message to Supabase:", error);
    return false;
  }
}

/**
 * Update a message in Supabase
 */
export async function updateMessageInSupabase(
  messageId: string,
  updates: Partial<Message>
): Promise<boolean> {
  try {
    const dbUpdates: any = {};
    
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
    if (updates.videoS3Key !== undefined) dbUpdates.video_s3_key = updates.videoS3Key;
    if (updates.thumbnailUrl !== undefined) dbUpdates.thumbnail_url = updates.thumbnailUrl;
    if (updates.thumbnailS3Key !== undefined) dbUpdates.thumbnail_s3_key = updates.thumbnailS3Key;
    if (updates.videoPlaybackSpeed !== undefined) dbUpdates.video_playback_speed = updates.videoPlaybackSpeed;
    if (updates.isStreaming !== undefined) dbUpdates.is_streaming = updates.isStreaming;
    if (updates.inputTokens !== undefined) dbUpdates.input_tokens = updates.inputTokens;
    if (updates.outputTokens !== undefined) dbUpdates.output_tokens = updates.outputTokens;
    if (updates.responseDuration !== undefined) dbUpdates.response_duration = updates.responseDuration;
    if (updates.modelSettings !== undefined) dbUpdates.model_settings = updates.modelSettings;
    if (updates.ttsUsage !== undefined) dbUpdates.tts_usage = updates.ttsUsage;
    if (updates.poseData !== undefined) dbUpdates.pose_data = updates.poseData;
    if (updates.poseDataS3Key !== undefined) dbUpdates.pose_data_s3_key = updates.poseDataS3Key;

    const { error } = await supabase
      .from("messages")
      .update(dbUpdates)
      .eq("id", messageId);

    if (error) {
      supabaseLogger.error("Error updating message in Supabase:", error);
      return false;
    }

    return true;
  } catch (error) {
    supabaseLogger.error("Failed to update message in Supabase:", error);
    return false;
  }
}

