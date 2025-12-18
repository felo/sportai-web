"use client";

import { Dialog, Flex, Button, Text, Link } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";

interface FileSizeLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal shown when user tries to upload a video that exceeds the size limit
 */
export function FileSizeLimitModal({ open, onOpenChange }: FileSizeLimitModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        style={{ maxWidth: 420 }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Flex direction="column" gap="4">
          <Flex justify="between" align="start">
            <Dialog.Title style={{ margin: 0 }}>
              Video Size Limit
            </Dialog.Title>
            <Dialog.Close>
              <Button
                variant="ghost"
                color="gray"
                size="1"
                style={{ cursor: "pointer" }}
              >
                <Cross2Icon />
              </Button>
            </Dialog.Close>
          </Flex>

          <Text size="2" color="gray">
            Oops, this BETA only allows you to upload a maximum size of 100MB (~1-3 minutes of video).{" "}
            <Link href="https://sportai.com/contact" target="_blank" rel="noopener noreferrer">
              Contact us
            </Link>
            {" "}if you want to try out larger videos.
          </Text>

          <Flex justify="end" pt="2">
            <Dialog.Close>
              <Button className={buttonStyles.actionButtonSquare} style={{ cursor: "pointer" }}>
                Got it
              </Button>
            </Dialog.Close>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

