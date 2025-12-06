"use client";

import { useState, useEffect } from "react";
import { Dialog, Button, Text, Flex, Box, ScrollArea, Badge, Tabs } from "@radix-ui/themes";
import { Cross2Icon, ReloadIcon, StackIcon } from "@radix-ui/react-icons";
import { createLogger } from "@/lib/logger";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Chat, Message } from "@/types/chat";

const debugLogger = createLogger("SupabaseDebug");

interface SupabaseData {
  profile: any | null;
  chats: any[];
  messages: any[];
  loading: boolean;
  error: string | null;
}

interface SupabaseDebugProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SupabaseDebug({ open: controlledOpen, onOpenChange }: SupabaseDebugProps = {}) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled or uncontrolled mode
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [data, setData] = useState<SupabaseData>({
    profile: null,
    chats: [],
    messages: [],
    loading: false,
    error: null,
  });
  const [activeTab, setActiveTab] = useState("profile");

  const fetchData = async () => {
    if (!user) return;

    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        debugLogger.error("Profile fetch error:", profileError);
      }

      // Fetch chats
      const { data: chats, error: chatsError } = await supabase
        .from("chats")
        .select("*")
        .order("updated_at", { ascending: false });

      if (chatsError) {
        debugLogger.error("Chats fetch error:", chatsError);
      }

      // Fetch messages
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (messagesError) {
        debugLogger.error("Messages fetch error:", messagesError);
      }

      setData({
        profile: profile || null,
        chats: chats || [],
        messages: messages || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  };

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const truncate = (str: string, length: number = 100) => {
    if (!str) return "";
    return str.length > length ? str.slice(0, length) + "..." : str;
  };

  // If controlled externally (from dropdown menu), don't render the trigger button
  const isControlled = controlledOpen !== undefined;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <Dialog.Trigger>
          <Button variant="ghost" size="2" style={{ width: "100%", justifyContent: "flex-start" }}>
            <StackIcon width="16" height="16" />
            <Text ml="2">Storage Debug</Text>
          </Button>
        </Dialog.Trigger>
      )}

      <Dialog.Content style={{ maxWidth: 700, maxHeight: "85vh" }}>
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title>
            <Flex align="center" gap="2">
              <StackIcon width="20" height="20" />
              Storage Debug
            </Flex>
          </Dialog.Title>
          <Flex gap="2">
            <Button
              variant="soft"
              size="1"
              onClick={fetchData}
              disabled={data.loading}
            >
              <ReloadIcon width="14" height="14" />
              Refresh
            </Button>
            <Dialog.Close>
              <Button variant="ghost" size="1">
                <Cross2Icon width="16" height="16" />
              </Button>
            </Dialog.Close>
          </Flex>
        </Flex>

        {!user ? (
          <Box p="4" style={{ textAlign: "center" }}>
            <Text color="gray">Not logged in. Sign in to view Supabase data.</Text>
          </Box>
        ) : data.loading ? (
          <Box p="4" style={{ textAlign: "center" }}>
            <Text color="gray">Loading...</Text>
          </Box>
        ) : data.error ? (
          <Box p="4" style={{ textAlign: "center" }}>
            <Text color="red">Error: {data.error}</Text>
          </Box>
        ) : (
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Trigger value="profile">
                Profile
              </Tabs.Trigger>
              <Tabs.Trigger value="chats">
                Chats <Badge size="1" ml="1">{data.chats.length}</Badge>
              </Tabs.Trigger>
              <Tabs.Trigger value="messages">
                Messages <Badge size="1" ml="1">{data.messages.length}</Badge>
              </Tabs.Trigger>
              <Tabs.Trigger value="raw">
                Raw JSON
              </Tabs.Trigger>
            </Tabs.List>

            <Box pt="3">
              <Tabs.Content value="profile">
                <ScrollArea style={{ height: 400 }}>
                  {data.profile ? (
                    <Box
                      p="3"
                      style={{
                        backgroundColor: "var(--gray-3)",
                        borderRadius: "8px",
                      }}
                    >
                      <Flex direction="column" gap="2">
                        <DataRow label="ID" value={data.profile.id} />
                        <DataRow label="Email" value={data.profile.email} />
                        <DataRow label="Full Name" value={data.profile.full_name || "(not set)"} />
                        <DataRow label="Avatar URL" value={truncate(data.profile.avatar_url || "(not set)", 50)} />
                        <DataRow label="Created At" value={formatDate(data.profile.created_at)} />
                        <DataRow label="Updated At" value={formatDate(data.profile.updated_at)} />
                      </Flex>
                    </Box>
                  ) : (
                    <Text color="gray">No profile found</Text>
                  )}
                </ScrollArea>
              </Tabs.Content>

              <Tabs.Content value="chats">
                <ScrollArea style={{ height: 400 }}>
                  <Flex direction="column" gap="2">
                    {data.chats.length === 0 ? (
                      <Text color="gray">No chats found in Supabase</Text>
                    ) : (
                      data.chats.map((chat) => (
                        <Box
                          key={chat.id}
                          p="3"
                          style={{
                            backgroundColor: "var(--gray-3)",
                            borderRadius: "8px",
                          }}
                        >
                          <Flex direction="column" gap="1">
                            <Flex justify="between" align="center">
                              <Text weight="medium" size="2">{chat.title}</Text>
                              <Badge size="1" color="blue">{chat.thinking_mode}</Badge>
                            </Flex>
                            <Text size="1" color="gray">ID: {chat.id}</Text>
                            <Text size="1" color="gray">
                              Created: {formatDate(chat.created_at)} | Updated: {formatDate(chat.updated_at)}
                            </Text>
                            <Flex gap="2" mt="1">
                              <Badge size="1" variant="outline">{chat.media_resolution}</Badge>
                              <Badge size="1" variant="outline">{chat.domain_expertise}</Badge>
                            </Flex>
                          </Flex>
                        </Box>
                      ))
                    )}
                  </Flex>
                </ScrollArea>
              </Tabs.Content>

              <Tabs.Content value="messages">
                <ScrollArea style={{ height: 400 }}>
                  <Flex direction="column" gap="2">
                    {data.messages.length === 0 ? (
                      <Text color="gray">No messages found in Supabase</Text>
                    ) : (
                      data.messages.map((msg) => (
                        <Box
                          key={msg.id}
                          p="3"
                          style={{
                            backgroundColor: "var(--gray-3)",
                            borderRadius: "8px",
                          }}
                        >
                          <Flex direction="column" gap="1">
                            <Flex justify="between" align="center">
                              <Badge
                                size="1"
                                color={msg.role === "user" ? "blue" : "green"}
                              >
                                {msg.role}
                              </Badge>
                              <Text size="1" color="gray">
                                {formatDate(msg.created_at)}
                              </Text>
                            </Flex>
                            <Text size="2" style={{ wordBreak: "break-word" }}>
                              {truncate(msg.content, 200)}
                            </Text>
                            <Text size="1" color="gray">
                              Chat: {msg.chat_id}
                            </Text>
                            {msg.video_url && (
                              <Badge size="1" color="orange">Has Video</Badge>
                            )}
                            {(msg.input_tokens || msg.output_tokens) && (
                              <Text size="1" color="gray">
                                Tokens: {msg.input_tokens || 0} in / {msg.output_tokens || 0} out
                              </Text>
                            )}
                          </Flex>
                        </Box>
                      ))
                    )}
                  </Flex>
                </ScrollArea>
              </Tabs.Content>

              <Tabs.Content value="raw">
                <ScrollArea style={{ height: 400 }}>
                  <Box
                    p="3"
                    style={{
                      backgroundColor: "var(--gray-3)",
                      borderRadius: "8px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    <Text weight="bold" size="2">Profile:</Text>
                    <pre style={{ margin: "8px 0", color: "var(--gray-11)" }}>
                      {JSON.stringify(data.profile, null, 2)}
                    </pre>
                    
                    <Text weight="bold" size="2" mt="4">Chats ({data.chats.length}):</Text>
                    <pre style={{ margin: "8px 0", color: "var(--gray-11)" }}>
                      {JSON.stringify(data.chats, null, 2)}
                    </pre>
                    
                    <Text weight="bold" size="2" mt="4">Messages ({data.messages.length}):</Text>
                    <pre style={{ margin: "8px 0", color: "var(--gray-11)" }}>
                      {JSON.stringify(data.messages, null, 2)}
                    </pre>
                  </Box>
                </ScrollArea>
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        )}

        <Flex justify="between" align="center" mt="4" pt="3" style={{ borderTop: "1px solid var(--gray-6)" }}>
          <Text size="1" color="gray">
            User ID: {user?.id || "N/A"}
          </Text>
          <Text size="1" color="gray">
            Email: {user?.email || "N/A"}
          </Text>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="between" gap="3">
      <Text size="2" color="gray" style={{ flexShrink: 0 }}>
        {label}:
      </Text>
      <Text size="2" style={{ wordBreak: "break-all", textAlign: "right" }}>
        {value}
      </Text>
    </Flex>
  );
}

