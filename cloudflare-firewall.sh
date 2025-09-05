#!/bin/bash

# Cloudflare IP 범위 허용 스크립트
echo "GCP 방화벽에 Cloudflare IP 범위 추가"

# Cloudflare IPv4 범위
CLOUDFLARE_IPS="173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22"

# 방화벽 규칙 생성 명령어 (수동 실행 필요)
echo "다음 명령어를 실행하세요:"
echo ""
echo "gcloud compute firewall-rules create allow-cloudflare-http \\"
echo "  --allow tcp:80,tcp:443 \\"
echo "  --source-ranges=$CLOUDFLARE_IPS \\"
echo "  --target-tags=http-server,https-server \\"
echo "  --priority=100 \\"
echo "  --description='Allow Cloudflare IPs to access HTTP/HTTPS'"
echo ""
echo "또는 GCP Console에서 직접 설정:"
echo "1. VPC network > Firewall 이동"
echo "2. Create Firewall Rule 클릭"
echo "3. Name: allow-cloudflare-http"
echo "4. Direction: Ingress"
echo "5. Priority: 100"
echo "6. Source IP ranges: 위의 CLOUDFLARE_IPS 값 복사"
echo "7. Protocols and ports: tcp:80, tcp:443"
echo "8. Target tags: http-server, https-server"