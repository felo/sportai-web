"use client";

import { Box, Text, Card } from "@radix-ui/themes";
import buttonStyles from "@/styles/buttons.module.css";

interface ErrorStateProps {
  error: string;
  onBack: () => void;
}

export function ErrorState({ error, onBack }: ErrorStateProps) {
  return (
    <Box
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--gray-1)",
      }}
    >
      <Card style={{ padding: "var(--space-5)", textAlign: "center" }}>
        <Text color="red" size="3">
          {error}
        </Text>
        <Box mt="4">
          <button className={buttonStyles.actionButtonSquareSecondary} onClick={onBack}>
            Back to Tasks
          </button>
        </Box>
      </Card>
    </Box>
  );
}





