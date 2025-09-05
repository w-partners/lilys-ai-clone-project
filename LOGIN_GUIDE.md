# Lilys AI Clone 로그인 가이드

## 계정 정보
### 관리자 계정
- 전화번호: 01034424668
- 비밀번호: admin1234

### 운영자 계정
- 전화번호: 01012345678
- 비밀번호: admin1234

## 로그인 문제 해결

### "Login Failed" 오류가 발생하는 경우:

1. **브라우저 캐시 삭제**
   - Chrome: 설정 → 개인정보 및 보안 → 인터넷 사용 기록 삭제
   - Safari: 개발자 도구 → 캐시 비우기
   - 또는 시크릿/프라이빗 모드 사용

2. **모바일에서 접속 시**
   - 전화번호 입력 시 자동으로 숫자 키패드가 나타납니다
   - 01034424668 형식으로 입력 (하이픈 없이)

3. **계속 문제가 발생하는 경우**
   - 서버 재시작이 필요할 수 있습니다
   - 백엔드 로그 확인: `/tmp/backend-new.log`

## 접속 URL
https://youtube.platformmakers.org

## 기술 지원
문제가 지속되면 다음 명령으로 계정을 재설정할 수 있습니다:
```bash
cd /home/starian/lilys-ai-clone/backend
node scripts/resetAccounts.js
```