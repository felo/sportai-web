"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Flex,
  Text,
  Button,
  Tabs,
  Skeleton,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProfileProvider, useProfileContext } from "./ProfileContext";
import { PlayerTab } from "./tabs/PlayerTab";
import { CoachTab } from "./tabs/CoachTab";
import { BusinessTab } from "./tabs/BusinessTab";

type ProfileTab = "player" | "coach" | "business";

export function ProfilePage() {
  return (
    <ProfileProvider>
      <ProfilePageContent />
    </ProfileProvider>
  );
}

function ProfilePageContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading, saving, error } = useProfileContext();
  const [activeTab, setActiveTab] = useState<ProfileTab>("player");
  
  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);
  
  // Show loading state
  if (authLoading || loading) {
    return (
      <Box
        style={{
          height: "100vh",
          overflow: "auto",
          backgroundColor: "var(--gray-1)",
        }}
      >
        <Box
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            padding: "24px",
          }}
        >
          {/* Header skeleton */}
          <Flex justify="between" align="center" mb="4">
            <Skeleton style={{ width: "120px", height: "36px" }} />
          </Flex>
          
          {/* Tabs skeleton */}
          <Skeleton style={{ width: "100%", height: "44px", marginBottom: "24px" }} />
          
          {/* Avatar skeleton */}
          <Flex align="center" gap="4" mb="6">
            <Skeleton style={{ width: "80px", height: "80px", borderRadius: "50%" }} />
            <Flex direction="column" gap="2">
              <Skeleton style={{ width: "150px", height: "24px" }} />
              <Skeleton style={{ width: "200px", height: "18px" }} />
            </Flex>
          </Flex>
          
          {/* Content skeleton */}
          <Flex direction="column" gap="4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} style={{ width: "100%", height: "60px" }} />
            ))}
          </Flex>
        </Box>
      </Box>
    );
  }
  
  // Show error or not authenticated
  if (!user || !profile) {
    return (
      <Box
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--gray-1)",
        }}
      >
        <Flex direction="column" align="center" gap="4">
          <Text color="red">{error || "Failed to load profile"}</Text>
          <Button variant="soft" onClick={() => router.push("/")}>
            Return to Home
          </Button>
        </Flex>
      </Box>
    );
  }
  
  return (
    <Box
      style={{
        height: "100vh",
        overflow: "auto",
        backgroundColor: "var(--gray-1)",
      }}
    >
      <Box
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "24px",
          paddingBottom: "80px",
        }}
      >
        {/* Header */}
        <Flex justify="between" align="center" mb="4">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            style={{ gap: "8px" }}
          >
            <ArrowLeftIcon width={16} height={16} />
            <Text>Back to Chat</Text>
          </Button>
          
          {saving && (
            <Flex align="center" gap="2">
              <Box
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "var(--mint-9)",
                  animation: "pulse 1s infinite",
                }}
              />
              <Text size="2" color="gray">Saving...</Text>
            </Flex>
          )}
        </Flex>
        
        {/* Horizontal Tabs */}
        <Tabs.Root
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ProfileTab)}
        >
          <Tabs.List size="2">
            <Tabs.Trigger value="player">
              Player
            </Tabs.Trigger>
            
            <Tabs.Trigger value="coach">
              Coach
              {profile.coach && (
                <Box
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "var(--mint-9)",
                    marginLeft: "6px",
                  }}
                />
              )}
            </Tabs.Trigger>
            
            <Tabs.Trigger value="business">
              Business
              {profile.business && (
                <Box
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "var(--mint-9)",
                    marginLeft: "6px",
                  }}
                />
              )}
            </Tabs.Trigger>
          </Tabs.List>
          
          {/* Tab Content */}
          <Box pt="5">
            <Tabs.Content value="player">
              <PlayerTab />
            </Tabs.Content>
            
            <Tabs.Content value="coach">
              <CoachTab />
            </Tabs.Content>
            
            <Tabs.Content value="business">
              <BusinessTab />
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Box>
    </Box>
  );
}
