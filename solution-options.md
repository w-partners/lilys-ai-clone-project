# 🚨 Cloudflare 521 에러 해결 방안

## 현재 상황
- ✅ 서버: 정상 작동 (HTTP only)
- ✅ iptables: Cloudflare IP 허용됨
- ✅ Nginx: 올바르게 구성됨
- ❌ Cloudflare: 521 에러 지속

## 📌 해결 방안 (택 1)

### 방안 1: Cloudflare 대시보드 설정 변경 (권장) ⭐
**즉시 시도해야 할 설정:**

1. **Cloudflare 대시보드 로그인**
2. **SSL/TLS → Overview**
   - Encryption mode: **"Flexible"로 변경** (가장 중요!)
3. **SSL/TLS → Edge Certificates**
   - Always Use HTTPS: **OFF**
   - Automatic HTTPS Rewrites: **OFF**
4. **Speed → Optimization**
   - Auto Minify: **OFF**
   - Rocket Loader: **OFF**
5. **Rules → Page Rules**
   - "Always Use HTTPS" 규칙 있으면 **삭제**

**대기 시간:** 5-10분

---

### 방안 2: 자체 서명 SSL 인증서 설치
서버에 HTTPS 지원을 추가하여 Cloudflare의 Full 모드와 호환되게 만들기:

```bash
# 자체 서명 인증서 생성
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx-selfsigned.key \
  -out /etc/ssl/certs/nginx-selfsigned.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=youtube.platformmakers.org"

# Nginx HTTPS 설정 추가
sudo nano /etc/nginx/sites-available/youtube.platformmakers.org
```

추가할 내용:
```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name youtube.platformmakers.org;
    
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    
    # 나머지 설정은 동일...
}
```

그 후 Cloudflare SSL/TLS를 **"Full"** 모드로 설정

---

### 방안 3: Cloudflare 프록시 비활성화 (임시)
DNS 전용 모드로 전환하여 문제 격리:

1. **Cloudflare DNS → Records**
2. A 레코드 옆 **주황색 구름 클릭 → 회색으로 변경**
3. 5분 대기
4. http://youtube.platformmakers.org 접속 테스트

---

## ⚡ 빠른 진단 명령어

```bash
# Cloudflare 연결 테스트
curl -I -H "CF-Connecting-IP: 173.245.48.1" http://34.121.104.11/

# 로그 실시간 모니터링
sudo tail -f /var/log/nginx/youtube.platformmakers.org.access.log

# Cloudflare IP 확인
nslookup youtube.platformmakers.org
```

## 🎯 권장 순서
1. **방안 1** 시도 (Cloudflare Flexible 모드)
2. 30분 후에도 안되면 **방안 3** (프록시 비활성화)로 테스트
3. 필요시 **방안 2** (SSL 인증서 설치) 구현

## 📞 추가 지원
- Cloudflare 지원: https://support.cloudflare.com
- 521 에러 문서: https://support.cloudflare.com/hc/en-us/articles/115003011431