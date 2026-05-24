"use client";

import { Select } from "@base-ui/react/select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LabeledSelectorOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

interface LabeledSelectorProps<T extends string> {
  label: string;
  value: T | null;
  onChange: (value: T) => void;
  options: ReadonlyArray<LabeledSelectorOption<T>>;
  triggerWidthClassName?: string;
  placeholder?: string;
  className?: string;
}

export function LabeledSelector<T extends string>({
  label,
  value,
  onChange,
  options,
  triggerWidthClassName = "min-w-[140px] max-w-[280px]",
  placeholder = "—",
  className,
}: LabeledSelectorProps<T>) {
  return (
    <div className={cn("space-y-1.5 min-w-0", className)}>
      <label className="text-telemetry text-muted-foreground block">
        {label}
      </label>
      <Select.Root
        value={value}
        onValueChange={(next: T | null) => {
          if (next) onChange(next);
        }}
      >
        <Select.Trigger
          className={cn(
            "inline-flex h-9 items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors gap-2",
            "hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring",
            "active:translate-y-px",
            triggerWidthClassName
          )}
        >
          <Select.Value>
            {(v: T | null) => {
              const opt = options.find((o) => o.value === v);
              return (
                <span className="flex items-center gap-1.5 truncate">
                  {opt?.icon && <span>{opt.icon}</span>}
                  <span className="truncate">{opt?.label ?? placeholder}</span>
                </span>
              );
            }}
          </Select.Value>
          <Select.Icon>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Positioner sideOffset={6} alignItemWithTrigger={false}>
            <Select.Popup
              className={cn(
                "min-w-[var(--anchor-width)] rounded-md border border-border bg-popover text-popover-foreground shadow-lg",
                "max-h-[min(var(--available-height),20rem)] overflow-y-auto",
                "outline-none p-1"
              )}
            >
              {options.map((opt) => (
                <Select.Item
                  key={opt.value}
                  value={opt.value}
                  className={cn(
                    "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                    "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                    "data-[selected]:text-primary"
                  )}
                >
                  <Select.ItemIndicator className="absolute right-2">
                    <Check className="size-3.5" />
                  </Select.ItemIndicator>
                  <Select.ItemText>
                    <span className="flex items-center gap-1.5 pr-6">
                      {opt.icon && <span>{opt.icon}</span>}
                      <span>{opt.label}</span>
                    </span>
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
