"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddModelButtonProps {
  onAdd: () => void;
  disabled?: boolean;
}

export function AddModelButton({ onAdd, disabled }: AddModelButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onAdd}
      disabled={disabled}
      className="flex items-center gap-2"
    >
      <Plus className="h-4 w-4" />
      Add Model
    </Button>
  );
} 