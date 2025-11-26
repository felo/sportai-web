"use client";

import { Box, Text } from "@radix-ui/themes";
import { HelperText } from "./HelperText";

interface FormFieldProps {
  label: string;
  helperText?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  helperText,
  required = false,
  error,
  children,
}: FormFieldProps) {
  return (
    <Box style={{ marginBottom: "16px" }}>
      <Text as="label" size="2" weight="medium" style={{ display: "block", marginBottom: "6px" }}>
        {label}
        {required && <Text color="red" style={{ marginLeft: "4px" }}>*</Text>}
      </Text>
      {children}
      {helperText && !error && <HelperText>{helperText}</HelperText>}
      {error && (
        <Text size="1" color="red" as="p" style={{ marginTop: "4px" }}>
          {error}
        </Text>
      )}
    </Box>
  );
}

