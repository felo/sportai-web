"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  Box,
  Flex,
  Heading,
  Text,
  TextField,
  Select,
  Switch,
  TextArea,
  Separator,
  Button,
  Card,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import { useProfileContext } from "../ProfileContext";
import { CollapsibleSection } from "../shared/CollapsibleSection";
import { FormField } from "../shared/FormField";
import { SportCard } from "../sports/SportCard";
import { SportForm } from "../sports/SportForm";
import { EquipmentList } from "../equipment/EquipmentList";
import {
  genderOptions,
  handednessOptions,
  referralSourceOptions,
  countries,
  languages,
  timezones,
  fieldHelperText,
} from "@/lib/profile-options";
import type { Gender, Handedness, UnitsPreference, ReferralSource, RacketSport } from "@/types/profile";
import { isRacketSport } from "@/types/profile";

export function PlayerTab() {
  const { profile, updatePlayerProfile } = useProfileContext();
  const [showAddSport, setShowAddSport] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [newlyAddedSportId, setNewlyAddedSportId] = useState<string | null>(null);
  
  // Debounced update handler
  const handleFieldChange = useCallback(
    async (field: string, value: unknown) => {
      if (!profile) return;
      await updatePlayerProfile({ [field]: value });
    },
    [profile, updatePlayerProfile]
  );
  
  if (!profile) return null;
  
  const player = profile.player;
  const displayName = player.full_name || player.email?.split("@")[0] || "User";
  const initials = displayName
    .split(/[\s.]+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  
  return (
    <Flex direction="column" gap="6">
      {/* Avatar & Identity */}
      <Flex align="center" gap="4">
        {player.avatar_url && !imageError ? (
          <Image
            src={player.avatar_url}
            alt={displayName}
            width={80}
            height={80}
            style={{ borderRadius: "50%", objectFit: "cover" }}
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <Flex
            align="center"
            justify="center"
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: "var(--mint-9)",
              color: "var(--gray-1)",
              fontSize: "28px",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {initials}
          </Flex>
        )}
        <Box>
          <Heading size="5">{displayName}</Heading>
          <Text size="2" color="gray">{player.email}</Text>
        </Box>
      </Flex>
      
      <Separator size="4" />
      
      {/* Basic Info */}
      <Box>
        <Heading size="4" mb="4">Basic Information</Heading>
        
        <Flex gap="4" wrap="wrap">
          <Box style={{ flex: "1 1 300px" }}>
            <FormField label="Full Name">
              <TextField.Root
                defaultValue={player.full_name || ""}
                placeholder="Your name"
                onBlur={(e) => handleFieldChange("full_name", e.target.value)}
              />
            </FormField>
          </Box>
          
          <Box style={{ flex: "1 1 100px" }}>
            <FormField
              label="Date of Birth"
              helperText={fieldHelperText.dateOfBirth}
            >
              <TextField.Root
                type="date"
                defaultValue={player.date_of_birth || "2000-01-01"}
                min="1920-01-01"
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => handleFieldChange("date_of_birth", e.target.value || null)}
                style={{ width: "100%" }}
              />
            </FormField>
          </Box>
          
          <Box style={{ flex: "1 1 200px" }}>
            <FormField label="Country">
              <Select.Root
                value={player.country || ""}
                onValueChange={(v) => handleFieldChange("country", v || null)}
              >
                <Select.Trigger placeholder="Select country" style={{ width: "100%" }} />
                <Select.Content>
                  {countries.map((c) => (
                    <Select.Item key={c.value} value={c.value}>
                      {c.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormField>
          </Box>
        </Flex>
        
        <Flex align="center" gap="3" mt="4">
          <Switch
            checked={player.is_parent_of_junior}
            onCheckedChange={(checked) => handleFieldChange("is_parent_of_junior", checked)}
          />
          <Box>
            <Text size="2" weight="medium">I&apos;m a parent of a junior player</Text>
            <Text size="1" color="gray" as="p">
              {fieldHelperText.isParentOfJunior}
            </Text>
          </Box>
        </Flex>
      </Box>
      
      <Separator size="4" />
      
      {/* Physical Details - Collapsible */}
      <CollapsibleSection
        title="Physical Details"
        description="Help us with biomechanics analysis"
      >
        <Flex gap="4" wrap="wrap">
          <Box style={{ flex: "1 1 150px" }}>
            <FormField label="Gender">
              <Select.Root
                value={player.gender || ""}
                onValueChange={(v) => handleFieldChange("gender", v as Gender || null)}
              >
                <Select.Trigger placeholder="Select" style={{ width: "100%" }} />
                <Select.Content>
                  {genderOptions.map((g) => (
                    <Select.Item key={g.value} value={g.value}>
                      {g.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormField>
          </Box>
          
          <Box style={{ flex: "1 1 150px" }}>
            <FormField
              label="Handedness"
              helperText={fieldHelperText.handedness}
            >
              <Select.Root
                value={player.handedness || ""}
                onValueChange={(v) => handleFieldChange("handedness", v as Handedness || null)}
              >
                <Select.Trigger placeholder="Select" style={{ width: "100%" }} />
                <Select.Content>
                  {handednessOptions.map((h) => (
                    <Select.Item key={h.value} value={h.value}>
                      {h.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormField>
          </Box>
          
          <Box style={{ flex: "1 1 120px" }}>
            <FormField
              label={`Height (${player.units_preference === "metric" ? "cm" : "in"})`}
              helperText={fieldHelperText.height}
            >
              <TextField.Root
                type="number"
                defaultValue={player.height?.toString() || ""}
                placeholder={player.units_preference === "metric" ? "175" : "69"}
                onBlur={(e) => handleFieldChange("height", e.target.value ? Number(e.target.value) : null)}
              />
            </FormField>
          </Box>
          
          <Box style={{ flex: "1 1 120px" }}>
            <FormField
              label={`Weight (${player.units_preference === "metric" ? "kg" : "lbs"})`}
              helperText={fieldHelperText.weight}
            >
              <TextField.Root
                type="number"
                defaultValue={player.weight?.toString() || ""}
                placeholder={player.units_preference === "metric" ? "70" : "154"}
                onBlur={(e) => handleFieldChange("weight", e.target.value ? Number(e.target.value) : null)}
              />
            </FormField>
          </Box>
        </Flex>
        
        <Box mt="4">
          <FormField
            label="Physical Limitations or Injuries"
            helperText={fieldHelperText.physicalLimitations}
          >
            <TextArea
              defaultValue={player.physical_limitations || ""}
              placeholder="Any injuries, conditions, or limitations we should know about (optional)"
              rows={3}
              onBlur={(e) => handleFieldChange("physical_limitations", e.target.value || null)}
            />
          </FormField>
        </Box>
      </CollapsibleSection>
      
      <Separator size="4" />
      
      {/* Your Sports - Always visible */}
      <Box>
        <Flex justify="between" align="center" mb="4">
          <Box>
            <Heading size="3">Your Sports</Heading>
            <Text size="2" color="gray">
              Add the sports you play and your skill level
            </Text>
          </Box>
          <Button
            className={buttonStyles.actionButtonSquare}
            onClick={() => setShowAddSport(true)}
            disabled={profile.sports.length >= 10}
          >
            <PlusIcon width={16} height={16} />
            Add Sport
          </Button>
        </Flex>
        
        {profile.sports.length === 0 && !showAddSport ? (
          <Card
            style={{
              padding: "32px",
              textAlign: "center",
              border: "2px dashed var(--gray-6)",
              backgroundColor: "transparent",
            }}
          >
            <Text color="gray">
              No sports added yet. Add your first sport to get started!
            </Text>
          </Card>
        ) : (
          <Flex direction="column" gap="3">
            {profile.sports.map((sport) => (
              <SportCard 
                key={sport.id} 
                sport={sport} 
                defaultExpanded={sport.id === newlyAddedSportId}
              />
            ))}
          </Flex>
        )}
        
        {showAddSport && (
          <Box mt="3">
            <SportForm
              existingSports={profile.sports.map(s => s.sport).filter(isRacketSport)}
              onClose={() => setShowAddSport(false)}
              onAdded={(sportId) => setNewlyAddedSportId(sportId)}
            />
          </Box>
        )}
      </Box>
      
      <Separator size="4" />
      
      {/* Equipment - Collapsible */}
      <CollapsibleSection
        title="Equipment"
        description={fieldHelperText.equipment}
      >
        <EquipmentList />
      </CollapsibleSection>
      
      <Separator size="4" />
      
      {/* Preferences - Collapsible */}
      <CollapsibleSection
        title="Preferences"
        description="Customize your experience"
      >
        <Flex gap="4" wrap="wrap">
          <Box style={{ flex: "1 1 150px" }}>
            <FormField label="Units">
              <Select.Root
                value={player.units_preference}
                onValueChange={(v) => handleFieldChange("units_preference", v as UnitsPreference)}
              >
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  <Select.Item value="metric">Metric (cm, kg, km/h)</Select.Item>
                  <Select.Item value="imperial">Imperial (in, lbs, mph)</Select.Item>
                </Select.Content>
              </Select.Root>
            </FormField>
          </Box>
          
          <Box style={{ flex: "1 1 150px" }}>
            <FormField label="Language">
              <Select.Root
                value={player.language}
                onValueChange={(v) => handleFieldChange("language", v)}
              >
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  {languages.map((l) => (
                    <Select.Item key={l.value} value={l.value}>
                      {l.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormField>
          </Box>
          
          <Box style={{ flex: "1 1 200px" }}>
            <FormField label="Timezone">
              <Select.Root
                value={player.timezone || ""}
                onValueChange={(v) => handleFieldChange("timezone", v || null)}
              >
                <Select.Trigger placeholder="Auto-detect" style={{ width: "100%" }} />
                <Select.Content>
                  {timezones.map((t) => (
                    <Select.Item key={t.value} value={t.value}>
                      {t.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormField>
          </Box>
        </Flex>
        
        {!player.referral_source && (
          <Box mt="4">
            <FormField label="How did you hear about SportAI?">
              <Select.Root
                value={player.referral_source || ""}
                onValueChange={(v) => handleFieldChange("referral_source", v as ReferralSource || null)}
              >
                <Select.Trigger placeholder="Select one" style={{ width: "100%", maxWidth: "300px" }} />
                <Select.Content>
                  {referralSourceOptions.map((r) => (
                    <Select.Item key={r.value} value={r.value}>
                      {r.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormField>
          </Box>
        )}
      </CollapsibleSection>
    </Flex>
  );
}

