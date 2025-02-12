export interface ModelInfo {
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