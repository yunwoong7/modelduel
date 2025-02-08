import yaml
import os
import base64
from typing import Dict, List
from pydantic import BaseModel

class ModelCapability(BaseModel):
    text: bool = False
    image: bool = False
    code: bool = False

class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    provider_name: str
    icon_url: str
    provider_icon_url: str
    capabilities: ModelCapability

class ModelService:
    def __init__(self):
        self.icons_cache = {}  # 아이콘 캐시만 유지
        
    def _load_config(self) -> dict:
        config_path = os.path.join(os.path.dirname(__file__), '../config/models.yaml')
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def _load_icon(self, icon_name: str) -> str:
        if icon_name in self.icons_cache:
            return self.icons_cache[icon_name]
            
        icon_path = os.path.join("static", "icons", "providers", icon_name)
        try:
            with open(icon_path, "rb") as f:
                icon_data = f.read()
                base64_icon = base64.b64encode(icon_data).decode("utf-8")
                data_url = f"data:image/svg+xml;base64,{base64_icon}"
                self.icons_cache[icon_name] = data_url
                return data_url
        except Exception as e:
            print(f"Error loading icon {icon_name}: {e}")
            return ""
    
    def get_available_models(self) -> List[ModelInfo]:
        # 매 요청마다 config를 새로 로드
        models_config = self._load_config()
        models = []
        
        for provider_id, provider_data in models_config['providers'].items():
            # Base64로 인코딩된 아이콘 데이터
            icon_data = self._load_icon(provider_data['icon'])
            
            for model_id, model_data in provider_data['models'].items():
                capabilities = ModelCapability(
                    text=True,
                    image='image' in model_data.get('capabilities', []),
                    code='code' in model_data.get('capabilities', [])
                )
                
                models.append(ModelInfo(
                    id=model_data['id'],
                    name=model_data['name'],
                    provider=provider_id,
                    provider_name=provider_data['name'],
                    icon_url=icon_data,
                    provider_icon_url=icon_data,
                    capabilities=capabilities
                ))
        
        return models 