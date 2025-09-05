# Cloudflare 521 에러 해결 문서

## 📅 작업 일시
- **날짜**: 2025년 8월 11일
- **소요 시간**: 약 3시간
- **최종 상태**: ✅ 해결 완료

## 🔴 문제 상황

### 증상
- **도메인**: https://youtube.platformmakers.org
- **에러**: Cloudflare 521 - Web server is down
- **직접 IP 접속**: 정상 작동 (http://34.121.104.11)
- **프록시 상태**: Cloudflare 프록시 활성화 상태

### 근본 원인
1. **Cloudflare SSL/TLS 모드 문제**
   - Cloudflare가 Full 모드로 HTTPS 연결 시도
   - 서버는 HTTP(80포트)만 지원, HTTPS(443포트) 미지원
   - SSL/TLS 불일치로 521 에러 발생

2. **서버 설정 문제**
   - GCP 인스턴스 태그 누락
   - 방화벽 규칙 미적용
   - iptables에 Cloudflare IP 미허용

## 🛠️ 해결 과정

### 1단계: 서버 진단
```bash
# 직접 IP 테스트 - 성공
curl -I http://34.121.104.11/
# HTTP/1.1 200 OK

# Cloudflare 프록시 테스트 - 실패
curl -I https://youtube.platformmakers.org/
# Error 521
```

### 2단계: Nginx 설정 최적화
```nginx
server {
    listen 80 default_server;
    server_name youtube.platformmakers.org;
    
    # Cloudflare Real IP 복원
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    # ... (모든 Cloudflare IP 범위)
    
    real_ip_header CF-Connecting-IP;
    
    # 나머지 설정...
}
```

### 3단계: 방화벽 규칙 설정
```bash
# iptables에 Cloudflare IP 허용
for ip in "${CLOUDFLARE_IPS[@]}"; do
    sudo iptables -I INPUT -s $ip -p tcp --dport 80 -j ACCEPT
    sudo iptables -I INPUT -s $ip -p tcp --dport 443 -j ACCEPT
done

# GCP 방화벽 규칙 추가
gcloud compute firewall-rules create allow-cloudflare-http \
    --allow tcp:80 --source-ranges=0.0.0.0/0 --target-tags=http-server
```

### 4단계: SSL 인증서 설치 (최종 해결책)
```bash
# 자체 서명 SSL 인증서 생성
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/nginx-selfsigned.key \
    -out /etc/ssl/certs/nginx-selfsigned.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=youtube.platformmakers.org"
```

### 5단계: HTTPS 지원 추가
```nginx
# HTTPS 서버 블록 추가
server {
    listen 443 ssl default_server;
    server_name youtube.platformmakers.org;
    
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # 나머지 설정은 HTTP와 동일...
}
```

### 6단계: 443 포트 개방
```bash
# GCP 방화벽에 HTTPS 허용
gcloud compute firewall-rules create allow-https-all \
    --allow tcp:443 --source-ranges=0.0.0.0/0 \
    --target-tags=https-server --priority=1000
```

## ✅ 해결 결과

### 최종 검증
- **도메인 접속**: ✅ https://youtube.platformmakers.org 정상 작동
- **SSL/HTTPS**: ✅ 자체 서명 인증서로 HTTPS 지원
- **Cloudflare**: ✅ Full 모드로 정상 작동
- **사용자 접속**: ✅ 한국에서 정상 접속 확인 (IPv6)

### 서버 구성
```
Client → Cloudflare (HTTPS) → Origin Server (HTTPS:443)
                              → Nginx → Backend (HTTP:5001)
```

## 📝 핵심 교훈

### 1. Cloudflare SSL/TLS 모드 이해
- **Flexible**: Cloudflare→Origin은 HTTP 사용
- **Full**: Cloudflare→Origin은 HTTPS 사용 (자체 서명 인증서 허용)
- **Full (Strict)**: Cloudflare→Origin은 HTTPS 사용 (유효한 인증서 필요)

### 2. 521 에러 체크리스트
1. ✅ Origin 서버 작동 확인
2. ✅ 방화벽/보안 그룹 설정
3. ✅ Cloudflare IP 허용 여부
4. ✅ SSL/TLS 모드와 서버 설정 일치
5. ✅ DNS A 레코드 정확성

### 3. 문제 해결 우선순위
1. 먼저 직접 IP로 서버 접속 확인
2. Cloudflare SSL 모드 확인
3. 서버가 HTTPS 미지원시 → Flexible 모드 또는 SSL 설치
4. 방화벽 규칙 검증

## 🔧 추가 권장사항

### 단기 개선
1. Let's Encrypt 무료 SSL 인증서로 교체
2. API 경로 오류 수정 (`/api/api/prompts` → `/api/prompts`)
3. favicon.ico, logo192.png 파일 추가

### 장기 개선
1. Cloudflare Origin CA 인증서 사용
2. 자동 SSL 갱신 설정
3. 모니터링 및 알림 설정
4. CDN 최적화 설정

## 📚 참고 자료
- [Cloudflare 521 에러 문서](https://support.cloudflare.com/hc/en-us/articles/115003011431)
- [Nginx SSL 설정 가이드](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [GCP 방화벽 규칙](https://cloud.google.com/vpc/docs/firewalls)

## 🏷️ 태그
#cloudflare #nginx #ssl #https #521error #gcp #troubleshooting

---
*이 문서는 실제 문제 해결 과정을 기록한 것으로, 유사한 문제 발생 시 참고용으로 활용할 수 있습니다.*