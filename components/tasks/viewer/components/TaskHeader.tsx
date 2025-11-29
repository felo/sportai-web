"use client";

import { Flex, Text, Badge, Spinner } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui";
import buttonStyles from "@/styles/buttons.module.css";
import { Task, StatisticsResult } from "../types";
import { getSportColor } from "../utils";

interface TaskHeaderProps {
  task: Task;
  result: StatisticsResult | null;
  loadingResult: boolean;
  onBack: () => void;
  onLoadResult: () => void;
}

export function TaskHeader({ task, result, loadingResult, onBack, onLoadResult }: TaskHeaderProps) {
  return (
    <Flex justify="between" align="center" mb="5">
      <Flex align="center" gap="4">
        <IconButton
          icon={<ArrowLeftIcon />}
          onClick={onBack}
          variant="ghost"
          size="2"
          ariaLabel="Back to tasks"
          tooltip="Back to Tasks"
        />
        <Flex align="center" gap="3">
          <Badge color={getSportColor(task.sport)} size="2">
            {task.sport.charAt(0).toUpperCase() + task.sport.slice(1)}
          </Badge>
          <Badge variant="soft" size="2">
            {task.task_type}
          </Badge>
          <Text size="2" color="gray">
            Task: {task.sportai_task_id || task.id}
          </Text>
        </Flex>
      </Flex>

      {task.status === "completed" && !result && (
        <button
          className={buttonStyles.actionButtonSquare}
          onClick={onLoadResult}
          disabled={loadingResult}
        >
          {loadingResult ? <Spinner size="1" /> : <Text></Text>}
          {loadingResult ? "Loading..." : "Load"}
        </button>
      )}
    </Flex>
  );
}

