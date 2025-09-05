# Cloudflare 대시보드 설정 확인 사항

## 1. DNS 설정
- **A 레코드**: youtube.platformmakers.org → 34.121.104.11
- **프록시 상태**: 활성화 (주황색 구름 아이콘)

## 2. SSL/TLS 설정
- **SSL/TLS 암호화 모드**: **Flexible** (매우 중요!)
  - Full이나 Full (strict)로 설정되어 있으면 521 에러 발생
  - Flexible: Cloudflare → Origin 서버는 HTTP 사용
  - 경로: SSL/TLS → Overview → Encryption mode

## 3. 네트워크 설정
- **Always Use HTTPS**: 비활성화 권장
- **HTTP Strict Transport Security (HSTS)**: 비활성화 확인

## 4. 페이지 규칙 (Page Rules)
- HTTPS 강제 리다이렉트 규칙이 있다면 제거

## 5. 방화벽 규칙
- Cloudflare 방화벽이 Origin 서버를 차단하지 않는지 확인

## 현재 서버 상태
- ✅ Nginx 정상 작동 (포트 80)
- ✅ 직접 IP 접속 가능 (http://34.121.104.11)
- ✅ GCP 방화벽 규칙 설정 완료
- ✅ Cloudflare IP 범위 허용
- ❌ Cloudflare 프록시 통한 접속 실패 (521 에러)

## 테스트 결과
```bash
# 직접 접속: 성공
curl -I http://34.121.104.11/
# HTTP/1.1 200 OK

# 도메인 접속: 실패 (Cloudflare 521)
curl -I https://youtube.platformmakers.org/
# Error 521: Web server is down
```

## 해결 방법
1. Cloudflare 대시보드 로그인
2. youtube.platformmakers.org 도메인 선택
3. SSL/TLS → Overview에서 **Flexible** 모드로 변경
4. 5분 대기 후 재시도