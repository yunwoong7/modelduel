import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ModelInfo } from "@/types/model";
import Image from "next/image";

interface ModelSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: ModelInfo[];
  selectedModels: string[];
  onSelect: (modelIds: string[]) => void;
  maxSelect?: number;
}

export function ModelSelectDialog({
  open,
  onOpenChange,
  models,
  selectedModels,
  onSelect,
  maxSelect = 4,
}: ModelSelectDialogProps) {
  console.log('ModelSelectDialog rendered:', { open, models, selectedModels });

  const [tempSelected, setTempSelected] = useState<string[]>(selectedModels);

  useEffect(() => {
    setTempSelected(selectedModels);
  }, [selectedModels]);

  const handleToggle = (modelId: string) => {
    setTempSelected(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      if (prev.length >= maxSelect) return prev;
      return [...prev, modelId];
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>모델 선택 ({tempSelected.length}/{maxSelect})</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {models.map(model => (
            <div key={model.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted">
              <Checkbox
                id={model.id}
                checked={tempSelected.includes(model.id)}
                onCheckedChange={() => handleToggle(model.id)}
                disabled={!tempSelected.includes(model.id) && tempSelected.length >= maxSelect}
              />
              <div className="flex items-center space-x-2 flex-1">
                <img 
                  src={model.icon_url} 
                  alt={model.provider_name}
                  className="w-6 h-6"
                />
                <div className="flex-1">
                  <label htmlFor={model.id} className="text-sm font-medium leading-none cursor-pointer">
                    {model.name}
                  </label>
                  <div className="text-xs text-muted-foreground mt-1">
                    {model.provider_name}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {model.capabilities.text && (
                    <div className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                      Text
                    </div>
                  )}
                  {model.capabilities.image && (
                    <div className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      Image
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={() => {
            onSelect(tempSelected);
            onOpenChange(false);
          }}>
            선택 완료
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 