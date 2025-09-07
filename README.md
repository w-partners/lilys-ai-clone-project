# 학습정보센터 (Learning Information Center)

유튜브 URL을 입력받아 Apify로 자막을 추출하고, AI로 다양한 관점의 학습 자료를 제공하는 원페이지 웹 애플리케이션

## 🚀 주요 기능

- ✅ YouTube 자막 추출 (Apify 활용)
- ✅ 다중 시스템 프롬프트를 통한 AI 요약 (Gemini/OpenAI)
- ✅ 실시간 처리 상태 업데이트 (WebSocket)
- ✅ 전화번호 기반 인증 시스템
- ✅ 사용자별 히스토리 관리
- ✅ 관리자 시스템 프롬프트 CRUD

## 🛠 기술 스택

- **Frontend**: React 18, Material-UI, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **Database**: PostgreSQL + Sequelize ORM
- **AI Services**: Apify, Google Gemini API, OpenAI API
- **Infrastructure**: Redis (Bull Queue), PM2, Nginx

## 📁 프로젝트 구조

```
├── frontend/       # React SPA
├── backend/        # Node.js API 서버
└── database/       # DB 마이그레이션 및 시드
```

## 🔐 환경 변수

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:password@localhost:5432/learning_center
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
APIFY_TOKEN=your-apify-token
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-key
```

## 🚀 실행 방법

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## 👤 관리자 계정

- 전화번호: 01034424668
- 비밀번호: admin1234