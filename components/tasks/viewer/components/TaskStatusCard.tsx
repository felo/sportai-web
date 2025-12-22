"use client";

import { Flex, Text, Card } from "@radix-ui/themes";
import { Task } from "../types";

interface TaskStatusCardProps {
  task: Task;
}

export function TaskStatusCard({ task }: TaskStatusCardProps) {
  const getMessage = () => {
    switch (task.status) {
      case "completed":
        return "Click 'Load Result Data' to view statistics";
      case "processing":
        return "Task is still processing...";
      case "failed":
        return `Error: ${task.error_message}`;
      default:
        return "Task is pending...";
    }
  };

  return (
    <Card style={{ border: "1px solid var(--gray-6)" }}>
      <Flex direction="column" gap="3" p="4" align="center">
        <Text size="3" color="gray">
          {getMessage()}
        </Text>
      </Flex>
    </Card>
  );
}














