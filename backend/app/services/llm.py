import os
import asyncio
import logging
import base64
import httpx
from typing import List, Dict, Optional, Generator, Union, Tuple

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage, AIMessageChunk
from langchain_aws import ChatBedrockConverse
from langchain_core.prompts import ChatPromptTemplate
import boto3

# 환경 변수 로드 및 로깅 설정
load_dotenv()
logging.basicConfig(level=logging.ERROR)

SYSTEM_PROMPT = "You are a helpful assistant that can answer questions and help with tasks."
INSTRUCTION_PROMPT = "{input}"

class ChatLLM:
    def __init__(self, model_id: str = 'anthropic.claude-3-sonnet-20240229-v1:0', system_prompt: str = None):
        self.model_id = model_id
        self.system_prompt = system_prompt
        self.instruction_prompt = INSTRUCTION_PROMPT
        self.message_history: List[Dict[str, str]] = []
        self.bedrock = boto3.client(
            service_name='bedrock-runtime',
            region_name='us-east-1'
        )

        temperature = float(os.getenv("AWS_TEMPERATURE", 0))
        max_tokens = int(os.getenv("AWS_MAX_TOKENS", 1024))
        region_name = os.getenv("AWS_REGION", "us-west-2")

        self.llm = ChatBedrockConverse(
            model=self.model_id,
            region_name=region_name,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def _build_message(self, prompt: str, image: Optional[str] = None) -> Tuple[any, str]:
        attachments = []
        history_images = []

        if image:
            try:
                # base64 데이터 URL인 경우
                if image.startswith('data:image/'):
                    # 헤더 제거하고 순수 base64 데이터만 추출
                    image_data = image.split(',')[1]
                    attachments.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_data,
                        },
                    })
                    history_images.append("Image: [Uploaded]")
                # URL인 경우
                elif image.lower().startswith(("http://", "https://")):
                    response = httpx.get(image)
                    response.raise_for_status()
                    image_data = base64.b64encode(response.content).decode("utf-8")
                    attachments.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_data,
                        },
                    })
                    history_images.append(f"Image URL: {image}")
            except Exception as e:
                logging.error(f"Error processing image: {str(e)}")

        if attachments:
            current_message = HumanMessage(
                content=[{"type": "text", "text": prompt}] + attachments
            )
            history_message = f"{prompt} [{' & '.join(history_images)}]"
            messages: List[Union[HumanMessage, AIMessage]] = []
            messages.append(HumanMessage(content=self.system_prompt))
            for msg in self.message_history:
                if msg.get("role") == "user":
                    messages.append(HumanMessage(content=msg.get("content", "")))
                elif msg.get("role") == "assistant":
                    messages.append(AIMessage(content=msg.get("content", "")))
            messages.append(current_message)
            return messages, history_message
        else:
            current_message = HumanMessage(content=prompt)
            history_message = prompt
            messages: List[Union[HumanMessage, AIMessage]] = []
            for msg in self.message_history:
                if msg.get("role") == "user":
                    messages.append(HumanMessage(content=msg.get("content", "")))
                elif msg.get("role") == "assistant":
                    messages.append(AIMessage(content=msg.get("content", "")))
            messages.append(current_message)
            prompt_template = ChatPromptTemplate(
                messages=[
                    ("system", self.system_prompt),
                    ("user", self.instruction_prompt),
                ]
            )
            formatted_message = prompt_template.invoke(input=messages)
            return formatted_message, history_message

    async def stream_chat(self, prompt: str, image: Optional[str] = None) -> Generator[str, None, None]:
        try:
            formatted_message, history_message = self._build_message(prompt, image)
            complete_response = ""
            
            async for chunk in self.llm.astream(formatted_message):
                if isinstance(chunk, AIMessageChunk):
                    for content_item in chunk.content:
                        if isinstance(content_item, str):
                            complete_response += content_item
                            yield content_item
                        elif isinstance(content_item, dict) and content_item.get("type") == "text":
                            text = content_item.get("text", "")
                            complete_response += text
                            yield text

            self.message_history.extend([
                {"role": "user", "content": history_message},
                {"role": "assistant", "content": complete_response},
            ])
        except Exception as e:
            logging.error(f"Error in stream_chat: {str(e)}")
            yield str(e) 
    
    def clear_message_history(self):
        self.message_history = []