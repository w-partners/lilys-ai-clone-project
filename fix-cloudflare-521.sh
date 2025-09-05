#!/bin/bash

# Cloudflare IP 범위 허용 스크립트
echo "Cloudflare IP 범위를 방화벽에 추가합니다..."

# Cloudflare IPv4 범위
CLOUDFLARE_IPS=(
    "173.245.48.0/20"
    "103.21.244.0/22"
    "103.22.200.0/22"
    "103.31.4.0/22"
    "141.101.64.0/18"
    "108.162.192.0/18"
    "190.93.240.0/20"
    "188.114.96.0/20"
    "197.234.240.0/22"
    "198.41.128.0/17"
    "162.158.0.0/15"
    "104.16.0.0/13"
    "104.24.0.0/14"
    "172.64.0.0/13"
    "131.0.72.0/22"
)

# UFW를 사용하여 Cloudflare IP 허용
for ip in "${CLOUDFLARE_IPS[@]}"; do
    echo "허용: $ip"
    sudo ufw allow from $ip to any port 80 proto tcp
    sudo ufw allow from $ip to any port 443 proto tcp
done

echo "방화벽 규칙 추가 완료!"
echo ""
echo "현재 UFW 상태:"
sudo ufw status numbered | head -20

echo ""
echo "참고: GCP 콘솔에서도 방화벽 규칙을 확인해주세요."
echo "VPC 네트워크 > 방화벽 규칙에서 다음을 확인:"
echo "1. HTTP (포트 80) 허용"
echo "2. HTTPS (포트 443) 허용"
echo "3. 소스 IP: 0.0.0.0/0 또는 Cloudflare IP 범위"