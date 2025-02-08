import { useState, useEffect } from "react";
import { Settings2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SystemPromptModalProps {
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
}

export function SystemPromptModal({
  systemPrompt,
  onSystemPromptChange,
}: SystemPromptModalProps) {
  const [open, setOpen] = useState(false);
  const [tempPrompt, setTempPrompt] = useState(systemPrompt);

  useEffect(() => {
    setTempPrompt(systemPrompt);
  }, [systemPrompt]);

  const handleSave = () => {
    onSystemPromptChange(tempPrompt);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempPrompt(systemPrompt);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          시스템 설정
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>시스템 프롬프트 설정</DialogTitle>
          <DialogDescription>
            모든 AI 모델에 적용될 시스템 프롬프트를 설정합니다. 
            각 모델의 행동과 응답 방식을 정의하는 데 사용됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">시스템 프롬프트</Label>
            <Textarea
              id="prompt"
              placeholder="예시: You are a helpful assistant that provides clear and concise answers..."
              value={tempPrompt}
              onChange={(e) => setTempPrompt(e.target.value)}
              className="h-[200px] font-mono text-sm"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <h4 className="font-semibold mb-2">프롬프트 작성 팁:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>AI의 역할과 성격을 명확하게 정의하세요</li>
              <li>응답의 형식과 스타일을 지정할 수 있습니다</li>
              <li>특정 제약사항이나 규칙을 설정할 수 있습니다</li>
            </ul>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 