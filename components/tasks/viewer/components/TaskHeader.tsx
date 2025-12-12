"use client";

import { useState, useEffect } from "react";
import { Flex, Text, Badge } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui";
import buttonStyles from "@/styles/buttons.module.css";
import { Task, StatisticsResult } from "../types";
import { getSportColor } from "../utils";
import { getDeveloperMode } from "@/utils/storage";

interface TaskHeaderProps {
  task: Task;
  result: StatisticsResult | null;
  loadingResult: boolean;
  onBack: () => void;
  onLoadResult: () => void;
}

export function TaskHeader({ 
  task, 
  result, 
  loadingResult, 
  onBack, 
  onLoadResult,
}: TaskHeaderProps) {
  const [developerMode, setDeveloperMode] = useState(false);
  
  useEffect(() => {
    setDeveloperMode(getDeveloperMode());
    
    const handleDeveloperModeChange = () => {
      setDeveloperMode(getDeveloperMode());
    };
    
    window.addEventListener("developer-mode-change", handleDeveloperModeChange);
    return () => window.removeEventListener("developer-mode-change", handleDeveloperModeChange);
  }, []);
  
  return (
    <Flex justify="between" align="center">
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
          {task.sport !== "all" && (
            <Badge color={getSportColor(task.sport)} size="2">
              {task.sport.charAt(0).toUpperCase() + task.sport.slice(1)}
            </Badge>
          )}
          <Badge variant="soft" size="2">
            {task.task_type.charAt(0).toUpperCase() + task.task_type.slice(1)}
          </Badge>
          {developerMode && (
            <Text size="2" color="gray">
              Task: {task.sportai_task_id || task.id}
            </Text>
          )}
        </Flex>
      </Flex>

      <Flex align="center" gap="3">
        {task.status === "completed" && !result && !loadingResult && (
          <button
            className={buttonStyles.actionButtonSquare}
            onClick={onLoadResult}
          >
            Load
          </button>
        )}
      </Flex>
    </Flex>
  );
}

