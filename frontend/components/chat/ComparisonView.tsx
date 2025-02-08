"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, User, Send, ImagePlus, X, Loader2, Plus, Trash2, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ModelSelectDialog } from "@/components/chat/ModelSelectDialog";
import { SystemPromptModal } from "@/components/chat/SystemPromptModal";
import { SparklesCore } from "@/components/ui/sparkles";

interface Message {
  id: number;
  content: string;
  modelId: string;
  role: 'user' | 'assistant';
  image?: string;
}

interface ModelChat {
  id: string;
  modelId: string;
  messages: Message[];
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  provider_name: string;
  icon_url: string;
  provider_icon_url: string;
  capabilities: {
    text: boolean;
    image: boolean;
    code: boolean;
  };
}


export function ComparisonView() {
  const [chats, setChats] = useState<ModelChat[]>([]);
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [pendingModelChange, setPendingModelChange] = useState<{chatId: string, newModelId: string} | null>(null);
  const [showClearAlert, setShowClearAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [pendingClear, setPendingClear] = useState<{chatId: string} | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{chatId: string} | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [modelSelectLoading, setModelSelectLoading] = useState(false);

  // 각 채팅창의 스크롤 ref를 관리하기 위한 Map
  const scrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // 특정 채팅창의 스크롤을 맨 아래로 이동
  const scrollToBottom = (chatId: string) => {
    const element = scrollRefs.current.get(chatId);
    if (element) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // 메시지가 추가되거나 업데이트될 때마다 해당 채팅창의 스크롤을 아래로 이동
  useEffect(() => {
    chats.forEach(chat => {
      scrollToBottom(chat.id);
    });
  }, [chats]);

  // 채팅창의 스크롤 이벤트 핸들러
  const handleScroll = (chatId: string, event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollButton(distanceFromBottom > 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      setPrompt('');  // 엔터 키 입력 시 바로 초기화
      handleSubmit(e);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      content: prompt.trim(),
      modelId: 'user',
      role: 'user' as const,
      image: image
    };

    // 현재 입력값을 임시 저장
    const currentPrompt = prompt;
    const currentImage = image;

    // 입력값 즉시 초기화
    setPrompt('');
    setImage(null);  // 이미지 미리보기 즉시 제거

    setChats(prev => prev.map(chat => ({
      ...chat,
      messages: [...chat.messages, userMessage]
    })));

    setLoading(true);
    try {
      await Promise.all(chats.map(async chat => {
        const response = await fetch('/api/chat/compare', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({
            prompt: currentPrompt,  // 저장된 값 사용
            image: currentImage,    // 저장된 값 사용
            model: chat.modelId,
            chatId: chat.id,
            system_prompt: systemPrompt  // 시스템 프롬프트 전달
          }),
        });

        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let currentMessage = '';

        setChats(prev => prev.map(c => 
          c.id === chat.id 
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: Date.now(),
                    content: '',
                    modelId: chat.modelId,
                    role: 'assistant'
                  }
                ]
              }
            : c
        ));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const newChunk = data.data || data.chunk || '';
                if (newChunk && !currentMessage.endsWith(newChunk)) {
                  currentMessage += newChunk;
                  
                  setChats(prev => prev.map(c => 
                    c.id === chat.id 
                      ? {
                          ...c,
                          messages: c.messages.map((m, i) => 
                            i === c.messages.length - 1 
                              ? { ...m, content: currentMessage }
                              : m
                          )
                        }
                      : c
                  ));
                }
              } catch (e) {
                // 에러 로깅 제거
              }
            }
          }
        }
      }));
    } catch (error) {
      // 에러 로깅 제거
    } finally {
      setLoading(false);
    }
  };

  // 모델 변경 핸들러 수정
  const handleModelChange = async (chatId: string, newModelId: string) => {
    // 현재 채팅창의 메시지 수 확인
    const chat = chats.find(c => c.id === chatId);
    const hasMessages = chat?.messages.length > 0;

    if (hasMessages) {
      // 대화 내용이 있을 때만 확인 알림 표시
      setPendingModelChange({ chatId, newModelId });
      setShowAlert(true);
    } else {
      // 대화 내용이 없으면 바로 모델 변경
      try {
        await fetch(`/api/chat/${chatId}`, {
          method: 'DELETE'
        });

        const response = await fetch('/api/chat/compare', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: '',
            model: newModelId,
            chatId: chatId,
            system_prompt: systemPrompt  // 시스템 프롬프트 전달
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to initialize new chat instance');
        }

        setChats(prev => prev.map(c => 
          c.id === chatId 
            ? { 
                ...c, 
                modelId: newModelId,
                messages: []
              } 
            : c
        ));
      } catch (error) {
        console.error('Failed to change model:', error);
        alert('모델 변경 중 오류가 발생했습니다.');
      }
    }
  };

  // 실제 모델 변경 처리
  const handleConfirmModelChange = async () => {
    if (!pendingModelChange) return;
    const { chatId, newModelId } = pendingModelChange;

    try {
      await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE'
      });

      const response = await fetch('/api/chat/compare', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: '',
          model: newModelId,
          chatId: chatId,
          system_prompt: systemPrompt  // 시스템 프롬프트 전달
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize new chat instance');
      }

      setChats(prev => prev.map(c => 
        c.id === chatId 
          ? { 
              ...c, 
              modelId: newModelId,
              messages: []
            } 
          : c
      ));
    } catch (error) {
      console.error('Failed to change model:', error);
      alert('모델 변경 중 오류가 발생했습니다.');
    } finally {
      setShowAlert(false);
      setPendingModelChange(null);
    }
  };

  // 초기화 처리 함수
  const handleClearChat = async (chatId: string) => {
    try {
      // 백엔드에 초기화 요청
      await fetch(`/api/chat/${chatId}/clear`, {
        method: 'POST'
      });

      // UI 초기화
      setChats(prev => prev.map(c => 
        c.id === chatId 
          ? { ...c, messages: [] }
          : c
      ));
    } catch (error) {
      console.error('Failed to clear chat:', error);
      alert('대화 내용 초기화 중 오류가 발생했습니다.');
    } finally {
      setShowClearAlert(false);
      setPendingClear(null);
    }
  };

  // 삭제 처리 함수
  const handleDeleteChat = async (chatId: string) => {
    try {
      // 백엔드에 채팅 인스턴스 삭제 요청
      await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE'
      });

      // UI에서 채팅창 제거
      setChats(prev => prev.filter(c => c.id !== chatId));

      // ModelSelectDialog의 선택 상태도 업데이트
      const removedChat = chats.find(c => c.id === chatId);
      if (removedChat) {
        setShowModelSelect(false); // 다이얼로그가 열려있다면 닫기
      }
    } catch (error) {
      console.error('Failed to delete chat instance:', error);
      alert('채팅창 삭제 중 오류가 발생했습니다.');
    } finally {
      setShowDeleteAlert(false);
      setPendingDelete(null);
    }
  };

  // 모델 목록 가져오기 함수
  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models');
      const modelData = await response.json();
      setModels(modelData);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  // 모델 선택 다이얼로그 열 때 모델 목록 새로 가져오기
  const handleOpenModelSelect = async () => {
    try {
      setModelSelectLoading(true);
      await fetchModels();  // 모델 목록 새로고침
      setShowModelSelect(true);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setModelSelectLoading(false);
    }
  };

  // 초기 로딩
  useEffect(() => {
    const initializeChat = async () => {
      await fetchModels();
      // 모델 정보를 가져온 후 첫 번째 채팅창 생성
      if (models.length > 0) {
        setChats([{
          id: '1',
          modelId: models[0].id,
          messages: []
        }]);
      }
    };
    
    initializeChat();
  }, []);

  const handleModelSelect = (selectedIds: string[]) => {
    // 새로운 채팅 목록 생성
    const newChats = selectedIds.map(modelId => {
      // 기존 채팅 찾기
      const existingChat = chats.find(chat => chat.modelId === modelId);
      if (existingChat) return existingChat;
      
      // 새 채팅 생성
      return {
        id: String(Date.now() + Math.random()),
        modelId: modelId,
        messages: []
      };
    });

    setChats(newChats);
  };

  // 스크롤 버튼 클릭 핸들러 추가
  const handleScrollToBottom = (chatId: string) => {
    const element = scrollRefs.current.get(chatId);
    if (element) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // 모델 선택 버튼 클릭 핸들러 수정
  const handleInitialModelSelect = () => {
    // 먼저 빈 채팅 인터페이스로 전환
    setChats([{
      id: String(Date.now()),
      modelId: models[0].id,  // 임시로 첫 번째 모델 설정
      messages: []
    }]);
    
    // 약간의 지연 후 모델 선택 다이얼로그 표시
    setTimeout(() => {
      setShowModelSelect(true);
    }, 100);
  };

  // 모델이 없거나 채팅이 없을 때 보여줄 화면
  if (models.length === 0 || chats.length === 0) {
    return (
      <div className="h-screen relative w-full bg-black flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full absolute inset-0 h-screen">
          <SparklesCore
            id="tsparticlesfullpage"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={100}
            className="w-full h-full"
            particleColor="#FFFFFF"
            speed={1}
          />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 relative z-20">
          <div className="text-white/50 text-sm font-light tracking-wider mb-4">
            Created by <span className="font-medium text-white/80">yunwoong</span>
          </div>
          <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            ModelDuel
          </h1>
          <p className="text-neutral-300 cursor-default text-center">
            {models.length === 0 ? "모델을 불러오는 중입니다..." : "모델을 선택해주세요"}
          </p>
          {models.length > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleInitialModelSelect}
              disabled={modelSelectLoading}
              className="mt-8 bg-transparent border-2 border-white/20 hover:border-white/40 
                text-white/80 hover:text-white hover:bg-white/5 
                transition-all duration-300 ease-out transform hover:scale-105
                px-8 py-6 text-lg font-medium tracking-wide
                shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]
                backdrop-blur-sm"
            >
              {modelSelectLoading ? (
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
              ) : (
                <Plus className="mr-3 h-6 w-6" />
              )}
              {modelSelectLoading ? "로딩 중..." : "모델 선택하기"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-background">
        <div className="flex justify-between items-center p-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-white">
              ModelDuel
            </h1>
            <div className="h-6 w-px bg-border" /> {/* 구분선 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {chats.length}개의 모델 비교 중
              </span>
              {chats.length < 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModelSelect(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  모델 추가
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SystemPromptModal
              systemPrompt={systemPrompt}
              onSystemPromptChange={setSystemPrompt}
            />
          </div>
        </div>
        {/* 채팅 영역 */}
        <div className="flex flex-1 overflow-hidden gap-4 p-4">
          {models.length > 0 && chats.map((chat) => (
            <div 
              key={chat.id} 
              className="flex-1 flex flex-col bg-card rounded-xl border shadow-lg overflow-hidden"
            >
              {/* 각 채팅창의 헤더 */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <img 
                    src={models.find(m => m.id === chat.modelId)?.icon_url} 
                    alt=""
                    className="w-6 h-6"
                  />
                  <div>
                    <div className="font-semibold">
                      {models.find(m => m.id === chat.modelId)?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {models.find(m => m.id === chat.modelId)?.provider_name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 기능 아이콘 표시 */}
                  <div className="flex gap-1.5 mr-3">
                    {models.find(m => m.id === chat.modelId)?.capabilities.text && (
                      <div className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                        Text
                      </div>
                    )}
                    {models.find(m => m.id === chat.modelId)?.capabilities.image && (
                      <div className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        Image
                      </div>
                    )}
                  </div>
                  {/* 기존 버튼들 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setPendingClear({ chatId: chat.id });
                      setShowClearAlert(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {chats.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setPendingDelete({ chatId: chat.id });
                        setShowDeleteAlert(true);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 채팅 메시지 영역 */}
              <div 
                ref={el => el && scrollRefs.current.set(chat.id, el)}
                onScroll={(e) => handleScroll(chat.id, e)}
                className="flex-1 overflow-y-auto px-4 py-6 bg-background/50"
              >
                <div className="space-y-6 max-w-3xl mx-auto">
                  {chat.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex items-start gap-3",
                        message.role === 'user' && "flex-row-reverse"
                      )}
                    >
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border bg-background",
                        message.role === 'user' 
                          ? "bg-primary text-primary-foreground"
                          : "bg-background"
                      )}>
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <img 
                            src={models.find(m => m.id === message.modelId)?.icon_url}
                            alt=""
                            className="h-5 w-5 rounded-full"
                          />
                        )}
                      </div>
                      <div className={cn(
                        "flex flex-col gap-2 rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                        message.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 ring-1 ring-primary/10",
                        "max-w-[85%]"
                      )}>
                        {message.image && (
                          <div className="mb-2">
                            <img 
                              src={message.image} 
                              alt="Uploaded" 
                              className="max-w-full h-auto rounded-lg"
                            />
                          </div>
                        )}
                        <div className="break-words">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              // 코드 블록 스타일링
                              code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline ? (
                                  <pre className="p-4 bg-muted rounded-lg overflow-x-auto">
                                    <code className={cn(
                                      "relative font-mono text-sm",
                                      className
                                    )} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                ) : (
                                  <code className="px-1 py-0.5 font-mono text-sm bg-muted rounded" {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              // 링크 스타일링
                              a: ({ node, ...props }) => (
                                <a
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary underline hover:no-underline"
                                  {...props}
                                />
                              ),
                              // 기타 마크다운 요소 스타일링
                              p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
                              li: ({ children }) => <li className="mb-2 last:mb-0">{children}</li>,
                              h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-primary/50 pl-4 italic">
                                  {children}
                                </blockquote>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      응답 생성 중...
                    </div>
                  )}
                </div>
              </div>

              {/* 스크롤 버튼 추가 */}
              {showScrollButton && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleScrollToBottom(chat.id)}
                  className="absolute bottom-4 right-4 h-8 w-8 rounded-full opacity-70 hover:opacity-100"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* 입력 영역 */}
        {models.length > 0 && (
          <div className="border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
            <form onSubmit={handleSubmit} className="flex gap-2">
              {/* 이미지 업로드 버튼을 모든 활성화된 모델이 이미지 기능을 지원할 때만 표시 */}
              {chats.every(chat => 
                models.find(m => m.id === chat.modelId)?.capabilities.image
              ) && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="h-[60px] w-[60px] rounded-xl"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </Button>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </>
              )}
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요... (Enter를 눌러 전송)"
                className="min-h-[60px] resize-none rounded-xl"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={loading || !prompt.trim()} 
                className="h-[60px] w-[60px] rounded-xl"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
            {image && (
              <div className="mt-2 relative inline-block">
                <img src={image} alt="Uploaded" className="h-20 rounded-lg" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80"
                  onClick={() => setImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>모델 변경</AlertDialogTitle>
            <AlertDialogDescription>
              모델을 변경하면 현재 대화 내용이 모두 삭제됩니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowAlert(false);
              setPendingModelChange(null);
            }}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmModelChange}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 초기화 확인 AlertDialog */}
      <AlertDialog open={showClearAlert} onOpenChange={setShowClearAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>대화 내용 초기화</AlertDialogTitle>
            <AlertDialogDescription>
              현재 대화 내용이 모두 삭제됩니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowClearAlert(false);
              setPendingClear(null);
            }}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => pendingClear && handleClearChat(pendingClear.chatId)}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 삭제 확인 AlertDialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>채팅창 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              현재 대화 내용이 모두 삭제되고 채팅창이 제거됩니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteAlert(false);
              setPendingDelete(null);
            }}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => pendingDelete && handleDeleteChat(pendingDelete.chatId)}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 모델 선택 다이얼로그 */}
      <ModelSelectDialog
        open={showModelSelect}
        onOpenChange={(open) => {
          setShowModelSelect(open);
          if (!open) {
            setModelSelectLoading(false); // 모달이 닫힐 때 로딩 상태도 초기화
          }
        }}
        models={models}
        selectedModels={chats.map(chat => chat.modelId)}
        onSelect={handleModelSelect}
        maxSelect={4}
      />
    </>
  );
} 