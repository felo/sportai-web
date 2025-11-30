"use client";

import { DropdownMenu, Flex, Text, Button, Switch, Separator, Box, Slider } from "@radix-ui/themes";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";

export interface TimelineFilterState {
  showOnlyRallies: boolean;
  rallyBuffer: number; // seconds before rally start
}

interface TimelineFilterProps {
  filters: TimelineFilterState;
  onFilterChange: (filters: TimelineFilterState) => void;
  hasRallies?: boolean;
}

export function TimelineFilter({ 
  filters, 
  onFilterChange,
  hasRallies = true,
}: TimelineFilterProps) {
  const handleShowOnlyRalliesChange = (checked: boolean) => {
    onFilterChange({
      ...filters,
      showOnlyRallies: checked,
    });
  };

  const handleRallyBufferChange = (value: number[]) => {
    onFilterChange({
      ...filters,
      rallyBuffer: value[0],
    });
  };

  const activeFiltersCount = [
    filters.showOnlyRallies,
    filters.rallyBuffer !== 1, // Count as active if different from default
  ].filter(Boolean).length;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button
          size="2"
          variant="soft"
          style={{
            cursor: "pointer",
            position: "relative",
            padding: "var(--space-2)",
          }}
        >
          <MixerHorizontalIcon width={16} height={16} />
          {activeFiltersCount > 0 && (
            <Box
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: "var(--mint-9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--gray-1)",
              }}
            >
              {activeFiltersCount}
            </Box>
          )}
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content 
        align="end" 
        sideOffset={8}
        style={{ 
          minWidth: "260px",
          padding: "var(--space-3)",
        }}
      >
        <Flex direction="column" gap="3">
          <Text size="2" weight="medium" style={{ color: "var(--gray-12)" }}>
            Timeline Filters
          </Text>

          <Separator size="4" />

          {/* Show Only Rallies Toggle */}
          <Flex
            justify="between"
            align="center"
            style={{
              padding: "var(--space-2)",
              borderRadius: "var(--radius-2)",
              backgroundColor: filters.showOnlyRallies ? "var(--mint-a3)" : "transparent",
              transition: "background-color 0.15s ease",
            }}
          >
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Show only rallies
              </Text>
              <Text size="1" color="gray">
                Hide non-rally sections from timeline
              </Text>
            </Flex>
            <Switch
              size="2"
              checked={filters.showOnlyRallies}
              onCheckedChange={handleShowOnlyRalliesChange}
              disabled={!hasRallies}
              style={{
                cursor: hasRallies ? "pointer" : "not-allowed",
              }}
            />
          </Flex>

          {!hasRallies && (
            <Text size="1" color="gray" style={{ fontStyle: "italic" }}>
              No rallies detected in this video
            </Text>
          )}

          <Separator size="4" />

          {/* Rally Buffer Slider */}
          <Flex
            direction="column"
            gap="2"
            style={{
              padding: "var(--space-2)",
              borderRadius: "var(--radius-2)",
              backgroundColor: filters.rallyBuffer !== 1 ? "var(--mint-a3)" : "transparent",
              transition: "background-color 0.15s ease",
            }}
          >
            <Flex justify="between" align="center">
              <Text size="2" weight="medium">
                Rally buffer
              </Text>
              <Text size="2" weight="medium" style={{ color: "var(--mint-11)" }}>
                {filters.rallyBuffer}s
              </Text>
            </Flex>
            <Text size="1" color="gray">
              Seconds before rally start when clicking
            </Text>
            <Slider
              size="1"
              value={[filters.rallyBuffer]}
              onValueChange={handleRallyBufferChange}
              min={0}
              max={5}
              step={0.5}
              disabled={!hasRallies}
              style={{ width: "100%" }}
            />
            <Flex justify="between">
              <Text size="1" color="gray">0s</Text>
              <Text size="1" color="gray">5s</Text>
            </Flex>
          </Flex>
        </Flex>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

