<h2 align="center">
ModelDuel
</h2>
<div align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js"/>
  <img src="https://img.shields.io/badge/React-18-blue?logo=react"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript"/>
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss"/>
  <img src="https://img.shields.io/badge/Python-3.10-3776AB?logo=python"/>
  <img src="https://img.shields.io/badge/LangChain-0.3-3178C6"/>
</div>


AI 모델들의 성능을 실시간으로 비교할 수 있는 웹 애플리케이션입니다. AWS Bedrock에서 제공하는 Foundation Model들을 기반으로 작동합니다.

## 지원 모델
- Anthropic Claude 3 (Sonnet, Haiku)
- Meta Llama 3
- Amazon (Titan, Nova)
- 기타 AWS Bedrock에서 제공하는 모델들

## 주요 기능

- 최대 4개의 AI 모델 동시 비교
- 실시간 스트리밍 응답
- 이미지 분석 지원 (모델 지원 시)
- 시스템 프롬프트 커스터마이징
- 다크모드 지원

## 스크린샷

### 텍스트 기반 대화
<div align="center">
<img src="https://github.com/user-attachments/assets/244af247-ad68-4d9d-83e7-4ff3c46a830b" width="70%">
</div>

### 이미지 분석
<div align="center">
<img src="https://github.com/user-attachments/assets/a00ae4ed-5249-4be1-80d0-b5ff7fea78ea" width="70%">
</div>

## 기술 스택

### Frontend
- Next.js 14
- TypeScript
- TailwindCSS
- ShadcnUI
- Framer Motion

### Backend
- Python
- FastAPI
- AWS Bedrock

## ⚠️ 중요: 실행 방법

### 1. 백엔드 설정 및 실행

1. 백엔드 의존성 설치
```bash
cd backend
pip install -r requirements.txt
```

2. 환경 변수 설정
```bash
# Windows
copy backend\.env.template backend\.env

# Mac/Linux
cp backend/.env.template backend/.env
```

3. `.env` 파일에서 AWS 인증 정보 설정
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-west-2
AWS_TEMPERATURE=0
AWS_MAX_TOKENS=1024
```

4. 백엔드 서버 실행 (새 터미널에서)
```bash
cd backend
uvicorn app.main:app --reload
```

### 2. 프론트엔드 설정 및 실행

1. 프론트엔드 의존성 설치
```bash
cd frontend
npm install
npm install framer-motion @tsparticles/slim @tsparticles/react @tsparticles/engine
```

2. 프론트엔드 개발 서버 실행 (새 터미널에서)
```bash
cd frontend
npm run dev
```

3. 브라우저에서 http://localhost:3000 접속

## 모델 관리

모든 AI 모델 정보는 `backend/app/config/models.yaml` 파일에서 관리됩니다.
새로운 모델을 추가하려면 이 파일을 수정하세요:

```yaml
providers:
  anthropic:
    name: Anthropic
    icon: anthropic.svg
    models:
      claude-3-sonnet:
        id: anthropic.claude-3-sonnet-20240229-v1:0
        name: Claude 3 Sonnet
        capabilities:
          - text
          - image
```

## 프로젝트 구조

```
.
├── frontend/          # Next.js 프론트엔드
│   ├── components/
│   │   └── chat/     # 채팅 관련 컴포넌트
│   └── ...
├── backend/
│   ├── app/
│   │   ├── main.py   # FastAPI 진입점
│   │   ├── services/ # 비즈니스 로직
│   │   └── config/
│   │       └── models.yaml  # 모델 설정 파일
│   └── static/       # 정적 파일 (아이콘 등)
└── ...
```
