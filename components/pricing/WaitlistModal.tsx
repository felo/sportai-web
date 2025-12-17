"use client";

import { useState } from "react";
import { Dialog, Flex, Text, Button, Box, IconButton, TextField } from "@radix-ui/themes";
import { Cross2Icon, EnvelopeClosedIcon } from "@radix-ui/react-icons";
import { supabase } from "@/lib/supabase";
import buttonStyles from "@/styles/buttons.module.css";

type PlanInterest = "pro-player" | "pro-coach";

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planInterest: PlanInterest;
}

export function WaitlistModal({
  open,
  onOpenChange,
  planName,
  planInterest,
}: WaitlistModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from("pricing_waitlist")
        .insert({
          email: email.trim().toLowerCase(),
          plan_interest: planInterest,
        });

      if (insertError) {
        // Handle duplicate entry
        if (insertError.code === "23505") {
          setIsSuccess(true);
          setError("You're already on the list for this plan!");
        } else {
          throw insertError;
        }
      } else {
        setIsSuccess(true);
      }
    } catch (err) {
      console.error("Error joining waitlist:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    // Reset state after close
    if (!open) {
      setTimeout(() => {
        setEmail("");
        setIsSuccess(false);
        setError(null);
      }, 200);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>Get Early Access</Dialog.Title>
        
        <Text size="2" color="gray" mb="4" as="p">
          Be the first to know when {planName} launches. We&apos;ll notify you with
          exclusive early-bird pricing.
        </Text>

        {isSuccess ? (
          <Flex direction="column" align="center" gap="3" py="4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://res.cloudinary.com/djtxhrly7/image/upload/v1765579947/SportAI_Open_Horizontal_light_ajy8ld.svg"
              alt="SportAI Open"
              style={{ height: "32px", marginBottom: "8px" }}
            />
            <Text size="3" weight="medium">
              {error || "You're on the list!"}
            </Text>
            <Text size="2" color="gray" align="center">
              {error
                ? "We already have your email for this plan."
                : "We'll be in touch soon with early access details."}
            </Text>
            <Button
              size="2"
              className={buttonStyles.actionButtonSquare}
              onClick={() => handleClose(false)}
              style={{ marginTop: "8px" }}
            >
              Got it
            </Button>
          </Flex>
        ) : (
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
              <Box>
                <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
                  Email address
                </Text>
                <TextField.Root
                  size="3"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                >
                  <TextField.Slot>
                    <EnvelopeClosedIcon width={16} height={16} />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              {error && !isSuccess && (
                <Text size="2" color="red">
                  {error}
                </Text>
              )}

              <Button
                type="submit"
                size="3"
                className={buttonStyles.actionButtonSquare}
                disabled={isSubmitting || !email.trim()}
                style={{ width: "100%" }}
              >
                {isSubmitting ? "Joining..." : "Notify Me"}
              </Button>

              <Text size="1" color="gray" align="center">
                We&apos;ll only email you about this plan. No spam, ever.
              </Text>
            </Flex>
          </form>
        )}

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
