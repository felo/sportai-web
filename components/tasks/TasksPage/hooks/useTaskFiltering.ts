"use client";

import { useState, useMemo, useCallback } from "react";
import type { Task, SortColumn, SortDirection } from "../types";
import { STATUS_SORT_ORDER } from "../constants";

interface UseTaskFilteringOptions {
  tasks: Task[];
}

interface UseTaskFilteringReturn {
  // Filter state
  filterSport: string;
  setFilterSport: (sport: string) => void;
  filterTaskType: string;
  setFilterTaskType: (type: string) => void;

  // Sort state
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  handleSort: (column: SortColumn) => void;

  // Results
  filteredTasks: Task[];
}

/**
 * Hook for filtering and sorting tasks.
 */
export function useTaskFiltering({ tasks }: UseTaskFilteringOptions): UseTaskFilteringReturn {
  // Filter state
  const [filterSport, setFilterSport] = useState<string>("show_all");
  const [filterTaskType, setFilterTaskType] = useState<string>("all");

  // Sort state
  const [sortColumn, setSortColumn] = useState<SortColumn>("created");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Handle column header click for sorting
  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  }, [sortColumn]);

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    // First filter
    let result = tasks.filter((task) => {
      if (filterSport !== "show_all" && task.sport !== filterSport) return false;
      if (filterTaskType !== "all" && task.task_type !== filterTaskType) return false;
      return true;
    });

    // Then sort
    result = [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "sport":
          comparison = a.sport.localeCompare(b.sport);
          break;
        case "type":
          comparison = a.task_type.localeCompare(b.task_type);
          break;
        case "status":
          comparison = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
          break;
        case "created":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "timeLeft":
          comparison = getTimeRemainingForSort(a) - getTimeRemainingForSort(b);
          break;
        case "analysis":
          const hasResultA = a.status === "completed" ? 1 : 0;
          const hasResultB = b.status === "completed" ? 1 : 0;
          comparison = hasResultA - hasResultB;
          break;
        case "taskId":
          comparison = (a.sportai_task_id || a.id).localeCompare(b.sportai_task_id || b.id);
          break;
        case "videoUrl":
          comparison = a.video_url.localeCompare(b.video_url);
          break;
        case "length":
          comparison = (a.video_length || 0) - (b.video_length || 0);
          break;
        case "elapsed":
          comparison = getElapsedForSort(a) - getElapsedForSort(b);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [tasks, filterSport, filterTaskType, sortColumn, sortDirection]);

  return {
    filterSport,
    setFilterSport,
    filterTaskType,
    setFilterTaskType,
    sortColumn,
    sortDirection,
    handleSort,
    filteredTasks,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTimeRemainingForSort(task: Task): number {
  if (task.status === "completed") return Infinity;
  if (task.status === "failed") return Infinity + 1;
  if (!task.estimated_compute_time) return Infinity - 1;
  const elapsed = (Date.now() - new Date(task.created_at).getTime()) / 1000;
  return task.estimated_compute_time - elapsed;
}

function getElapsedForSort(task: Task): number {
  const start = new Date(task.created_at).getTime();
  const end =
    task.status === "completed" || task.status === "failed"
      ? new Date(task.completed_at || task.updated_at).getTime()
      : Date.now();
  return end - start;
}





