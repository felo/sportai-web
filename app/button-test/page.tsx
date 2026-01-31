"use client";

/**
 * Button Component Test Page
 *
 * Hidden test page for viewing all button component variants.
 * Access at: /button-test
 */

import { useState } from "react";
import { Box, Flex, Text, Heading, Button, Card, Separator } from "@radix-ui/themes";
import {
  VideoIcon,
  BarChartIcon,
  CalendarIcon,
  ChatBubbleIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
  GearIcon,
} from "@radix-ui/react-icons";
import { ToggleButton, IconButton } from "@/components/ui";
import buttonStyles from "@/styles/buttons.module.css";

export default function ButtonTestPage() {
  const [activeToggle, setActiveToggle] = useState<string>("option1");
  const [loading, setLoading] = useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <Box
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "var(--gray-1)",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <Flex direction="column" gap="6" style={{ maxWidth: "1200px", margin: "0 auto", padding: "var(--space-6)" }}>
        <Heading size="8">Button Component Showcase</Heading>
        <Text color="gray">Hidden test page for viewing all button variants</Text>

        <Separator size="4" />

        {/* Action Button - Pill (Primary CTA) */}
        <Card>
          <Flex direction="column" gap="4" p="4">
            <Heading size="5">Action Button - Pill (Primary CTA)</Heading>
            <Text size="2" color="gray">
              CSS Class: <code>buttonStyles.actionButton</code>
            </Text>
            <Flex gap="3" wrap="wrap" align="center">
              <Button className={buttonStyles.actionButton}>Default</Button>
              <Button className={buttonStyles.actionButton}>
                <VideoIcon width="16" height="16" />
                With Icon
              </Button>
              <Button className={buttonStyles.actionButton} disabled>
                Disabled
              </Button>
              <Button
                className={buttonStyles.actionButtonLoading}
                onClick={handleLoadingDemo}
              >
                Loading State
              </Button>
              <Button className={`${buttonStyles.actionButton} ${buttonStyles.actionButtonPulse}`}>
                With Pulse
              </Button>
            </Flex>
          </Flex>
        </Card>

        {/* Action Button - Square */}
        <Card>
          <Flex direction="column" gap="4" p="4">
            <Heading size="5">Action Button - Square</Heading>
            <Text size="2" color="gray">
              CSS Class: <code>buttonStyles.actionButtonSquare</code>
            </Text>
            <Flex gap="3" wrap="wrap" align="center">
              <Button className={buttonStyles.actionButtonSquare}>Default</Button>
              <Button className={buttonStyles.actionButtonSquare}>
                <GearIcon width="16" height="16" />
                With Icon
              </Button>
              <Button className={buttonStyles.actionButtonSquare} disabled>
                Disabled
              </Button>
              <Button className={`${buttonStyles.actionButtonSquare} ${buttonStyles.actionButtonPulse}`}>
                With Pulse
              </Button>
            </Flex>
          </Flex>
        </Card>

        {/* Secondary Buttons */}
        <Card>
          <Flex direction="column" gap="4" p="4">
            <Heading size="5">Secondary Buttons (Neutral)</Heading>
            <Text size="2" color="gray">
              CSS Class: <code>buttonStyles.actionButtonSecondary</code> / <code>buttonStyles.actionButtonSquareSecondary</code>
            </Text>
            <Flex gap="3" wrap="wrap" align="center">
              <Button className={buttonStyles.actionButtonSecondary}>Pill Secondary</Button>
              <Button className={buttonStyles.actionButtonSquareSecondary}>Square Secondary</Button>
              <Button className={buttonStyles.actionButtonSquareSecondary} disabled>
                Disabled
              </Button>
            </Flex>
          </Flex>
        </Card>

        {/* Red/Destructive Buttons */}
        <Card>
          <Flex direction="column" gap="4" p="4">
            <Heading size="5">Destructive Buttons (Red)</Heading>
            <Text size="2" color="gray">
              CSS Class: <code>buttonStyles.actionButtonRed</code> / <code>buttonStyles.actionButtonSquareRed</code>
            </Text>
            <Flex gap="3" wrap="wrap" align="center">
              <Button className={buttonStyles.actionButtonRed}>Pill Red</Button>
              <Button className={buttonStyles.actionButtonSquareRed}>Square Red</Button>
              <Button className={buttonStyles.actionButtonSquareRed}>
                <TrashIcon width="16" height="16" />
                Delete
              </Button>
            </Flex>
          </Flex>
        </Card>

        <Separator size="4" />

        {/* Toggle Buttons */}
        <Card>
          <Flex direction="column" gap="4" p="4">
            <Heading size="5">Toggle Button Component</Heading>
            <Text size="2" color="gray">
              Component: <code>{"<ToggleButton />"}</code> from @/components/ui
            </Text>

            <Text size="2" weight="medium">Size Variants:</Text>
            <Flex gap="3" wrap="wrap" align="center">
              <ToggleButton
                label="Size 1 (Small)"
                isActive={activeToggle === "size1"}
                onClick={() => setActiveToggle("size1")}
                size="1"
              />
              <ToggleButton
                label="Size 2 (Default)"
                isActive={activeToggle === "size2"}
                onClick={() => setActiveToggle("size2")}
                size="2"
              />
              <ToggleButton
                label="Size 3 (Large)"
                isActive={activeToggle === "size3"}
                onClick={() => setActiveToggle("size3")}
                size="3"
              />
            </Flex>

            <Text size="2" weight="medium">Tab Navigation Example:</Text>
            <Flex gap="2">
              <ToggleButton
                label="Chat"
                isActive={activeToggle === "chat"}
                onClick={() => setActiveToggle("chat")}
              />
              <ToggleButton
                label="Studio"
                isActive={activeToggle === "studio"}
                onClick={() => setActiveToggle("studio")}
              />
            </Flex>

            <Text size="2" weight="medium">With Icons:</Text>
            <Flex gap="2" wrap="wrap">
              <ToggleButton
                label="Video"
                icon={<VideoIcon width="16" height="16" />}
                isActive={activeToggle === "video"}
                onClick={() => setActiveToggle("video")}
              />
              <ToggleButton
                label="Analytics"
                icon={<BarChartIcon width="16" height="16" />}
                isActive={activeToggle === "analytics"}
                onClick={() => setActiveToggle("analytics")}
              />
              <ToggleButton
                label="Schedule"
                icon={<CalendarIcon width="16" height="16" />}
                isActive={activeToggle === "schedule"}
                onClick={() => setActiveToggle("schedule")}
              />
            </Flex>

            <Text size="2" weight="medium">States:</Text>
            <Flex gap="2" wrap="wrap">
              <ToggleButton
                label="Active"
                isActive={true}
                onClick={() => {}}
              />
              <ToggleButton
                label="Inactive"
                isActive={false}
                onClick={() => {}}
              />
              <ToggleButton
                label="Disabled"
                isActive={false}
                onClick={() => {}}
                disabled
              />
              <ToggleButton
                label="Low Opacity (No Data)"
                isActive={false}
                onClick={() => {}}
                inactiveOpacity={0.5}
              />
            </Flex>
          </Flex>
        </Card>

        <Separator size="4" />

        {/* Icon Buttons */}
        <Card>
          <Flex direction="column" gap="4" p="4">
            <Heading size="5">Icon Button Component</Heading>
            <Text size="2" color="gray">
              Component: <code>{"<IconButton />"}</code> from @/components/ui
            </Text>

            <Text size="2" weight="medium">Size Variants:</Text>
            <Flex gap="3" align="center">
              <IconButton icon={<PlusIcon />} size="1" ariaLabel="Add" tooltip="Size 1" />
              <IconButton icon={<PlusIcon />} size="2" ariaLabel="Add" tooltip="Size 2 (Default)" />
              <IconButton icon={<PlusIcon />} size="3" ariaLabel="Add" tooltip="Size 3" />
              <IconButton icon={<PlusIcon />} size="4" ariaLabel="Add" tooltip="Size 4" />
            </Flex>

            <Text size="2" weight="medium">Variants:</Text>
            <Flex gap="3" align="center">
              <IconButton icon={<GearIcon />} variant="ghost" ariaLabel="Settings" tooltip="Ghost" />
              <IconButton icon={<GearIcon />} variant="soft" ariaLabel="Settings" tooltip="Soft" />
              <IconButton icon={<GearIcon />} variant="solid" ariaLabel="Settings" tooltip="Solid" />
              <IconButton icon={<GearIcon />} variant="outline" ariaLabel="Settings" tooltip="Outline" />
            </Flex>

            <Text size="2" weight="medium">Colors:</Text>
            <Flex gap="3" align="center">
              <IconButton icon={<ChatBubbleIcon />} color="gray" ariaLabel="Chat" tooltip="Gray" />
              <IconButton icon={<ChatBubbleIcon />} color="mint" ariaLabel="Chat" tooltip="Mint" />
              <IconButton icon={<ChatBubbleIcon />} color="blue" ariaLabel="Chat" tooltip="Blue" />
              <IconButton icon={<ChatBubbleIcon />} color="red" ariaLabel="Chat" tooltip="Red" />
            </Flex>

            <Text size="2" weight="medium">States:</Text>
            <Flex gap="3" align="center">
              <IconButton icon={<UploadIcon />} ariaLabel="Upload" tooltip="Normal" />
              <IconButton icon={<UploadIcon />} ariaLabel="Upload" tooltip="Disabled" disabled />
            </Flex>
          </Flex>
        </Card>

        <Separator size="4" />

        {/* Home Page Button Examples */}
        <Card>
          <Flex direction="column" gap="4" p="4">
            <Heading size="5">Home Page Starter Prompts (Current)</Heading>
            <Text size="2" color="gray">
              These use <code>buttonStyles.actionButton</code> with uppercase text
            </Text>
            <Flex gap="2" wrap="wrap">
              <Button size="2" variant="soft" className={buttonStyles.actionButton}>
                <VideoIcon width="16" height="16" />
                Get feedback on a video
              </Button>
              <Button size="2" variant="soft" className={buttonStyles.actionButton}>
                <BarChartIcon width="16" height="16" />
                Analyze a match
              </Button>
              <Button size="2" variant="soft" className={buttonStyles.actionButton}>
                <CalendarIcon width="16" height="16" />
                Plan a session
              </Button>
            </Flex>
          </Flex>
        </Card>

        {/* Alternative: Pill Secondary with Lowercase */}
        <Card>
          <Flex direction="column" gap="4" p="4">
            <Heading size="5">Home Page Starter Prompts (Alternative)</Heading>
            <Text size="2" color="gray">
              Uses <code>actionButtonSecondary</code> + <code>borderless</code> + <code>sentenceCase</code> modifiers
            </Text>
            <Flex gap="2" wrap="wrap">
              <Button size="2" className={`${buttonStyles.actionButtonSecondary} ${buttonStyles.borderless} ${buttonStyles.sentenceCase}`}>
                <VideoIcon width="16" height="16" />
                Get video feedback
              </Button>
              <Button size="2" className={`${buttonStyles.actionButtonSecondary} ${buttonStyles.borderless} ${buttonStyles.sentenceCase}`}>
                <BarChartIcon width="16" height="16" />
                Analyze a match
              </Button>
              <Button size="2" className={`${buttonStyles.actionButtonSecondary} ${buttonStyles.borderless} ${buttonStyles.sentenceCase}`}>
                <CalendarIcon width="16" height="16" />
                Plan a session
              </Button>
            </Flex>
          </Flex>
        </Card>

        {/* Dialog Button Patterns */}
        <Card>
          <Flex direction="column" gap="4" p="4">
            <Heading size="5">Dialog Button Patterns</Heading>
            <Text size="2" color="gray">
              Common patterns for modals and dialogs
            </Text>

            <Text size="2" weight="medium">Confirm Dialog:</Text>
            <Flex gap="3" justify="end">
              <Button className={buttonStyles.actionButtonSquareSecondary}>Cancel</Button>
              <Button className={buttonStyles.actionButtonSquare}>Confirm</Button>
            </Flex>

            <Text size="2" weight="medium">Delete Confirmation:</Text>
            <Flex gap="3" justify="end">
              <Button className={buttonStyles.actionButtonSquareSecondary}>Cancel</Button>
              <Button className={buttonStyles.actionButtonSquareRed}>
                <TrashIcon width="16" height="16" />
                Delete
              </Button>
            </Flex>

            <Text size="2" weight="medium">Form Actions:</Text>
            <Flex gap="3" justify="end">
              <Button className={buttonStyles.actionButtonSquareSecondary}>Close</Button>
              <Button className={buttonStyles.actionButtonSquare}>Save Changes</Button>
            </Flex>
          </Flex>
        </Card>

        <Box py="6">
          <Text size="2" color="gray" align="center">
            End of Button Component Showcase
          </Text>
        </Box>
      </Flex>
    </Box>
  );
}
