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
  IconButton,
  TextArea,
  AlertDialog,
} from "@radix-ui/themes";
import { PlusIcon, TrashIcon, Cross2Icon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import { useProfileContext } from "../ProfileContext";
import { FormField } from "../shared/FormField";
import {
  sportOptions,
  getEquipmentTypeOptions,
  getBrandsForSport,
} from "@/lib/profile-options";
import { isRacketSport, type Sport, type RacketSport, type EquipmentType, type PlayerEquipment } from "@/types/profile";

interface EquipmentCardProps {
  equipment: PlayerEquipment;
}

function EquipmentCard({ equipment }: EquipmentCardProps) {
  const { deleteEquipment, saving } = useProfileContext();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const sportLabel = sportOptions.find(s => s.value === equipment.sport)?.label || equipment.sport;
  
  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    await deleteEquipment(equipment.id);
    setShowDeleteDialog(false);
  }, [equipment.id, deleteEquipment]);
  
  return (
    <>
      <Card>
        <Flex align="center" justify="between" p="3">
          <Flex align="center" gap="3">
            <Badge size="1" variant="soft" color="gray">
              {sportLabel}
            </Badge>
            <Badge size="1" variant="outline">
              {equipment.equipment_type}
            </Badge>
            <Text size="2" weight="medium">
              {equipment.brand} {equipment.model_name}
            </Text>
            {equipment.notes && (
              <Text size="1" color="gray">({equipment.notes})</Text>
            )}
          </Flex>
          
          <IconButton
            variant="ghost"
            color="red"
            size="1"
            onClick={() => setShowDeleteDialog(true)}
            disabled={saving || isDeleting}
          >
            <TrashIcon width={14} height={14} />
          </IconButton>
        </Flex>
      </Card>
      
      {/* Delete confirmation dialog */}
      <AlertDialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Remove Equipment</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure you want to remove {equipment.brand} {equipment.model_name}?
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
    </>
  );
}

function AddEquipmentForm({ onClose }: { onClose: () => void }) {
  const { addEquipment, profile, saving } = useProfileContext();
  const [sport, setSport] = useState<RacketSport | "">("");
  const [equipmentType, setEquipmentType] = useState<EquipmentType | "">("");
  const [brand, setBrand] = useState("");
  const [modelName, setModelName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const equipmentTypeOptions = sport ? getEquipmentTypeOptions(sport) : [];
  const brandOptions = sport ? getBrandsForSport(sport) : [];
  
  // Get available racket sports from player's sports (equipment only for racket sports)
  const availableRacketSports = (profile?.sports.map(s => s.sport) || []).filter(isRacketSport);
  const filteredSportOptions = sportOptions.filter(s => availableRacketSports.includes(s.value as RacketSport));
  
  const handleSubmit = useCallback(async () => {
    if (!sport || !equipmentType || !brand || !modelName) {
      setError("Please fill in all required fields");
      return;
    }
    
    setError(null);
    const result = await addEquipment({
      sport,
      equipment_type: equipmentType,
      brand,
      model_name: modelName,
      notes: notes || undefined,
    });
    
    if (result) {
      onClose();
    }
  }, [sport, equipmentType, brand, modelName, notes, addEquipment, onClose]);
  
  if (filteredSportOptions.length === 0) {
    return (
      <Card>
        <Flex direction="column" align="center" gap="3" p="4">
          <Text color="gray">Add a sport to your profile first to add equipment.</Text>
          <Button className={buttonStyles.actionButtonSquareSecondary} onClick={onClose}>Close</Button>
        </Flex>
      </Card>
    );
  }
  
  return (
    <Card>
      <Flex direction="column" gap="4" p="4">
        <Flex justify="between" align="center">
          <Text weight="medium">Add Equipment</Text>
          <Button variant="ghost" size="1" onClick={onClose}>
            <Cross2Icon />
          </Button>
        </Flex>
        
        <Flex gap="4" wrap="wrap">
          <Box style={{ flex: "1 1 150px" }}>
            <FormField label="Sport" required>
              <Select.Root
                value={sport}
                onValueChange={(v) => {
                  setSport(v as RacketSport);
                  setEquipmentType("");
                  setBrand("");
                }}
              >
                <Select.Trigger placeholder="Select" style={{ width: "100%" }} />
                <Select.Content>
                  {filteredSportOptions.map((s) => (
                    <Select.Item key={s.value} value={s.value}>
                      {s.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormField>
          </Box>
          
          <Box style={{ flex: "1 1 150px" }}>
            <FormField label="Type" required>
              <Select.Root
                value={equipmentType}
                onValueChange={(v) => setEquipmentType(v as EquipmentType)}
                disabled={!sport}
              >
                <Select.Trigger placeholder="Select" style={{ width: "100%" }} />
                <Select.Content>
                  {equipmentTypeOptions.map((t) => (
                    <Select.Item key={t.value} value={t.value}>
                      {t.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormField>
          </Box>
          
          <Box style={{ flex: "1 1 180px" }}>
            <FormField label="Brand" required>
              <Select.Root
                value={brand}
                onValueChange={setBrand}
                disabled={!sport}
              >
                <Select.Trigger placeholder="Select brand" style={{ width: "100%" }} />
                <Select.Content>
                  {brandOptions.map((b) => (
                    <Select.Item key={b} value={b}>
                      {b}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormField>
          </Box>
          
          <Box style={{ flex: "1 1 200px" }}>
            <FormField label="Model Name" required>
              <TextField.Root
                value={modelName}
                placeholder="e.g., Pro Staff 97"
                onChange={(e) => setModelName(e.target.value)}
              />
            </FormField>
          </Box>
        </Flex>
        
        <Box>
          <FormField label="Notes (optional)">
            <TextArea
              value={notes}
              placeholder="String tension, grip size, etc."
              rows={2}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>
        </Box>
        
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
            disabled={saving || !sport || !equipmentType || !brand || !modelName}
          >
            {saving ? "Adding..." : "Add Equipment"}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}

export function EquipmentList() {
  const { profile } = useProfileContext();
  const [showAddForm, setShowAddForm] = useState(false);
  
  if (!profile) return null;
  
  return (
    <Flex direction="column" gap="3">
      {profile.equipment.length === 0 && !showAddForm ? (
        <Card
          style={{
            padding: "24px",
            textAlign: "center",
            border: "2px dashed var(--gray-6)",
            backgroundColor: "transparent",
          }}
        >
          <Text color="gray">
            No equipment added yet. Add your rackets, paddles, and gear!
          </Text>
        </Card>
      ) : (
        <>
          {profile.equipment.map((eq) => (
            <EquipmentCard key={eq.id} equipment={eq} />
          ))}
        </>
      )}
      
      {showAddForm ? (
        <AddEquipmentForm onClose={() => setShowAddForm(false)} />
      ) : (
        <Button
          className={buttonStyles.actionButtonSquare}
          onClick={() => setShowAddForm(true)}
          style={{ alignSelf: "flex-start" }}
        >
          <PlusIcon width={16} height={16} />
          Add Equipment
        </Button>
      )}
    </Flex>
  );
}

