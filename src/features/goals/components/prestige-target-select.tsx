"use client";

import { LabeledSelector } from "@/components/shared/labeled-selector";
import {
  PRESTIGE_TIERS_LIST,
  type PrestigeTarget,
} from "../lib/prestige-tiers";

interface PrestigeTargetSelectProps {
  value: PrestigeTarget;
  onChange: (next: PrestigeTarget) => void;
}

const options = PRESTIGE_TIERS_LIST.map((t) => ({
  value: String(t.tier) as "1" | "2" | "3" | "4" | "5" | "6",
  label: t.label,
}));

export function PrestigeTargetSelect({ value, onChange }: PrestigeTargetSelectProps) {
  return (
    <LabeledSelector
      label="Target Tier"
      value={String(value) as "1" | "2" | "3" | "4" | "5" | "6"}
      onChange={(next) => onChange(Number(next) as PrestigeTarget)}
      options={options}
      triggerWidthClassName="min-w-[120px]"
    />
  );
}
