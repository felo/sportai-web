"use client";

import { Text } from "@radix-ui/themes";

interface HelperTextProps {
  children: React.ReactNode;
}

export function HelperText({ children }: HelperTextProps) {
  return (
    <Text size="1" color="gray" as="p" style={{ marginTop: "4px" }}>
      {children}
    </Text>
  );
}

