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
**youtube.platformmakers.org points to 35.224.178.10 and has its traffic proxied through Cloudflare.**

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

## 🚨 데이터베이스 관련 문제 해결 가이드

**증상**: API에서 500 에러, "column does not exist" 오류
**원인**: 데이터베이스가 삭제되었거나 테이블 구조가 불일치

**해결 방법**:
1. 데이터베이스 존재 확인: `sudo -u postgres psql -l | grep lilys_ai_dev`
2. 데이터베이스 생성 (없을 경우): `sudo -u postgres psql -c "CREATE DATABASE lilys_ai_dev;"`
3. 테이블 존재 확인: `sudo -u postgres psql -d lilys_ai_dev -c "\dt"`
4. 누락된 컬럼 추가:
   ```sql
   ALTER TABLE summaries ADD COLUMN IF NOT EXISTS jobId uuid REFERENCES jobs(id);
   ALTER TABLE files ADD COLUMN IF NOT EXISTS summaryId uuid REFERENCES summaries(id) ON DELETE CASCADE;
   ```
5. 컬럼명 대소문자 문제 해결:
   ```sql
   ALTER TABLE summaries RENAME COLUMN jobid TO "jobId";
   ```
6. 백엔드 재시작: `pm2 restart 0`

**검증**: playwright-stealth로 https://youtube.platformmakers.org 접속하여 대시보드, 히스토리, 시스템 프롬프트 페이지 정상 작동 확인

# 🚨 Cloudflare 521/525 오류 해결 가이드
# **문제**: Cloudflare에서 521 (Web server is down) 또는 525 (SSL handshake failed) 오류 발생
# 
# **원인과 해결순서**:
# 1️⃣ **521 오류**: 서버 연결 불가
#    - nginx 80포트 확인: `ss -tuln | grep :80`
#    - nginx 설정 확인: `sudo nginx -t`
#    - 방화벽 확인: `sudo ufw status`
#    - nginx 재로드: `sudo systemctl reload nginx`
#
# 2️⃣ **525 오류**: SSL 인증서 문제  
#    - SSL 인증서 존재 확인: `sudo certbot certificates`
#    - 도메인용 인증서 생성: `sudo certbot certonly --nginx -d youtube.platformmakers.org`
#    - nginx에 SSL 설정 추가:
#      ```
#      listen 443 ssl;
#      ssl_certificate /etc/letsencrypt/live/youtube.platformmakers.org/fullchain.pem;
#      ssl_certificate_key /etc/letsencrypt/live/youtube.platformmakers.org/privkey.pem;
#      ```
#    - nginx 재로드: `sudo systemctl reload nginx`
#
# 3️⃣ **기존 설정 복원**: 
#    - 백업 파일 확인: `ls -la /etc/nginx/sites-available/ | grep youtube`
#    - 상세 설정 백업 복원: `sudo cp /etc/nginx/sites-available/youtube.platformmakers.org.conf.bak`
#    - Cloudflare Real IP 설정과 WebSocket 최적화가 포함된 설정 사용
#
# 4️⃣ **검증**: playwright로 https://youtube.platformmakers.org 테스트 필수

# 서브에이전트 호출 
- **사용자가 `별아`라고 호출하면 star-Orchestrator subagent를 즉시 작동시킬 것**

## 프로젝트 개요

원페이지 웹사이트로 유튜브url을 입력받아 apify를 이용해서 자막을 추출하여 시스템 프롬프트에 맞춰 자막을 추출하고 프롬프트에 따라 추가적으로 Gemini api key를 이용하여 내용을 추가된 시스템 프롬프트에 따라 결과물을 보여줍니다. 입력된 프롬프트의 숫자만큼 결과에 탭으로 추가되어 나타난다.  
사이드에 히스토리가 나타나고 헤더에 유튜브 링크 입력 공간, 시스템 프롬프트를 추가, 수정, 삭제할 수 있는 버튼을 만들고, 사이드 메뉴 맨 위에 로그인 기능이 구현되는 원페이지 구조. 


## 관리자 계정
- 01034424668 / admin1234

## 관리자 api키
- apify ; [API 키는 .env 파일에서 관리]
- gemini ; [API 키는 .env 파일에서 관리]
- openai ; [API 키는 .env 파일에서 관리]

## 주요 목표
1. 유튜브 링크를 업로드하고 특정 시스템 프롬프트를 이용하여 프롬프트 내용에 맞춰 스크립트 추출과 요약
2. Google Gemin와 OpenAI GPT를 활용한 지능형 콘텐츠 분석
3. 실시간 처리 상태 업데이트 (WebSocket)
4. 사용자별 히스토리 관리.
5. url입력후 페이지지 이탈해도 히스토리에 기록이 남음.

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
