#!/bin/bash

# Nginx 설치 및 설정 스크립트
# 실행: sudo bash setup-nginx.sh

echo "=== Nginx 설치 및 설정 스크립트 ==="

# 1. Nginx 설치
echo "1. Nginx 설치 중..."
apt-get update
apt-get install -y nginx

# 2. 방화벽 설정
echo "2. 방화벽 설정 중..."
ufw allow 'Nginx Full'
ufw allow 5001
ufw allow 3000

# 3. Nginx 설정 파일 복사
echo "3. Nginx 설정 파일 복사 중..."
cp nginx-config.conf /etc/nginx/sites-available/youtube.platformmakers.org
ln -sf /etc/nginx/sites-available/youtube.platformmakers.org /etc/nginx/sites-enabled/

# 4. 기본 사이트 비활성화
echo "4. 기본 사이트 비활성화..."
rm -f /etc/nginx/sites-enabled/default

# 5. Nginx 설정 테스트
echo "5. Nginx 설정 테스트..."
nginx -t

# 6. Nginx 재시작
echo "6. Nginx 재시작..."
systemctl restart nginx
systemctl enable nginx

# 7. 상태 확인
echo "7. Nginx 상태 확인..."
systemctl status nginx --no-pager

echo ""
echo "=== 설정 완료 ==="
echo "다음 명령어로 서비스를 시작하세요:"
echo ""
echo "# 백엔드 시작 (터미널 1)"
echo "cd backend && npm run dev"
echo ""
echo "# 프론트엔드 시작 (터미널 2)"
echo "cd frontend && npm start"
echo ""
echo "# PM2로 백그라운드 실행 (선택사항)"
echo "pm2 start backend/server.js --name lilys-backend"
echo "pm2 start frontend/node_modules/react-scripts/scripts/start.js --name lilys-frontend"
echo ""
echo "도메인 접속: https://youtube.platformmakers.org"