import { supabase } from "@/lib/supabase";
import type { Chat, Message } from "@/types/chat";
import type { Database } from "@/types/supabase";

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
  return {
    id: dbMsg.id,
    role: dbMsg.role as "user" | "assistant",
    content: dbMsg.content,
    videoUrl: dbMsg.video_url || undefined,
    videoS3Key: dbMsg.video_s3_key || undefined,
    videoPlaybackSpeed: dbMsg.video_playback_speed || undefined,
    isVideoSizeLimitError: dbMsg.is_video_size_limit_error || undefined,
    isStreaming: dbMsg.is_streaming || undefined,
    inputTokens: dbMsg.input_tokens || undefined,
    outputTokens: dbMsg.output_tokens || undefined,
    responseDuration: dbMsg.response_duration || undefined,
    modelSettings: dbMsg.model_settings ? (dbMsg.model_settings as any) : undefined,
    ttsUsage: dbMsg.tts_usage ? (dbMsg.tts_usage as any) : undefined,
    poseData: dbMsg.pose_data ? (dbMsg.pose_data as any) : undefined,
    videoFile: null,
    videoPreview: null,
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
 */
function messageToDbInsert(message: Message, chatId: string): DbMessageInsert {
  return {
    id: message.id,
    chat_id: chatId,
    role: message.role,
    content: message.content,
    video_url: message.videoUrl || null,
    video_s3_key: message.videoS3Key || null,
    video_playback_speed: message.videoPlaybackSpeed || null,
    is_video_size_limit_error: message.isVideoSizeLimitError || null,
    is_streaming: message.isStreaming || null,
    input_tokens: message.inputTokens || null,
    output_tokens: message.outputTokens || null,
    response_duration: message.responseDuration || null,
    model_settings: message.modelSettings ? (message.modelSettings as any) : null,
    tts_usage: message.ttsUsage ? (message.ttsUsage as any) : null,
    pose_data: message.poseData ? (message.poseData as any) : null,
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
      console.error("[Supabase] Session error:", sessionError);
      return [];
    }
    
    if (!session) {
      console.log("[Supabase] No active session, skipping Supabase load");
      return [];
    }
    
    console.log("[Supabase] Loading chats for user:", session.user.id);
    
    const { data: chatsData, error: chatsError } = await supabase
      .from("chats")
      .select("*")
      .order("updated_at", { ascending: false });

    if (chatsError) {
      console.error("[Supabase] Error loading chats:", chatsError.message, chatsError.code, chatsError.details);
      return [];
    }

    console.log("[Supabase] Loaded", chatsData?.length || 0, "chats");

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
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error(`Error loading messages for chat ${chatData.id}:`, messagesError);
        continue;
      }

      const messages = messagesData ? messagesData.map(dbMessageToMessage) : [];
      chats.push(dbChatToChat(chatData, messages));
    }

    return chats;
  } catch (error) {
    console.error("Failed to load chats from Supabase:", error);
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
        console.log(`[Supabase] Chat ${chatId} not found in Supabase (may exist only locally)`);
        return null;
      }
      console.error("Error loading chat from Supabase:", chatError.message || chatError);
      return null;
    }
    
    if (!chatData) {
      return null;
    }

    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error loading messages from Supabase:", messagesError);
      return null;
    }

    const messages = messagesData ? messagesData.map(dbMessageToMessage) : [];
    return dbChatToChat(chatData, messages);
  } catch (error) {
    console.error("Failed to load chat from Supabase:", error);
    return null;
  }
}

/**
 * Save a chat to Supabase (upsert)
 */
export async function saveChatToSupabase(chat: Chat, userId: string): Promise<boolean> {
  try {
    console.log("[Supabase] Saving chat:", chat.id, "for user:", userId);
    
    // Upsert chat
    const chatInsert = chatToDbInsert(chat, userId);
    console.log("[Supabase] Chat insert data:", JSON.stringify(chatInsert, null, 2));
    
    const { error: chatError } = await supabase
      .from("chats")
      .upsert(chatInsert, { onConflict: "id" });

    if (chatError) {
      console.error("[Supabase] Error upserting chat:", chatError.message, chatError.code, chatError.details, chatError.hint);
      
      // Check if it's a foreign key error (profile doesn't exist)
      if (chatError.code === "23503") {
        console.error("[Supabase] Foreign key error - profile may not exist for user:", userId);
      }
      return false;
    }
    
    console.log("[Supabase] Chat upserted successfully");

    // Delete existing messages for this chat and insert new ones
    // This ensures we have a clean slate
    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("chat_id", chat.id);

    if (deleteError) {
      console.error("[Supabase] Error deleting old messages:", deleteError.message);
      // Continue anyway, insert might still work
    }

    // Insert messages
    if (chat.messages && chat.messages.length > 0) {
      console.log("[Supabase] Inserting", chat.messages.length, "messages");
      const messageInserts = chat.messages.map((msg) => messageToDbInsert(msg, chat.id));
      const { error: messagesError } = await supabase
        .from("messages")
        .insert(messageInserts);

      if (messagesError) {
        console.error("[Supabase] Error inserting messages:", messagesError.message, messagesError.code);
        return false;
      }
      console.log("[Supabase] Messages inserted successfully");
    }

    return true;
  } catch (error) {
    console.error("Failed to save chat to Supabase:", error);
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
        console.error(`Failed to save chat ${chat.id}`);
        // Continue with other chats
      }
    }
    return true;
  } catch (error) {
    console.error("Failed to save chats to Supabase:", error);
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
      console.error("Error deleting chat from Supabase:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to delete chat from Supabase:", error);
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
      console.error("Error updating chat in Supabase:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to update chat in Supabase:", error);
    return false;
  }
}

/**
 * Add a message to a chat in Supabase
 */
export async function addMessageToSupabase(message: Message, chatId: string): Promise<boolean> {
  try {
    const messageInsert = messageToDbInsert(message, chatId);
    const { error } = await supabase.from("messages").insert(messageInsert);

    if (error) {
      console.error("Error adding message to Supabase:", error);
      return false;
    }

    // Update chat's updated_at timestamp
    await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId);

    return true;
  } catch (error) {
    console.error("Failed to add message to Supabase:", error);
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
    if (updates.videoPlaybackSpeed !== undefined) dbUpdates.video_playback_speed = updates.videoPlaybackSpeed;
    if (updates.isStreaming !== undefined) dbUpdates.is_streaming = updates.isStreaming;
    if (updates.inputTokens !== undefined) dbUpdates.input_tokens = updates.inputTokens;
    if (updates.outputTokens !== undefined) dbUpdates.output_tokens = updates.outputTokens;
    if (updates.responseDuration !== undefined) dbUpdates.response_duration = updates.responseDuration;
    if (updates.modelSettings !== undefined) dbUpdates.model_settings = updates.modelSettings;
    if (updates.ttsUsage !== undefined) dbUpdates.tts_usage = updates.ttsUsage;
    if (updates.poseData !== undefined) dbUpdates.pose_data = updates.poseData;

    const { error } = await supabase
      .from("messages")
      .update(dbUpdates)
      .eq("id", messageId);

    if (error) {
      console.error("Error updating message in Supabase:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to update message in Supabase:", error);
    return false;
  }
}

