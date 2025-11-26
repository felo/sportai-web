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
  Card,
  Checkbox,
} from "@radix-ui/themes";
import { useProfileContext } from "../ProfileContext";
import { FormField } from "../shared/FormField";
import {
  companySizeOptions,
  businessTypeOptions,
  businessRoleOptions,
  businessUseCaseOptions,
  countries,
  fieldHelperText,
} from "@/lib/profile-options";
import type {
  CompanySize,
  BusinessType,
  BusinessRole,
  BusinessUseCase,
} from "@/types/profile";

export function BusinessTab() {
  const { profile, upsertBusinessProfile, deleteBusinessProfile } = useProfileContext();
  const [isBusiness, setIsBusiness] = useState(!!profile?.business);
  const [companyName, setCompanyName] = useState(profile?.business?.company_name || "");
  
  const handleToggleBusiness = useCallback(async (enabled: boolean) => {
    setIsBusiness(enabled);
    if (!enabled) {
      await deleteBusinessProfile();
    }
  }, [deleteBusinessProfile]);
  
  const handleFieldChange = useCallback(
    async (field: string, value: unknown) => {
      // Company name is required, so we need to ensure it's set
      const name = field === "company_name" ? (value as string) : companyName;
      if (!name) return;
      
      await upsertBusinessProfile({
        company_name: name,
        [field]: value,
      });
    },
    [companyName, upsertBusinessProfile]
  );
  
  const handleUseCaseToggle = useCallback(
    async (useCase: BusinessUseCase, checked: boolean) => {
      if (!profile?.business || !companyName) return;
      const current = profile.business.use_cases || [];
      const updated = checked
        ? [...current, useCase]
        : current.filter(u => u !== useCase);
      await upsertBusinessProfile({
        company_name: companyName,
        use_cases: updated as BusinessUseCase[],
      });
    },
    [profile?.business, companyName, upsertBusinessProfile]
  );
  
  if (!profile) return null;
  
  const business = profile.business;
  
  return (
    <Flex direction="column" gap="6">
      {/* Header */}
      <Box>
        <Heading size="5" mb="2">Business Profile</Heading>
        <Text size="2" color="gray">
          {fieldHelperText.isBusiness}
        </Text>
      </Box>
      
      <Separator size="4" />
      
      {/* Business Toggle */}
      <Card>
        <Flex align="center" justify="between" p="4">
          <Box>
            <Text size="3" weight="medium">I represent a business</Text>
            <Text size="2" color="gray" as="p">
              Enable to access team and enterprise features
            </Text>
          </Box>
          <Switch
            size="3"
            checked={isBusiness}
            onCheckedChange={handleToggleBusiness}
          />
        </Flex>
      </Card>
      
      {/* Business Details */}
      {isBusiness && (
        <>
          <Separator size="4" />
          
          {/* Company Info */}
          <Box>
            <Heading size="3" mb="4">Company Information</Heading>
            <Flex gap="4" wrap="wrap">
              <Box style={{ flex: "1 1 300px" }}>
                <FormField label="Company Name" required>
                  <TextField.Root
                    value={companyName}
                    placeholder="Your company name"
                    onChange={(e) => setCompanyName(e.target.value)}
                    onBlur={() => {
                      if (companyName) {
                        handleFieldChange("company_name", companyName);
                      }
                    }}
                  />
                </FormField>
              </Box>
              
              <Box style={{ flex: "1 1 300px" }}>
                <FormField label="Website">
                  <TextField.Root
                    type="url"
                    defaultValue={business?.website || ""}
                    placeholder="https://yourcompany.com"
                    onBlur={(e) => handleFieldChange("website", e.target.value || null)}
                  />
                </FormField>
              </Box>
            </Flex>
            
            <Flex gap="4" wrap="wrap" mt="4">
              <Box style={{ flex: "1 1 200px" }}>
                <FormField label="Your Role">
                  <Select.Root
                    value={business?.role || ""}
                    onValueChange={(v) => handleFieldChange("role", v as BusinessRole || null)}
                  >
                    <Select.Trigger placeholder="Select" style={{ width: "100%" }} />
                    <Select.Content>
                      {businessRoleOptions.map((r) => (
                        <Select.Item key={r.value} value={r.value}>
                          {r.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </FormField>
              </Box>
              
              <Box style={{ flex: "1 1 200px" }}>
                <FormField label="Company Size">
                  <Select.Root
                    value={business?.company_size || ""}
                    onValueChange={(v) => handleFieldChange("company_size", v as CompanySize || null)}
                  >
                    <Select.Trigger placeholder="Select" style={{ width: "100%" }} />
                    <Select.Content>
                      {companySizeOptions.map((s) => (
                        <Select.Item key={s.value} value={s.value}>
                          {s.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </FormField>
              </Box>
              
              <Box style={{ flex: "1 1 200px" }}>
                <FormField label="Country">
                  <Select.Root
                    value={business?.country || ""}
                    onValueChange={(v) => handleFieldChange("country", v || null)}
                  >
                    <Select.Trigger placeholder="Select" style={{ width: "100%" }} />
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
          </Box>
          
          <Separator size="4" />
          
          {/* Business Type */}
          <Box>
            <FormField
              label="Business Type"
              helperText={fieldHelperText.businessType}
            >
              <Select.Root
                value={business?.business_type || ""}
                onValueChange={(v) => handleFieldChange("business_type", v as BusinessType || null)}
              >
                <Select.Trigger placeholder="Select your industry" style={{ width: "100%", maxWidth: "400px" }} />
                <Select.Content>
                  {businessTypeOptions.map((t) => (
                    <Select.Item key={t.value} value={t.value}>
                      {t.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormField>
          </Box>
          
          <Separator size="4" />
          
          {/* Use Cases */}
          <Box>
            <Heading size="3" mb="2">How will you use SportAI?</Heading>
            <Text size="2" color="gray" mb="4" as="p">
              {fieldHelperText.useCases}
            </Text>
            <Flex gap="3" wrap="wrap">
              {businessUseCaseOptions.map((useCase) => (
                <label
                  key={useCase.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    backgroundColor: business?.use_cases?.includes(useCase.value as BusinessUseCase)
                      ? "var(--mint-3)"
                      : "var(--gray-3)",
                    border: "1px solid",
                    borderColor: business?.use_cases?.includes(useCase.value as BusinessUseCase)
                      ? "var(--mint-6)"
                      : "var(--gray-5)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Checkbox
                    checked={business?.use_cases?.includes(useCase.value as BusinessUseCase)}
                    onCheckedChange={(checked) =>
                      handleUseCaseToggle(useCase.value as BusinessUseCase, !!checked)
                    }
                  />
                  <Text size="2">{useCase.label}</Text>
                </label>
              ))}
            </Flex>
          </Box>
        </>
      )}
    </Flex>
  );
}

