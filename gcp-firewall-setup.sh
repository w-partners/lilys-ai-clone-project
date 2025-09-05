#!/bin/bash

echo "GCP 방화벽 규칙 설정 스크립트"
echo "==============================="
echo ""

# 프로젝트 ID 가져오기
PROJECT_ID=$(gcloud config get-value project)
echo "프로젝트 ID: $PROJECT_ID"
echo ""

# HTTP 트래픽 허용 규칙
echo "1. HTTP 트래픽 허용 규칙 생성/업데이트..."
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server \
    --project $PROJECT_ID \
    --priority 1000 \
    2>/dev/null || \
gcloud compute firewall-rules update allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --project $PROJECT_ID

# HTTPS 트래픽 허용 규칙
echo "2. HTTPS 트래픽 허용 규칙 생성/업데이트..."
gcloud compute firewall-rules create allow-https \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --target-tags https-server \
    --project $PROJECT_ID \
    --priority 1000 \
    2>/dev/null || \
gcloud compute firewall-rules update allow-https \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --project $PROJECT_ID

# Cloudflare IP 전용 규칙
echo "3. Cloudflare IP 전용 규칙 생성/업데이트..."
CLOUDFLARE_IPS="173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22"

gcloud compute firewall-rules create allow-cloudflare \
    --allow tcp:80,tcp:443 \
    --source-ranges $CLOUDFLARE_IPS \
    --target-tags cloudflare-allowed \
    --project $PROJECT_ID \
    --priority 900 \
    2>/dev/null || \
gcloud compute firewall-rules update allow-cloudflare \
    --allow tcp:80,tcp:443 \
    --source-ranges $CLOUDFLARE_IPS \
    --project $PROJECT_ID

# 현재 인스턴스에 태그 추가
INSTANCE_NAME=$(hostname)
ZONE=$(gcloud compute instances list --filter="name=$INSTANCE_NAME" --format="value(zone)" | awk -F/ '{print $NF}')

echo "4. 인스턴스에 태그 추가..."
echo "   인스턴스: $INSTANCE_NAME"
echo "   Zone: $ZONE"

gcloud compute instances add-tags $INSTANCE_NAME \
    --tags http-server,https-server,cloudflare-allowed \
    --zone $ZONE \
    --project $PROJECT_ID

echo ""
echo "5. 방화벽 규칙 목록:"
gcloud compute firewall-rules list --filter="name~'allow-http|allow-https|allow-cloudflare'" --format="table(name,sourceRanges[].list():label=SOURCE_RANGES,allowed[].list():label=ALLOWED,targetTags.list():label=TARGET_TAGS)"

echo ""
echo "완료! 방화벽 규칙이 설정되었습니다."
echo ""
echo "테스트 명령어:"
echo "  curl -I http://34.121.104.11"
echo "  curl -I https://youtube.platformmakers.org"
