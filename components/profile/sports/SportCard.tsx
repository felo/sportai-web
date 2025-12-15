"use client";

import { useState, useCallback } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Card,
  Badge,
  Select,
  TextField,
  Checkbox,
  IconButton,
  AlertDialog,
} from "@radix-ui/themes";
import { ChevronDownIcon, ChevronRightIcon, TrashIcon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import { useProfileContext } from "../ProfileContext";
import { FormField } from "../shared/FormField";
import {
  sportOptions,
  skillLevelOptions,
  yearsPlayingOptions,
  getPlayingStyleOptions,
  getSurfaceOptions,
  getGoalOptions,
  fieldHelperText,
} from "@/lib/profile-options";
import { SkillLevelSelect } from "./SkillLevelSelect";
import {
  isRacketSport,
  type RacketSport,
  type PlayerSport,
  type SkillLevel,
  type YearsPlaying,
  type PlayingStyle,
  type PreferredSurface,
  type SportGoal,
} from "@/types/profile";

interface SportCardProps {
  sport: PlayerSport;
  defaultExpanded?: boolean;
}

export function SportCard({ sport, defaultExpanded = false }: SportCardProps) {
  const { updateSport, deleteSport, saving } = useProfileContext();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const sportLabel = sportOptions.find(s => s.value === sport.sport)?.label || sport.sport;
  const skillLabel = skillLevelOptions.find(s => s.value === sport.skill_level)?.label || sport.skill_level;
  
  // Racket sport specific options (only computed for racket sports)
  const isRacket = isRacketSport(sport.sport);
  const playingStyleOptions = isRacket ? getPlayingStyleOptions(sport.sport as RacketSport) : [];
  const surfaceOptions = isRacket ? getSurfaceOptions(sport.sport as RacketSport) : [];
  const goalOptions = isRacket ? getGoalOptions(sport.sport as RacketSport) : [];
  
  const handleFieldChange = useCallback(
    async (field: string, value: unknown) => {
      await updateSport({ id: sport.id, [field]: value });
    },
    [sport.id, updateSport]
  );
  
  const handleSurfaceToggle = useCallback(
    async (surface: PreferredSurface, checked: boolean) => {
      const current = sport.preferred_surfaces || [];
      const updated = checked
        ? [...current, surface]
        : current.filter(s => s !== surface);
      await handleFieldChange("preferred_surfaces", updated);
    },
    [sport.preferred_surfaces, handleFieldChange]
  );
  
  const handleGoalToggle = useCallback(
    async (goal: SportGoal, checked: boolean) => {
      const current = sport.goals || [];
      const updated = checked
        ? [...current, goal]
        : current.filter(g => g !== goal);
      await handleFieldChange("goals", updated);
    },
    [sport.goals, handleFieldChange]
  );
  
  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    await deleteSport(sport.id);
    setShowDeleteDialog(false);
  }, [sport.id, deleteSport]);
  
  return (
    <Card>
      {/* Header - always visible */}
      <Flex
        align="center"
        justify="between"
        p="3"
        style={{ cursor: "pointer" }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Flex align="center" gap="3">
          {isExpanded ? (
            <ChevronDownIcon width={16} height={16} />
          ) : (
            <ChevronRightIcon width={16} height={16} />
          )}
          <Badge size="2" color="mint">
            {sportLabel}
          </Badge>
          <Badge size="1" variant="soft" color="gray">
            {skillLabel}
          </Badge>
          {sport.club_name && (
            <Text size="1" color="gray">@ {sport.club_name}</Text>
          )}
        </Flex>
        
        <IconButton
          variant="ghost"
          color="red"
          size="1"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteDialog(true);
          }}
          disabled={saving || isDeleting}
        >
          <TrashIcon width={14} height={14} />
        </IconButton>
      </Flex>
      
      {/* Expanded content */}
      {isExpanded && (
        <Box
          p="4"
          style={{
            borderTop: "1px solid var(--gray-5)",
            animation: "sportCardExpand 0.2s ease-out",
          }}
        >
          <Flex gap="4" wrap="wrap">
            <Box style={{ flex: "1 1 180px" }}>
              <FormField
                label="Skill Level"
                helperText={fieldHelperText.skillLevel}
              >
                <SkillLevelSelect
                  value={sport.skill_level}
                  onChange={(v) => handleFieldChange("skill_level", v as SkillLevel)}
                />
              </FormField>
            </Box>
            
            <Box style={{ flex: "1 1 180px" }}>
              <FormField label="Years Playing">
                <Select.Root
                  value={sport.years_playing || ""}
                  onValueChange={(v) => handleFieldChange("years_playing", v as YearsPlaying || null)}
                >
                  <Select.Trigger placeholder="Select" style={{ width: "100%" }} />
                  <Select.Content>
                    {yearsPlayingOptions.map((y) => (
                      <Select.Item key={y.value} value={y.value}>
                        {y.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </FormField>
            </Box>
            
            <Box style={{ flex: "1 1 200px" }}>
              <FormField label="Club Name">
                <TextField.Root
                  defaultValue={sport.club_name || ""}
                  placeholder="Where you play"
                  onBlur={(e) => handleFieldChange("club_name", e.target.value || null)}
                />
              </FormField>
            </Box>
          </Flex>
          
          {/* Racket sport specific fields */}
          {isRacketSport(sport.sport) && (
            <>
              <Box mt="4">
                <FormField
                  label="Playing Style"
                  helperText={fieldHelperText.playingStyle}
                >
                  <Select.Root
                    value={sport.playing_style || ""}
                    onValueChange={(v) => handleFieldChange("playing_style", v as PlayingStyle || null)}
                  >
                    <Select.Trigger placeholder="Select your style" style={{ width: "100%", maxWidth: "300px" }} />
                    <Select.Content>
                      {playingStyleOptions.map((s) => (
                        <Select.Item key={s.value} value={s.value}>
                          {s.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </FormField>
              </Box>
              
              {/* Surfaces */}
              <Box mt="4">
                <Text size="2" weight="medium" mb="2" as="p">Preferred Surfaces</Text>
                <Flex gap="2" wrap="wrap">
                  {surfaceOptions.map((surface) => (
                    <label
                      key={surface.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        backgroundColor: sport.preferred_surfaces?.includes(surface.value as PreferredSurface)
                          ? "var(--mint-3)"
                          : "var(--gray-3)",
                        border: "1px solid",
                        borderColor: sport.preferred_surfaces?.includes(surface.value as PreferredSurface)
                          ? "var(--mint-6)"
                          : "var(--gray-5)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Checkbox
                        size="1"
                        checked={sport.preferred_surfaces?.includes(surface.value as PreferredSurface)}
                        onCheckedChange={(checked) =>
                          handleSurfaceToggle(surface.value as PreferredSurface, !!checked)
                        }
                      />
                      <Text size="1">{surface.label}</Text>
                    </label>
                  ))}
                </Flex>
              </Box>
              
              {/* Goals */}
              <Box mt="4">
                <Text size="2" weight="medium" mb="1" as="p">Goals</Text>
                <Text size="1" color="gray" mb="2" as="p">{fieldHelperText.goals}</Text>
                <Flex gap="2" wrap="wrap">
                  {goalOptions.map((goal) => (
                    <label
                      key={goal.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        backgroundColor: sport.goals?.includes(goal.value as SportGoal)
                          ? "var(--mint-3)"
                          : "var(--gray-3)",
                        border: "1px solid",
                        borderColor: sport.goals?.includes(goal.value as SportGoal)
                          ? "var(--mint-6)"
                          : "var(--gray-5)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Checkbox
                        size="1"
                        checked={sport.goals?.includes(goal.value as SportGoal)}
                        onCheckedChange={(checked) =>
                          handleGoalToggle(goal.value as SportGoal, !!checked)
                        }
                      />
                      <Text size="1">{goal.label}</Text>
                    </label>
                  ))}
                </Flex>
              </Box>
            </>
          )}
        </Box>
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Remove Sport</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure you want to remove {sportLabel} from your profile? This will also delete any related equipment.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button className={buttonStyles.actionButtonSquareSecondary}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                className={buttonStyles.actionButtonSquareRed}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Removing..." : "Remove"}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Card>
  );
}

