# 📋 Lilys.AI Clone - 보완 작업 계획서

## 🔍 1차 작업 검토 결과

### ✅ 완료된 기능 (기존 유지)
- JWT 기반 인증 시스템 (전화번호 로그인)
- 파일 업로드 및 처리 (PDF, DOCX, TXT)
- Bull Queue 기반 작업 처리
- WebSocket 실시간 업데이트
- PostgreSQL 데이터베이스 구조
- Docker 컨테이너화

### ❌ 핵심 미구현 기능 (CLAUDE.md 요구사항)
1. **관리자 6가지 시스템 프롬프트 관리** ⭐⭐⭐
2. **유튜브 URL 자막 처리** ⭐⭐⭐
3. **이메일 결과 전송** ⭐⭐
4. **사용자별 API 키 관리** ⭐⭐
5. **메인페이지 유튜브 입력 UI** ⭐⭐⭐

### 🐛 발견된 문제점
- YouTubeService.js가 Gemini API를 잘못 사용 (file_data로 URL 전송 불가)
- 시스템 프롬프트 관련 DB 모델 없음
- 프론트엔드 메인페이지 구현 없음
- 불필요한 파일 27개 이상 (정리 완료 ✅)

---

## 🎯 단계별 보완 계획

### 📅 Phase 1: 핵심 기능 구현 (3-4일)

#### Day 1: 데이터베이스 및 모델 확장
```sql
-- 1. SystemPrompt 테이블 생성
CREATE TABLE system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  prompt TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. UserAPIKey 테이블 생성
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Summary 테이블 확장
ALTER TABLE summaries 
ADD COLUMN system_prompt_results JSONB,
ADD COLUMN email_sent_to VARCHAR(255),
ADD COLUMN youtube_url VARCHAR(500);
```

**작업 목록:**
- [ ] Migration 파일 생성 (`backend/migrations/`)
- [ ] Sequelize 모델 생성 (SystemPrompt.js, UserAPIKey.js)
- [ ] Summary 모델 업데이트
- [ ] 기본 시스템 프롬프트 6개 시드 데이터

#### Day 2: YouTube 처리 서비스 재구현
```javascript
// backend/services/YouTubeTranscriptService.js
// youtube-transcript 라이브러리 활용
```

**작업 목록:**
- [ ] `npm install youtube-transcript` 설치
- [ ] YouTube 자막 추출 서비스 구현
- [ ] trans.json 워크플로우 적용
- [ ] 다중 프롬프트 처리 로직
- [ ] API 엔드포인트 추가 (`POST /api/summaries/youtube`)

#### Day 3: 프론트엔드 메인페이지 구현
```javascript
// frontend/src/pages/Home.js
// YouTube URL 입력 및 결과 표시
```

**작업 목록:**
- [ ] 메인페이지 컴포넌트 생성
- [ ] YouTube URL 입력 폼
- [ ] 로그인 없이 사용 가능한 플로우
- [ ] 이메일 입력 옵션
- [ ] 6개 시스템 프롬프트 결과 탭 UI

#### Day 4: 관리자 기능 구현
```javascript
// frontend/src/pages/AdminPrompts.js
// 시스템 프롬프트 관리 UI
```

**작업 목록:**
- [ ] 관리자 전용 라우트 보호
- [ ] 시스템 프롬프트 CRUD UI
- [ ] 프롬프트 순서 변경 기능
- [ ] 활성/비활성 토글

---

### 📅 Phase 2: 보조 기능 (2-3일)

#### Day 5: 이메일 서비스 통합
```javascript
// backend/services/EmailService.js
// Nodemailer 또는 SendGrid 활용
```

**작업 목록:**
- [ ] 이메일 서비스 구현
- [ ] 이메일 템플릿 생성
- [ ] 큐 기반 비동기 전송
- [ ] 이메일 전송 상태 추적

#### Day 6: 사용자 API 키 관리
**작업 목록:**
- [ ] API 키 관리 UI
- [ ] 암호화된 저장
- [ ] 사용량 추적
- [ ] API 키별 제한 설정

---

### 📅 Phase 3: 최적화 및 배포 (1-2일)

#### Day 7: 테스트 및 최적화
- [ ] 통합 테스트 작성
- [ ] 성능 최적화
- [ ] 보안 검토
- [ ] 문서 업데이트

---

## 🚀 즉시 시작 가능한 Quick Win 작업

### 오늘 바로 할 수 있는 작업들:

1. **데이터베이스 마이그레이션 생성** (30분)
```bash
cd backend
npx sequelize-cli migration:generate --name add-system-prompts
npx sequelize-cli migration:generate --name add-user-api-keys
```

2. **YouTube Transcript 라이브러리 설치** (10분)
```bash
cd backend
npm install youtube-transcript youtube-dl-exec
```

3. **기본 시스템 프롬프트 정의** (20분)
```javascript
const defaultPrompts = [
  { name: "요약", prompt: "다음 내용을 한국어로 간단명료하게 요약해주세요." },
  { name: "핵심 포인트", prompt: "핵심 포인트를 bullet point로 정리해주세요." },
  { name: "Q&A 생성", prompt: "내용을 바탕으로 주요 질문과 답변을 생성해주세요." },
  { name: "키워드 추출", prompt: "주요 키워드와 태그를 추출해주세요." },
  { name: "감정 분석", prompt: "내용의 톤과 감정을 분석해주세요." },
  { name: "액션 아이템", prompt: "실행 가능한 액션 아이템을 도출해주세요." }
];
```

4. **메인페이지 라우트 추가** (15분)
```javascript
// frontend/src/App.js에 추가
<Route path="/" element={<Home />} />
```

---

## 📊 예상 작업량 및 우선순위

| 기능 | 우선순위 | 예상 시간 | 난이도 |
|------|---------|----------|--------|
| SystemPrompt DB 모델 | 🔴 Critical | 2-3h | ⭐⭐ |
| YouTube 자막 처리 | 🔴 Critical | 4-5h | ⭐⭐⭐ |
| 메인페이지 UI | 🔴 Critical | 3-4h | ⭐⭐ |
| 다중 프롬프트 처리 | 🔴 Critical | 3-4h | ⭐⭐⭐ |
| 관리자 프롬프트 UI | 🟡 High | 2-3h | ⭐⭐ |
| 이메일 전송 | 🟡 High | 2-3h | ⭐⭐ |
| 사용자 API 키 | 🟢 Medium | 2h | ⭐ |

**총 예상 시간: 18-24시간 (3-4일)**

---

## ⚠️ 주의사항

1. **YouTube API 제한**: 무료 할당량 초과 시 대안 필요
2. **Gemini API 사용법**: file_data가 아닌 text로 자막 전송
3. **보안**: 사용자 API 키는 반드시 암호화
4. **성능**: 다중 프롬프트 처리 시 병렬 처리 고려

---

## 🎯 성공 지표

- [ ] 유튜브 URL 입력 → 6개 프롬프트 결과 표시
- [ ] 로그인 없이 메인 기능 사용 가능
- [ ] 이메일로 결과 전송 성공
- [ ] 관리자가 프롬프트 자유롭게 수정
- [ ] 사용자별 API 키로 독립 사용

---

## 📝 다음 단계

1. **즉시**: Quick Win 작업 시작 (데이터베이스 마이그레이션)
2. **오늘**: SystemPrompt 모델 구현
3. **내일**: YouTube 자막 처리 서비스 구현
4. **모레**: 프론트엔드 메인페이지 구현

---

## 💡 개선 제안

1. **캐싱 전략**: YouTube 자막은 Redis에 캐싱
2. **비용 절감**: 동일 비디오 재처리 방지
3. **UX 개선**: 처리 중 미리보기 제공
4. **모니터링**: API 사용량 대시보드 추가