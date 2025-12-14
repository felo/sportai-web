"use client";

import { Flex, Text, Select, SegmentedControl } from "@radix-ui/themes";
import { ViewGridIcon, ListBulletIcon } from "@radix-ui/react-icons";
import { TASK_TYPES, SPORTS } from "../constants";

interface TaskFiltersProps {
  filterSport: string;
  onFilterSportChange: (value: string) => void;
  filterTaskType: string;
  onFilterTaskTypeChange: (value: string) => void;
  filteredCount: number;
  totalCount: number;
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
}

/**
 * Filter controls and view mode toggle for the tasks list.
 */
export function TaskFilters({
  filterSport,
  onFilterSportChange,
  filterTaskType,
  onFilterTaskTypeChange,
  filteredCount,
  totalCount,
  viewMode,
  onViewModeChange,
}: TaskFiltersProps) {
  const showFilterCount = filterSport !== "show_all" || filterTaskType !== "all";

  return (
    <Flex justify="between" align="center" mb="3" wrap="wrap" gap="3">
      <Flex gap="3" align="center">
        <Text size="2" weight="medium" color="gray">
          Videos
        </Text>

        {/* Sport Filter */}
        <Select.Root value={filterSport} onValueChange={onFilterSportChange} size="1">
          <Select.Trigger placeholder="All Sports" style={{ minWidth: "110px" }} />
          <Select.Content>
            <Select.Item value="show_all">All</Select.Item>
            {SPORTS.map((s) => (
              <Select.Item key={s.value} value={s.value}>
                {s.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        {/* Analysis Type Filter */}
        <Select.Root value={filterTaskType} onValueChange={onFilterTaskTypeChange} size="1">
          <Select.Trigger placeholder="All Analysis" style={{ minWidth: "120px" }} />
          <Select.Content>
            <Select.Item value="all">All Analysis</Select.Item>
            {TASK_TYPES.map((type) => (
              <Select.Item key={type.value} value={type.value}>
                {type.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        {/* Show count of filtered results */}
        {showFilterCount && (
          <Text size="1" color="gray">
            {filteredCount} of {totalCount}
          </Text>
        )}
      </Flex>

      <SegmentedControl.Root
        value={viewMode}
        onValueChange={(value) => onViewModeChange(value as "list" | "grid")}
        size="1"
      >
        <SegmentedControl.Item value="grid">
          <Flex align="center" gap="1">
            <ViewGridIcon width={14} height={14} />
            <Text size="1">Grid</Text>
          </Flex>
        </SegmentedControl.Item>
        <SegmentedControl.Item value="list">
          <Flex align="center" gap="1">
            <ListBulletIcon width={14} height={14} />
            <Text size="1">List</Text>
          </Flex>
        </SegmentedControl.Item>
      </SegmentedControl.Root>
    </Flex>
  );
}
