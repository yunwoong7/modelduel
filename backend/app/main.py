from fastapi import FastAPI, HTTPException, Path
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
import json  # json 모듈 추가

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

class ClearRequest(BaseModel):
    chat_id: str

class DeleteRequest(BaseModel):
    chat_id: str

@app.post("/api/clear")
async def clear_chat(request: ClearRequest):
    logger.info(f"Received clear request with body: {request}")  # 요청 바디 로깅
    logger.info(f"Available instances before clear: {list(chat_instances.keys())}")  # 현재 인스턴스 목록
    
    if request.chat_id in chat_instances:
        chat_instances[request.chat_id].clear_message_history()
        logger.info(f"Successfully cleared chat: {request.chat_id}")  # 성공 로그
        return {"status": "success"}
    else:
        logger.error(f"Chat instance not found: {request.chat_id}")  # 에러 로그
        raise HTTPException(status_code=404, detail=f"Chat instance {request.chat_id} not found")

@app.post("/api/delete")  # DELETE 대신 POST 사용
async def delete_chat(request: DeleteRequest):
    if request.chat_id in chat_instances:
        del chat_instances[request.chat_id]
    return {"status": "success"}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        logger.info(f"Chat request - Model: {request.model}, ChatId: {request.chatId}")
        logger.info(f"Current chat instances: {list(chat_instances.keys())}")
        print(request.chatId)
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
                system_prompt=request.system_prompt
            )
            logger.info(f"Created new chat instance with ID: {request.chatId}")  # 로그 추가

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
                # 줄바꿈이 포함된 청크를 JSON으로 안전하게 직렬화
                response_data = {
                    "chunk": chunk,
                    "chatId": request.chatId
                }
                
                if first_chunk:
                    logger.info(f"Response: {chunk[:100]}...")
                    first_chunk = False
                    
                # json.dumps()를 사용하여 안전하게 JSON 문자열로 변환
                yield f'data: {json.dumps(response_data)}\n\n'

        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models")
async def get_models():
    return model_service.get_available_models() 