# 🚨 긴급 보안 패치 가이드

## 1. API 키 하드코딩 제거

### Step 1: 새로운 환경변수 설정
```bash
# .env 파일 수정
GEMINI_API_KEY=새로운_API_키_여기에_입력
JWT_SECRET=$(openssl rand -base64 64)
ENCRYPTION_KEY=$(openssl rand -base64 32)
DB_PASSWORD=강력한_비밀번호_20자이상
```

### Step 2: YouTubeService.js 수정
```javascript
// backend/services/YouTubeService.js
class YouTubeService {
  constructor() {
    // 하드코딩 제거 - 환경변수만 사용
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.geminiModel = 'gemini-2.0-flash';
    this.geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }
  // ...
}
```

### Step 3: initializeAccounts.js 수정
```javascript
// backend/scripts/initializeAccounts.js
const adminAccount = {
  phone: '01034424668',
  email: 'admin@lilys.ai',
  password: 'admin1234',
  name: '관리자',
  role: 'admin',
  isActive: true,
  emailVerified: true,
  geminiApiKey: process.env.ADMIN_GEMINI_KEY || null, // 환경변수 사용
  openaiApiKey: process.env.ADMIN_OPENAI_KEY || null
};
```

### Step 4: Seeder 파일 수정
```javascript
// backend/seeders/20250828235812-initial-data.js
{
  id: uuidv4(),
  phone: '01034424668',
  email: 'admin@lilys.ai',
  password: hashedPassword,
  name: '관리자',
  role: 'admin',
  isActive: true,
  emailVerified: true,
  preferences: JSON.stringify({
    language: 'ko',
    theme: 'light',
    notifications: true
  }),
  gemini_api_key: process.env.ADMIN_GEMINI_KEY || null, // 환경변수 사용
  createdAt: new Date(),
  updatedAt: new Date()
}
```

---

## 2. 암호화 키 분리

### encryption.js 수정
```javascript
// backend/utils/encryption.js
class EncryptionService {
  constructor() {
    // ENCRYPTION_KEY를 우선 사용, 없으면 에러
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    if (encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
    
    this.key = crypto.createHash('sha256').update(encryptionKey).digest();
    this.algorithm = 'aes-256-gcm';
  }
  // ...
}
```

---

## 3. CORS 설정 개선

### server.js 수정
```javascript
// backend/server.js
// CORS configuration - 환경변수 기반
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3003']; // 개발 환경 기본값

app.use(cors({
  origin: function(origin, callback) {
    // origin이 없는 경우 (같은 출처) 허용
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400 // 24시간 프리플라이트 캐시
}));
```

### .env 업데이트
```bash
# CORS 허용 출처 (콤마로 구분)
ALLOWED_ORIGINS=https://youtube.platformmakers.org,http://localhost:3003
```

---

## 4. WebSocket 인증 강화

### websocket.js 수정
```javascript
// backend/utils/websocket.js
// 인증 미들웨어 강화
this.io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    // 프로덕션에서는 인증 필수
    if (process.env.NODE_ENV === 'production' && !token) {
      return next(new Error('Authentication required'));
    }
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id || decoded.userId;
        socket.userRole = decoded.role;
      } catch (error) {
        logger.warn('Invalid WebSocket token:', error.message);
        if (process.env.NODE_ENV === 'production') {
          return next(new Error('Invalid authentication token'));
        }
        socket.userId = null;
      }
    } else {
      socket.userId = null;
    }
    
    next();
  } catch (error) {
    logger.error('WebSocket middleware error:', error);
    next(new Error('Connection failed'));
  }
});
```

---

## 5. 보안 헤더 강화

### security.js 개선
```javascript
// backend/middleware/security.js
const securityHeaders = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // 프로덕션에서는 'unsafe-inline' 제거
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", process.env.FRONTEND_URL],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    }
  });
};
```

---

## 6. 즉시 실행 스크립트

### secure-setup.sh
```bash
#!/bin/bash

echo "🔒 보안 설정 초기화 시작..."

# 1. 강력한 키 생성
JWT_SECRET=$(openssl rand -base64 64)
ENCRYPTION_KEY=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 20)

# 2. .env 백업
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# 3. .env 업데이트
cat > .env.secure << EOF
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lilys_ai_dev
DB_USERNAME=postgres
DB_PASSWORD=$DB_PASSWORD
DB_SSL=true

# Frontend URL
FRONTEND_URL=https://youtube.platformmakers.org
ALLOWED_ORIGINS=https://youtube.platformmakers.org

# Security Keys - NEVER COMMIT THESE
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AI Service API Keys - Add your keys here
OPENAI_API_KEY=
GEMINI_API_KEY=

# File Upload Settings
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
EOF

echo "✅ 보안 키 생성 완료"
echo "⚠️  다음 단계를 수행하세요:"
echo "1. Google Cloud Console에서 노출된 API 키 폐기"
echo "2. 새 API 키 생성 후 .env.secure 파일에 추가"
echo "3. PostgreSQL 비밀번호 변경: $DB_PASSWORD"
echo "4. .env.secure를 .env로 교체"
echo ""
echo "📋 생성된 키 (안전한 곳에 백업):"
echo "JWT_SECRET: $JWT_SECRET"
echo "ENCRYPTION_KEY: $ENCRYPTION_KEY"
echo "DB_PASSWORD: $DB_PASSWORD"
```

### 실행 방법
```bash
chmod +x secure-setup.sh
./secure-setup.sh
```

---

## 7. Git 이력에서 민감정보 제거

```bash
# BFG Repo-Cleaner 사용
java -jar bfg.jar --replace-text passwords.txt repo.git

# 또는 git filter-branch 사용
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# 강제 푸시 (주의!)
git push origin --force --all
git push origin --force --tags
```

---

## ⚡ 긴급 조치 순서

1. **즉시 (10분 이내)**
   - Google Cloud Console에서 노출된 API 키 폐기
   - 새 API 키 생성
   - secure-setup.sh 실행

2. **30분 이내**
   - 코드에서 하드코딩 제거
   - 환경변수 업데이트
   - 서버 재시작

3. **1시간 이내**
   - Git 이력 정리
   - 보안 패치 적용 확인
   - 로그 모니터링

4. **24시간 이내**
   - 전체 보안 테스트
   - 문서 업데이트
   - 팀 공유

---

**중요**: 이 패치를 적용한 후 반드시 전체 시스템 테스트를 수행하세요!