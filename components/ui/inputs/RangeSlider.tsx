"use client";

import { Flex, Text } from "@radix-ui/themes";

export interface RangeSliderProps {
  /** Current value */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step?: number;
  /** Label text */
  label: string;
  /** Description text below slider */
  description?: string;
  /** Custom value display function */
  formatValue?: (value: number) => string;
  /** Show value on the right side */
  showValue?: boolean;
  /** Value color */
  valueColor?: "gray" | "mint" | "red" | "blue" | "green";
  /** Disabled state */
  disabled?: boolean;
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * RangeSlider - A labeled range input slider with value display
 * 
 * Features:
 * - Label and value display in header
 * - Range input slider
 * - Optional description text
 * - Custom value formatting
 * - Consistent styling
 * 
 * @example
 * ```tsx
 * <RangeSlider
 *   value={maxPoses}
 *   onChange={setMaxPoses}
 *   min={1}
 *   max={6}
 *   label="Detect players"
 *   formatValue={(v) => `${v} ${v === 1 ? 'player' : 'players'}`}
 *   description="Single player mode (Lightning/Thunder)"
 * />
 * ```
 */
export function RangeSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  description,
  formatValue,
  showValue = true,
  valueColor = "mint",
  disabled = false,
  className,
  style,
}: RangeSliderProps) {
  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <Flex direction="column" gap="1" className={className} style={style}>
      {/* Header with label and value */}
      <Flex justify="between" align="center">
        <Text size="2" color="gray" weight="medium">
          {label}
        </Text>
        {showValue && (
          <Text size="2" color={valueColor} weight="bold">
            {displayValue}
          </Text>
        )}
      </Flex>

      {/* Range input */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{
          width: "100%",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      />

      {/* Description */}
      {description && (
        <Text size="1" color="gray" style={{ opacity: 0.7 }}>
          {description}
        </Text>
      )}
    </Flex>
  );
}

