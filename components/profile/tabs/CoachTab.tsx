"use client";

import { useState, useCallback } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  TextField,
  Select,
  Switch,
  Separator,
  Button,
  Card,
  Badge,
  Checkbox,
} from "@radix-ui/themes";
import { PlusIcon, Cross2Icon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import { useProfileContext } from "../ProfileContext";
import { FormField } from "../shared/FormField";
import { CollapsibleSection } from "../shared/CollapsibleSection";
import {
  yearsPlayingOptions,
  coachingLevelOptions,
  employmentTypeOptions,
  clientCountOptions,
  coachSpecialtyOptions,
  sportOptions,
  getCertificationOptions,
  fieldHelperText,
} from "@/lib/profile-options";
import {
  isRacketSport,
  type CoachingLevel,
  type EmploymentType,
  type ClientCount,
  type YearsPlaying,
  type CoachSpecialty,
  type Sport,
  type RacketSport,
  type CoachCertification,
} from "@/types/profile";

export function CoachTab() {
  const {
    profile,
    upsertCoachProfile,
    deleteCoachProfile,
    upsertCoachSport,
  } = useProfileContext();
  const [isCoach, setIsCoach] = useState(!!profile?.coach);
  const [showAddSport, setShowAddSport] = useState(false);
  const [selectedNewSport, setSelectedNewSport] = useState<Sport | "">("");
  
  const handleToggleCoach = useCallback(async (enabled: boolean) => {
    setIsCoach(enabled);
    if (enabled) {
      await upsertCoachProfile({ is_active: true });
    } else {
      await deleteCoachProfile();
    }
  }, [upsertCoachProfile, deleteCoachProfile]);
  
  const handleFieldChange = useCallback(
    async (field: string, value: unknown) => {
      await upsertCoachProfile({ [field]: value });
    },
    [upsertCoachProfile]
  );
  
  const handleSpecialtyToggle = useCallback(
    async (specialty: CoachSpecialty, checked: boolean) => {
      if (!profile?.coach) return;
      const current = profile.coach.specialties || [];
      const updated = checked
        ? [...current, specialty]
        : current.filter(s => s !== specialty);
      await upsertCoachProfile({ specialties: updated as CoachSpecialty[] });
    },
    [profile?.coach, upsertCoachProfile]
  );
  
  const handleAddCoachSport = useCallback(async () => {
    if (!selectedNewSport) return;
    await upsertCoachSport({ sport: selectedNewSport, certifications: [] });
    setSelectedNewSport("");
    setShowAddSport(false);
  }, [selectedNewSport, upsertCoachSport]);
  
  const handleCertificationToggle = useCallback(
    async (sport: Sport, certification: CoachCertification, checked: boolean) => {
      const existing = profile?.coachSports.find(cs => cs.sport === sport);
      const current = existing?.certifications || [];
      const updated = checked
        ? [...current, certification]
        : current.filter(c => c !== certification);
      await upsertCoachSport({ sport, certifications: updated as CoachCertification[] });
    },
    [profile?.coachSports, upsertCoachSport]
  );
  
  if (!profile) return null;
  
  const coach = profile.coach;
  const existingCoachSports = profile.coachSports.map(cs => cs.sport);
  const availableSports = sportOptions.filter(
    s => !existingCoachSports.includes(s.value)
  );
  
  return (
    <Flex direction="column" gap="6">
      {/* Header */}
      <Box>
        <Heading size="5" mb="2">Coach Profile</Heading>
        <Text size="2" color="gray">
          {fieldHelperText.isCoach}
        </Text>
      </Box>
      
      <Separator size="4" />
      
      {/* Coach Toggle */}
      <Card>
        <Flex align="center" justify="between" p="4">
          <Box>
            <Text size="3" weight="medium">I am a coach</Text>
            <Text size="2" color="gray" as="p">
              Enable to access coach-specific features
            </Text>
          </Box>
          <Switch
            size="3"
            checked={isCoach}
            onCheckedChange={handleToggleCoach}
          />
        </Flex>
      </Card>
      
      {/* Coach Details */}
      {isCoach && coach && (
        <>
          <Separator size="4" />
          
          {/* Experience */}
          <Box>
            <Heading size="3" mb="4">Experience & Level</Heading>
            <Flex gap="4" wrap="wrap">
              <Box style={{ flex: "1 1 200px" }}>
                <FormField
                  label="Years of Experience"
                >
                  <Select.Root
                    value={coach.years_experience || ""}
                    onValueChange={(v) => handleFieldChange("years_experience", v as YearsPlaying || null)}
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
                <FormField
                  label="Coaching Level"
                  helperText={fieldHelperText.coachingLevel}
                >
                  <Select.Root
                    value={coach.coaching_level || ""}
                    onValueChange={(v) => handleFieldChange("coaching_level", v as CoachingLevel || null)}
                  >
                    <Select.Trigger placeholder="Select" style={{ width: "100%" }} />
                    <Select.Content>
                      {coachingLevelOptions.map((c) => (
                        <Select.Item key={c.value} value={c.value}>
                          {c.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </FormField>
              </Box>
              
              <Box style={{ flex: "1 1 150px" }}>
                <FormField label="Employment Type">
                  <Select.Root
                    value={coach.employment_type || ""}
                    onValueChange={(v) => handleFieldChange("employment_type", v as EmploymentType || null)}
                  >
                    <Select.Trigger placeholder="Select" style={{ width: "100%" }} />
                    <Select.Content>
                      {employmentTypeOptions.map((e) => (
                        <Select.Item key={e.value} value={e.value}>
                          {e.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </FormField>
              </Box>
              
              <Box style={{ flex: "1 1 150px" }}>
                <FormField label="Number of Clients">
                  <Select.Root
                    value={coach.client_count || ""}
                    onValueChange={(v) => handleFieldChange("client_count", v as ClientCount || null)}
                  >
                    <Select.Trigger placeholder="Select" style={{ width: "100%" }} />
                    <Select.Content>
                      {clientCountOptions.map((c) => (
                        <Select.Item key={c.value} value={c.value}>
                          {c.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </FormField>
              </Box>
            </Flex>
          </Box>
          
          <Separator size="4" />
          
          {/* Specialties */}
          <Box>
            <Heading size="3" mb="2">Specialties</Heading>
            <Text size="2" color="gray" mb="4" as="p">
              {fieldHelperText.specialties}
            </Text>
            <Flex gap="3" wrap="wrap">
              {coachSpecialtyOptions.map((specialty) => (
                <label
                  key={specialty.value}
                  style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                >
                  <Checkbox
                    checked={coach.specialties?.includes(specialty.value as CoachSpecialty)}
                    onCheckedChange={(checked) => 
                      handleSpecialtyToggle(specialty.value as CoachSpecialty, !!checked)
                    }
                  />
                  <Text size="2">{specialty.label}</Text>
                </label>
              ))}
            </Flex>
          </Box>
          
          <Separator size="4" />
          
          {/* Affiliation */}
          <Box>
            <FormField label="Club / Federation Affiliation">
              <TextField.Root
                defaultValue={coach.affiliation || ""}
                placeholder="Name of your club or federation"
                onBlur={(e) => handleFieldChange("affiliation", e.target.value || null)}
                style={{ maxWidth: "400px" }}
              />
            </FormField>
            
            <Flex align="center" gap="3" mt="4">
              <Switch
                checked={coach.uses_video_analysis}
                onCheckedChange={(checked) => handleFieldChange("uses_video_analysis", checked)}
              />
              <Box>
                <Text size="2" weight="medium">I use video analysis in coaching</Text>
                <Text size="1" color="gray" as="p">
                  {fieldHelperText.usesVideoAnalysis}
                </Text>
              </Box>
            </Flex>
          </Box>
          
          <Separator size="4" />
          
          {/* Sports & Certifications */}
          <CollapsibleSection
            title="Sports & Certifications"
            description={fieldHelperText.certifications}
            defaultOpen={true}
          >
            {profile.coachSports.length === 0 ? (
              <Card
                style={{
                  padding: "24px",
                  textAlign: "center",
                  border: "2px dashed var(--gray-6)",
                  backgroundColor: "transparent",
                }}
              >
                <Text color="gray">Add the sports you coach to specify your certifications</Text>
              </Card>
            ) : (
              <Flex direction="column" gap="4">
                {profile.coachSports.map((cs) => {
                  const isRacket = isRacketSport(cs.sport);
                  const certOptions = isRacket ? getCertificationOptions(cs.sport as RacketSport) : [];
                  return (
                    <Card key={cs.id}>
                      <Flex direction="column" gap="3" p="3">
                        <Flex align="center" gap="2">
                          <Badge size="2" color="mint">
                            {sportOptions.find(s => s.value === cs.sport)?.label}
                          </Badge>
                        </Flex>
                        {isRacket && certOptions.length > 0 && (
                          <>
                            <Text size="2" weight="medium">Certifications:</Text>
                            <Flex gap="2" wrap="wrap">
                              {certOptions.map((cert) => (
                                <label
                                  key={cert.value}
                                  style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                                >
                                  <Checkbox
                                    size="1"
                                    checked={cs.certifications?.includes(cert.value)}
                                    onCheckedChange={(checked) =>
                                      handleCertificationToggle(cs.sport, cert.value as CoachCertification, !!checked)
                                    }
                                  />
                                  <Text size="1">{cert.label}</Text>
                                </label>
                              ))}
                            </Flex>
                          </>
                        )}
                      </Flex>
                    </Card>
                  );
                })}
              </Flex>
            )}
            
            {availableSports.length > 0 && (
              <Box mt="4">
                {showAddSport ? (
                  <Card>
                    <Flex align="center" gap="3" p="3">
                      <Select.Root
                        value={selectedNewSport}
                        onValueChange={(v) => setSelectedNewSport(v as Sport)}
                      >
                        <Select.Trigger placeholder="Select sport" style={{ width: "200px" }} />
                        <Select.Content>
                          {availableSports.map((s) => (
                            <Select.Item key={s.value} value={s.value}>
                              {s.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                      <Button
                        size="2"
                        className={buttonStyles.actionButtonSquare}
                        onClick={handleAddCoachSport}
                        disabled={!selectedNewSport}
                      >
                        Add
                      </Button>
                      <Button
                        size="2"
                        variant="ghost"
                        onClick={() => {
                          setShowAddSport(false);
                          setSelectedNewSport("");
                        }}
                      >
                        <Cross2Icon />
                      </Button>
                    </Flex>
                  </Card>
                ) : (
                  <Button className={buttonStyles.actionButtonSquare} onClick={() => setShowAddSport(true)}>
                    <PlusIcon width={16} height={16} />
                    Add Sport
                  </Button>
                )}
              </Box>
            )}
          </CollapsibleSection>
        </>
      )}
    </Flex>
  );
}

