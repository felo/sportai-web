"use client";

import { useState } from "react";
import { Dialog, Flex, Text, Button, Box, IconButton, Callout } from "@radix-ui/themes";
import { Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { createLogger } from "@/lib/logger";
import { signInWithOAuth } from "@/lib/supabase";

const authLogger = createLogger("Auth");

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Google icon component
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// Apple icon component
function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: "google" | "apple") => {
    try {
      setLoading(provider);
      setError(null);
      await signInWithOAuth(provider);
      // OAuth will redirect, so we don't need to close the modal
    } catch (err) {
      authLogger.error(`Error signing in with ${provider}:`, err);
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setLoading(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="400px">
        <Dialog.Title>Sign in to SportAI</Dialog.Title>
        <Box mb="4">
          <Flex direction="column" gap="1" pl="2">
            <Text size="2" color="gray">• Sync your chats across devices</Text>
            <Text size="2" color="gray">• Tailor the AI to your preferences</Text>
            <Text size="2" color="gray">• Try out more features</Text>
          </Flex>
        </Box>

        <Flex direction="column" gap="3">
          {/* Google Sign In Button */}
          <Button
            variant="outline"
            size="3"
            onClick={() => handleSignIn("google")}
            disabled={loading !== null}
            style={{ justifyContent: "center" }}
          >
            {loading === "google" ? (
              <Box
                style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid var(--gray-6)",
                  borderTopColor: "var(--accent-9)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            ) : (
              <GoogleIcon />
            )}
            <Text ml="2">Continue with Google</Text>
          </Button>

          {/* Apple Sign In Button */}
          <Button
            variant="solid"
            size="3"
            onClick={() => handleSignIn("apple")}
            disabled={loading !== null}
            style={{ 
              justifyContent: "center",
              backgroundColor: "var(--gray-12)",
              color: "var(--gray-1)",
            }}
          >
            {loading === "apple" ? (
              <Box
                style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid var(--gray-6)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            ) : (
              <AppleIcon />
            )}
            <Text ml="2">Continue with Apple</Text>
          </Button>
        </Flex>

        {error && (
          <Callout.Root color="red" mt="4">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        <Text size="1" color="gray" mt="4" align="center" as="p">
          By signing in, you agree to our{" "}
          <a
            href="https://sportai.com/terms-of-use"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--mint-9)", textDecoration: "underline" }}
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="https://sportai.com/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--mint-9)", textDecoration: "underline" }}
          >
            Privacy Policy
          </a>
          .
        </Text>

        <Dialog.Close>
          <IconButton
            variant="ghost"
            color="gray"
            size="1"
            style={{
              position: "absolute",
              top: "var(--space-3)",
              right: "var(--space-3)",
            }}
            aria-label="Close"
          >
            <Cross2Icon />
          </IconButton>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );
}
