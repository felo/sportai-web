"use client";

import { useState, useCallback } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Card,
  Select,
} from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import { useProfileContext } from "../ProfileContext";
import { FormField } from "../shared/FormField";
import { SkillLevelSelect } from "./SkillLevelSelect";
import { racketSportOptions } from "@/lib/profile-options";
import type { RacketSport, SkillLevel } from "@/types/profile";

interface SportFormProps {
  existingSports: RacketSport[];
  onClose: () => void;
  onAdded?: (sportId: string) => void;
}

export function SportForm({ existingSports, onClose, onAdded }: SportFormProps) {
  const { addSport, saving } = useProfileContext();
  const [selectedSport, setSelectedSport] = useState<RacketSport | "">("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel | "">("");
  const [error, setError] = useState<string | null>(null);
  
  // Currently only racket sports are supported in the database
  const availableRacketSports = racketSportOptions.filter(
    (s) => !existingSports.includes(s.value as RacketSport)
  );
  const hasAvailableSports = availableRacketSports.length > 0;
  
  const handleSubmit = useCallback(async () => {
    if (!selectedSport || !skillLevel) {
      setError("Please select a sport and skill level");
      return;
    }
    
    setError(null);
    const result = await addSport({
      sport: selectedSport,
      skill_level: skillLevel,
    });
    
    if (result) {
      onAdded?.(result.id);
      onClose();
    }
  }, [selectedSport, skillLevel, addSport, onClose, onAdded]);
  
  if (!hasAvailableSports) {
    return (
      <Card>
        <Flex direction="column" align="center" gap="3" p="4">
          <Text>You&apos;ve added all available sports!</Text>
          <Button className={buttonStyles.actionButtonSquareSecondary} onClick={onClose}>Close</Button>
        </Flex>
      </Card>
    );
  }
  
  return (
    <Card>
      <Flex direction="column" gap="4" p="4">
        <Flex justify="between" align="center">
          <Text weight="medium">Add a Sport</Text>
          <Button variant="ghost" size="1" onClick={onClose}>
            <Cross2Icon />
          </Button>
        </Flex>
        
        <Flex gap="4" wrap="wrap">
          <Box style={{ flex: "1 1 200px" }}>
            <FormField label="Sport" required>
              <Select.Root
                value={selectedSport}
                onValueChange={(v) => setSelectedSport(v as RacketSport)}
              >
                <Select.Trigger placeholder="Select sport" style={{ width: "100%" }} />
                <Select.Content>
                  {availableRacketSports.map((s) => (
                    <Select.Item key={s.value} value={s.value}>
                      {s.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormField>
          </Box>
          
          <Box style={{ flex: "1 1 200px" }}>
            <FormField label="Skill Level" required>
              <SkillLevelSelect
                value={skillLevel}
                onChange={(v) => setSkillLevel(v)}
                placeholder="Select level"
              />
            </FormField>
          </Box>
        </Flex>
        
        {error && (
          <Text size="2" color="red">{error}</Text>
        )}
        
        <Flex gap="2" justify="end">
          <Button className={buttonStyles.actionButtonSquareSecondary} onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            className={buttonStyles.actionButtonSquare}
            onClick={handleSubmit}
            disabled={saving || !selectedSport || !skillLevel}
          >
            {saving ? "Adding..." : "Add Sport"}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}

