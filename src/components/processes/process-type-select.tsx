"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ProcessTypeSelectProps = {
  id?: string;
  label?: string;
  /** Lista já normalizada + valor atual (usar `mergeProcessTypeOptionsForSelect`). */
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholderOption?: string;
  className?: string;
  required?: boolean;
};

export function ProcessTypeSelect({
  id = "process-tipo",
  label = "Tipo",
  options,
  value,
  onChange,
  placeholderOption = "Selecione…",
  className,
  required,
}: ProcessTypeSelectProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      >
        <option value="">{placeholderOption}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    </div>
  );
}
