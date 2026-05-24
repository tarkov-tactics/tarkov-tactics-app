"use client";

import { LabeledSelector } from "@/components/shared/labeled-selector";
import type { ScopeId, ScopeOption } from "../lib/directive-scopes";

interface DirectiveScopeFilterProps {
  options: ScopeOption[];
  value: ScopeId;
  onChange: (next: ScopeId) => void;
}

/**
 * Filter selector for the active directive's sub-categories. Wraps the shared
 * `LabeledSelector`. Renders inline above the right side column of the
 * Directives page (per spec-004).
 */
export function DirectiveScopeFilter({
  options,
  value,
  onChange,
}: DirectiveScopeFilterProps) {
  // The trigger looks nicest when there are 2+ real scopes; single-scope goals
  // (Lightkeeper today) get a disabled-looking placeholder rather than an empty
  // selector — but the spec says to still render the filter, so we keep it.
  return (
    <LabeledSelector
      label="Filter"
      value={value}
      onChange={onChange}
      options={options.map((o) => ({ value: o.id, label: o.label.toUpperCase() }))}
      triggerWidthClassName="w-full"
    />
  );
}
