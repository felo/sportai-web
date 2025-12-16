"use client";

import { useMemo } from "react";
import { Flex, Text, SegmentedControl } from "@radix-ui/themes";
import { ViewGridIcon, ListBulletIcon } from "@radix-ui/react-icons";
import { FilterSelect } from "@/components/ui";
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

  // Build sport options
  const sportOptions = useMemo(() => [
    { value: "show_all", label: "All" },
    ...SPORTS.map((s) => ({ value: s.value, label: s.label })),
  ], []);

  // Build task type options
  const taskTypeOptions = useMemo(() => [
    { value: "all", label: "All Analysis" },
    ...TASK_TYPES.map((type) => ({ value: type.value, label: type.label })),
  ], []);

  return (
    <Flex justify="between" align="center" mb="3" wrap="wrap" gap="3">
      <Flex gap="3" align="center">
        {/* Sport Filter */}
        <FilterSelect
          value={filterSport}
          onValueChange={onFilterSportChange}
          options={sportOptions}
          icon="filter"
          placeholder="All Sports"
          minWidth="110px"
          size="1"
        />

        {/* Analysis Type Filter */}
        <FilterSelect
          value={filterTaskType}
          onValueChange={onFilterTaskTypeChange}
          options={taskTypeOptions}
          placeholder="All Analysis"
          minWidth="120px"
          size="1"
        />

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
            <ViewGridIcon width={12} height={12} />
            <Text size="1">Grid</Text>
          </Flex>
        </SegmentedControl.Item>
        <SegmentedControl.Item value="list">
          <Flex align="center" gap="1">
            <ListBulletIcon width={12} height={12} />
            <Text size="1">List</Text>
          </Flex>
        </SegmentedControl.Item>
      </SegmentedControl.Root>
    </Flex>
  );
}

