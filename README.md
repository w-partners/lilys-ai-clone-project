# Lilys AI Clone - AI 기반 콘텐츠 요약 플랫폼

Lilys.AI의 핵심 기능을 복제한 AI 기반 콘텐츠 처리 및 요약 플랫폼입니다.

## 🚀 주요 기능

- 📄 **다양한 파일 포맷 지원**: PDF, DOCX, TXT, 오디오, 비디오 파일 업로드 및 처리
- 🌐 **URL 요약**: 웹페이지 URL을 통한 콘텐츠 요약
- 📝 **텍스트 직접 입력**: 텍스트 직접 입력을 통한 요약 생성
- 🤖 **AI 제공자 선택**: OpenAI GPT와 Google Gemini 중 선택 가능
- ⚡ **실시간 업데이트**: WebSocket을 통한 실시간 처리 상태 업데이트
- 👥 **사용자 관리**: JWT 기반 인증 시스템 및 역할 기반 접근 제어

## 🛠️ 기술 스택

### Frontend
- React 18
- Material-UI (MUI)
- Socket.IO Client
- React Router v6
- React Hook Form
- Axios

### Backend
- Node.js & Express
- PostgreSQL & Sequelize ORM
- Redis & Bull Queue
- Socket.IO
- JWT Authentication
- Multer (파일 업로드)

### AI Services
- OpenAI API (GPT)
- Google Gemini API

## 📋 필수 요구사항

- Node.js 18.0.0 이상
- npm 9.0.0 이상
- PostgreSQL 13 이상
- Redis 6 이상

## 🔧 설치 및 실행

### 1. 저장소 클론
```bash
git clone [repository-url]
cd lilys-ai-clone
```

### 2. 환경 변수 설정

#### Backend (.env)
```bash
cd backend
cp .env.example .env
```

`.env` 파일을 열어 필요한 설정을 수정하세요:
- 데이터베이스 연결 정보
- JWT 시크릿 키
- AI API 키 (OpenAI, Gemini)

#### Frontend (.env)
```bash
cd ../frontend
echo "REACT_APP_API_URL=http://localhost:5000" > .env
```

### 3. 의존성 설치

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install --legacy-peer-deps
```

### 4. 데이터베이스 설정

```bash
cd backend

# 데이터베이스 생성
npm run db:create

# 마이그레이션 실행
npm run db:migrate

# 초기 계정 생성 (선택사항)
npm run accounts:init
```

### 5. 서버 실행

#### 개발 모드
```bash
# Backend (터미널 1)
cd backend
npm run dev

# Frontend (터미널 2)
cd frontend
npm start
```

#### 빠른 시작 (데이터베이스 없이)
```bash
cd backend
node quickStart.js
```

## 👤 테스트 계정

| 역할 | 휴대폰 번호 | 비밀번호 |
|------|------------|----------|
| 관리자 | 01034424668 | admin1234 |
| 운영자 | 01012345678 | admin1234 |

## 📁 프로젝트 구조

```
lilys-ai-clone/
├── backend/
│   ├── config/          # 설정 파일
│   ├── models/          # Sequelize 모델
│   ├── routes/          # API 라우트
│   ├── services/        # 비즈니스 로직
│   ├── workers/         # 백그라운드 작업
│   ├── middleware/      # Express 미들웨어
│   ├── utils/           # 유틸리티 함수
│   └── server.js        # 메인 서버 파일
├── frontend/
│   ├── src/
│   │   ├── components/  # React 컴포넌트
│   │   ├── pages/       # 페이지 컴포넌트
│   │   ├── contexts/    # React Context
│   │   ├── services/    # API 서비스
│   │   └── App.js       # 메인 앱 컴포넌트
│   └── public/          # 정적 파일
└── README.md
```

## 🔒 보안 주의사항

- 프로덕션 환경에서는 반드시 환경 변수의 기본값을 변경하세요
- JWT_SECRET은 강력한 무작위 문자열로 설정하세요
- API 키는 절대 코드에 직접 포함하지 마세요
- HTTPS를 사용하여 배포하세요

## 🚀 배포

### Nginx 설정 (Cloudflare 프록시 사용 시)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 지원
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### PM2를 사용한 프로세스 관리

```bash
# PM2 설치
npm install -g pm2

# 백엔드 실행
cd backend
pm2 start ecosystem.config.js

# 프론트엔드 빌드 및 배포
cd ../frontend
npm run build
# build 폴더를 웹 서버로 서빙
```

## 📝 API 문서

### 인증 엔드포인트
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입
- `GET /api/auth/me` - 현재 사용자 정보

### 요약 엔드포인트
- `POST /api/summaries/upload` - 파일 업로드
- `POST /api/summaries/url` - URL 요약
- `POST /api/summaries/text` - 텍스트 요약
- `GET /api/summaries/history` - 요약 히스토리
- `GET /api/summaries/:id` - 요약 상세 정보

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 👨‍💻 개발자

- Starian AI

## 🙏 감사의 말

이 프로젝트는 Lilys.AI의 기능을 학습 목적으로 복제한 것입니다.