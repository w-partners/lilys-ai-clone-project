# Lilys AI Clone Project - Claude Instructions

이 파일은 이 저장소에서 작업할 때 Claude Code (claude.ai/code)에게 지침을 제공합니다.
답변은 무조건 한국어로만 대답해. 문의를 영어로 해도, 답변은 무조건 한국어로해.

## 강제 준수 사항
- 새센 시작시 다음의 MCP를 작동 유지
- playwright-stealth - @pvinis/playwright-stealth-mcp-server
- Context7 - @upstash/context7-mcp
- sequential-thinking - @modelcontextprotocol/server-sequential-thinking
- shrimp-task-manager - https://github.com/modelcontextprotocol/servers/tree/main/src/shrimp-task-manager
- **작업 완료 후 사용자에게 완료 보고전 검증 필수**
- **검증은 무조건 playwright-stealth를 사용하여 사용자의 환경(https;//youtube.platformmakers.org)에서 각 페이지를 뷰로 시각적으로 작동유무 확인**
- **검증후 작동을 안할경우 Context7을 이용하여 재검토 후 검증 실시**


## 도메인 설정
**youtube.platformmakers.org points to 34.121.104.11 and has its traffic proxied through Cloudflare.**

## 도메인설정 세부 지침
# ✅ Ubuntu(GCP VM) + Nginx 리버스 프록시 설정 예시 (Cloudflare 프록시 사용 중 ERR_TOO_MANY_REDIRECTS 방지)

server {
    listen 80;
    server_name youtube.pltformmakers.org;

    # HTTP 리디렉션은 명시적으로 사용하지 않음
    # (Cloudflare가 SSL 종료 후 HTTP로 origin에 전달하므로 무한 리다이렉트 방지)

    location / {
        proxy_pass http://127.0.0.1:포트번호;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme; 
        # → 필수: 백엔드 애플리케이션이 실제 HTTPS 요청인지 인식 가능

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}

# 백엔드(예: Node.js, Express, WordPress 등)에서는 X-Forwarded-Proto 값을 활용해
# HTTPS 여부를 판단하도록 설정
# 예: WordPress wp-config.php 내부에:
#   if ($_SERVER['HTTP_X_FORWARDED_PROTO'] == 'https') $_SERVER['HTTPS']='on';
# (이런 설정을 통해 리다이렉트 루프 방지) :contentReference[oaicite:1]{index=1}

# 🔎 디버깅 팁
# - Cloudflare 프록시(proxy) 상태에서 curl -I -L http://youtube.pltformmakers.org 과
#   https://youtube.pltformmakers.org 테스트로 리디렉션 흐름 확인
# - Cloudflare Proxy Off (DNS Only) 상태로 잠시 설정해 보고,
#   서버가 HTTPS 리디렉트 없이 작동하는지 검증

# 서브에이전트 호출 
- **사용자가 `별아`라고 호출하면 star-Orchestrator subagent를 즉시 작동시킬 것**

## 프로젝트 개요

Lilys.AI Clone은 AI 기반 콘텐츠 처리 플랫폼으로, 파일 업로드(PDF, DOCX, 오디오, 비디오) 및 URL 콘텐츠 추출을 통해 Gemini또는  OpenAI API를 사용한 AI 요약 기능을 제공합니다.
데이터 베이스는 절대로 하드코딩하지 않고, progreSQL에 실제 데이터를 사용.
로그인은 전화번호로하며, 히스토리를 볼때만 로그인을 요청. 기본은 api만 넣으면 이용가능.
로그인 후 사용하는 사용자의 api와 히스토리를 기록.
관리자는 6가지 종류의 시스템프롬프트를 넣을 수 있으며 사용자는 결과에서 탭으로 각 시스템 프롬프트의 결과를 볼수 있음.
메인페이지는 유튜브 url을 입력하는 공간이 있어. 로그인 없이 이용가능.결과나올때까지 이동 안됨.
로그인을 하면, 유튜브 링크 뿐만 아니라 웹페이지, 문서 파일도 넣어서 요약 정리 할 수 있어.
또는 이메일을 입력받아, 결과를 이메일로 전송할수 있도록 하고 세션을 이탈해도 됨.

## 서비스 구현 참고자료.
.claude/trans.json 의 파일을 살펴보면 유튜브 자막 분석에 대한 워크플로우를 참고할 수 있음.
이것은 n8n워크플로우로 이 시스템을 우리 사이트에서 구현하고자함.

## 관리자 계정
- 01034424668 / admin1234

## 관리자 api키
- gemini ; AIzaSyBhXb6o6nxY2Neo38qZzUsC7ReQPic1kRY
- openai ;

## 주요 목표
1. 다양한 형식의 파일(PDF, DOCX, 오디오, 비디오 등)을 업로드하고 AI로 요약
2. Google Gemini와 OpenAI GPT를 활용한 지능형 콘텐츠 분석
3. 실시간 처리 상태 업데이트 (WebSocket)
4. 사용자별 요약 히스토리 관리

## 모든 계정은 휴대폰 번호를 기본으로 
- **관리자계정** : 01034424668 / admin1234
- **운영자계정** : 01012345678 / admin1234

## 도메인연결 필수 지침
# ✅ Ubuntu(GCP VM) + Nginx 리버스 프록시 설정 예시 (Cloudflare 프록시 사용 중 ERR_TOO_MANY_REDIRECTS 방지)

server {
    listen 80;
    server_name *.example.org;

    # HTTP 리디렉션은 명시적으로 사용하지 않음
    # (Cloudflare가 SSL 종료 후 HTTP로 origin에 전달하므로 무한 리다이렉트 방지)

    location / {
        proxy_pass http://127.0.0.1:포트번호;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme; 
        # → 필수: 백엔드 애플리케이션이 실제 HTTPS 요청인지 인식 가능

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}

# 백엔드(예: Node.js, Express, WordPress 등)에서는 X-Forwarded-Proto 값을 활용해
# HTTPS 여부를 판단하도록 설정
# 예: WordPress wp-config.php 내부에:
#   if ($_SERVER['HTTP_X_FORWARDED_PROTO'] == 'https') $_SERVER['HTTPS']='on';
# (이런 설정을 통해 리다이렉트 루프 방지) :contentReference[oaicite:1]{index=1}

# 🔎 디버깅 팁
# - Cloudflare 프록시(proxy) 상태에서 curl -I -L http://*.example.org 과
#   https://*.example.org 테스트로 리디렉션 흐름 확인
# - Cloudflare Proxy Off (DNS Only) 상태로 잠시 설정해 보고,
#   서버가 HTTPS 리디렉트 없이 작동하는지 검증


## 현재 상태
- **백엔드**: 90% 완성 (AI 처리, 큐 시스템, WebSocket 구현됨)
- **프론트엔드**: 10% 완성 (구조만 존재, UI 컴포넌트 미구현)
- **데이터베이스**: 0% (PostgreSQL 스키마 미구현)
- **인증**: 50% (미들웨어만 구현, API 엔드포인트 미구현)

## 기술 스택
- **Frontend**: React 18, Material-UI, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO, Bull Queue
- **Database**: PostgreSQL + Sequelize ORM
- **AI Services**: Google Gemini API, OpenAI API
- **Infrastructure**: Google Cloud Storage, GCP Compute Engine

## 개발 우선순위
1. **긴급**: PostgreSQL 데이터베이스 스키마 및 모델 구현
2. **긴급**: 인증 API 엔드포인트 (/api/auth/*)
3. **높음**: 프론트엔드 UI 컴포넌트 구현
4. **중간**: Google Cloud Storage 통합
5. **낮음**: 배포 설정 및 테스트

## 코딩 규칙
- TypeScript는 사용하지 않음 (순수 JavaScript)
- 함수형 컴포넌트와 React Hooks 사용
- Material-UI 디자인 시스템 준수
- RESTful API 설계 원칙 따르기
- 에러 처리는 try-catch와 적절한 HTTP 상태 코드 사용

## 파일 구조
```
/
├── frontend/          # React 애플리케이션
│   ├── src/
│   │   ├── components/    # 재사용 가능한 컴포넌트
│   │   ├── pages/        # 페이지 컴포넌트
│   │   ├── contexts/     # React Context
│   │   └── services/     # API 통신
├── backend/           # Node.js API 서버
│   ├── models/       # Sequelize 모델 (생성 필요)
│   ├── routes/       # API 라우트
│   ├── services/     # 비즈니스 로직
│   └── workers/      # 백그라운드 작업
└── database/         # DB 스키마 및 마이그레이션 (생성 필요)
```

## 중요 참고사항
- 모든 API 응답은 일관된 형식 사용: `{ success: boolean, data?: any, error?: string }`
- 파일 업로드 제한: 50MB
- JWT 토큰 만료 시간: 7일
- WebSocket 이벤트 네이밍: `job:progress`, `job:complete`, `job:error`

## 현재 작업 중점
Phase 1: 데이터베이스 레이어 구축
- PostgreSQL 스키마 설계
- User, Summary, Job, File 모델 생성
- 인증 API 엔드포인트 구현