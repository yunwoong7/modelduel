import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface SystemPromptInputProps {
  defaultPrompt: string;
  onPromptChange: (prompt: string) => void;
}

export function SystemPromptInput({ defaultPrompt, onPromptChange }: SystemPromptInputProps) {
  const [systemPrompt, setSystemPrompt] = useState(defaultPrompt);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setSystemPrompt(newPrompt);
    onPromptChange(newPrompt);
  };

  return (
    <div className="w-full space-y-2">
      <label className="text-sm font-medium">시스템 프롬프트</label>
      <Textarea
        value={systemPrompt}
        onChange={handlePromptChange}
        placeholder="시스템 프롬프트를 입력하세요..."
        className="min-h-[100px]"
      />
    </div>
  );
} 