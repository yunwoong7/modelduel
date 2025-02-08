from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict
from app.services.llm import ChatLLM
import asyncio
import logging
import uuid
from fastapi.staticfiles import StaticFiles
from app.services.model_service import ModelService
import os

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js 프론트엔드 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ChatLLM 인스턴스를 저장할 딕셔너리
chat_instances: Dict[str, ChatLLM] = {}

# 절대 경로로 static 디렉토리 위치 지정
static_path = os.path.join("static")  # 단순히 "static"으로 변경

# 디버깅을 위한 로그 추가
print(f"Static files directory: {os.path.abspath(static_path)}")

# 정적 파일 서비스 설정
app.mount("/static", StaticFiles(directory=static_path), name="static")

model_service = ModelService()

class ChatRequest(BaseModel):
    prompt: str
    image: Optional[str] = None
    model: Optional[str] = None
    chatId: Optional[str] = None
    system_prompt: Optional[str] = None  # 시스템 프롬프트 추가

@app.post("/api/chat/compare")
async def chat_compare(request: ChatRequest):
    try:
        logger.info(f"Chat request - Model: {request.model}, Prompt: {request.prompt}")
        
        # chatId가 없으면 새로 생성
        if not request.chatId:
            request.chatId = str(uuid.uuid4())

        # 기존 인스턴스가 있고 모델이 다르면 삭제
        if request.chatId in chat_instances:
            existing_llm = chat_instances[request.chatId]
            if existing_llm.model_id != (request.model or 'anthropic.claude-3-sonnet-20240229-v1:0'):
                del chat_instances[request.chatId]

        # 새로운 ChatLLM 인스턴스 생성
        if request.chatId not in chat_instances:
            model_id = request.model or 'anthropic.claude-3-sonnet-20240229-v1:0'
            chat_instances[request.chatId] = ChatLLM(
                model_id=model_id,
                system_prompt=request.system_prompt  # 시스템 프롬프트 전달
            )

        llm = chat_instances[request.chatId]

        # 빈 prompt면 초기화 요청으로 간주
        if not request.prompt:
            return StreamingResponse(
                (f'data: {{"chunk": "", "chatId": "{request.chatId}"}}\n\n' for _ in range(1)),
                media_type="text/event-stream"
            )

        async def generate():
            first_chunk = True
            async for chunk in llm.stream_chat(request.prompt, request.image):
                if first_chunk:
                    logger.info(f"Response: {chunk[:100]}...")
                    first_chunk = False
                yield f'data: {{"chunk": "{chunk}", "chatId": "{request.chatId}"}}\n\n'

        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 채팅 인스턴스 정리를 위한 엔드포인트 (선택사항)
@app.delete("/api/chat/{chat_id}")
async def delete_chat(chat_id: str):
    if chat_id in chat_instances:
        del chat_instances[chat_id]
    return {"status": "success"}

@app.post("/api/chat/{chat_id}/clear")
async def clear_chat(chat_id: str):
    if chat_id in chat_instances:
        chat_instances[chat_id].clear_message_history()
    return {"status": "success"}

@app.get("/api/models")
async def get_models():
    return model_service.get_available_models() 