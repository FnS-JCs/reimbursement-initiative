"use client";

import { useState, useMemo } from "react";
import { Button } from "@/ui/button";
import { Label } from "@/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectFilterProps {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

export function MultiSelectFilter({
  label,
  placeholder,
  options,
  selectedValues,
  onChange,
  disabled,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1)
      return options.find((o) => o.value === selectedValues[0])?.label ?? placeholder;
    return `${selectedValues.length} selected`;
  }, [options, placeholder, selectedValues]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-9 w-full justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-normal shadow-sm ring-offset-background transition-all duration-150 hover:border-ring/50 hover:bg-accent/30 active:scale-[0.98] data-[state=open]:border-ring/60 data-[state=open]:bg-accent/40 data-[state=open]:shadow-md"
          >
            <span className="truncate">{summary}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 opacity-60 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 max-h-80 overflow-y-auto"
        >
          {options.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              No options
            </div>
          ) : (
            options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={() =>
                  onChange(
                    selectedValues.includes(option.value)
                      ? selectedValues.filter((v) => v !== option.value)
                      : [...selectedValues, option.value]
                  )
                }
                onSelect={(e) => e.preventDefault()}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
