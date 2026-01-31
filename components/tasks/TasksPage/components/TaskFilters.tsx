"use client";

import { useMemo } from "react";
import { Flex, Text, SegmentedControl, Tooltip } from "@radix-ui/themes";
import { ViewGridIcon, ListBulletIcon, UploadIcon } from "@radix-ui/react-icons";
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
  developerMode?: boolean;
  onUploadClick?: () => void;
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
  developerMode = false,
  onUploadClick,
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

      {/* Right side: Upload button (default) or Grid/List toggle (developer mode) */}
      {developerMode ? (
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
      ) : (
        <Tooltip content="Upload video for PRO analysis">
          <button
            type="button"
            onClick={onUploadClick}
            style={{
              height: "36px",
              borderRadius: "9999px",
              backgroundColor: "#7ADB8F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              cursor: "pointer",
              transition: "all 0.3s ease-out",
              border: "2px solid white",
              flexShrink: 0,
              padding: "0 var(--space-3)",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = "#95E5A6";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)";
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = "#7ADB8F";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)";
            }}
          >
            <UploadIcon width="18" height="18" color="#1C1C1C" />
            <Text size="2" style={{ color: "#1C1C1C", whiteSpace: "nowrap", fontWeight: 500 }}>
              Upload Video
            </Text>
          </button>
        </Tooltip>
      )}
    </Flex>
  );
}
