# HTTPS 설정 가이드

## 현재 상태
- Nginx 설정에 HTTPS가 이미 구성되어 있음 (`/nginx/sites-available/lilys-ai`)
- SSL 인증서는 Let's Encrypt 사용 예정
- HTTP → HTTPS 리디렉션 설정 완료

## HTTPS 활성화 방법

### 1. SSL 인증서 발급 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt update
sudo apt install certbot python3-certbot-nginx

# SSL 인증서 발급 (도메인 소유권 확인 필요)
sudo certbot --nginx -d lilys.ai -d www.lilys.ai

# 또는 수동으로 인증서만 발급
sudo certbot certonly --webroot -w /var/www/certbot -d lilys.ai -d www.lilys.ai
```

### 2. Nginx 설정 활성화

```bash
# sites-available의 설정을 sites-enabled로 심볼릭 링크
sudo ln -s /etc/nginx/sites-available/lilys-ai /etc/nginx/sites-enabled/

# 기본 nginx 설정 비활성화 (필요시)
sudo rm /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 3. 프론트엔드 환경변수 설정

```bash
# frontend/.env 파일 생성 또는 수정
echo "REACT_APP_API_URL=https://lilys.ai/api" > frontend/.env

# 개발 환경용
echo "REACT_APP_API_URL=https://localhost/api" > frontend/.env.development

# 프로덕션 환경용
echo "REACT_APP_API_URL=https://lilys.ai/api" > frontend/.env.production
```

### 4. Docker Compose에서 HTTPS 사용

```yaml
# docker-compose.yml 수정
services:
  nginx:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/sites-available/lilys-ai:/etc/nginx/sites-available/lilys-ai
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot
```

### 5. 보안 확인사항

1. **SSL 인증서 자동 갱신 설정**
   ```bash
   # Cron job 추가
   sudo crontab -e
   # 매일 새벽 2시에 인증서 갱신 시도
   0 2 * * * /usr/bin/certbot renew --quiet
   ```

2. **방화벽 설정**
   ```bash
   # HTTPS 포트 열기
   sudo ufw allow 443/tcp
   sudo ufw allow 80/tcp  # Let's Encrypt 검증용
   ```

3. **보안 헤더 확인**
   - HSTS (Strict-Transport-Security) ✓
   - X-Frame-Options ✓
   - X-Content-Type-Options ✓
   - X-XSS-Protection ✓
   - Content-Security-Policy ✓

### 6. 테스트

1. **SSL 인증서 확인**
   ```bash
   openssl s_client -connect lilys.ai:443 -servername lilys.ai
   ```

2. **HTTPS 리디렉션 확인**
   ```bash
   curl -I http://lilys.ai
   # Location: https://lilys.ai/ 확인
   ```

3. **SSL Labs 테스트**
   - https://www.ssllabs.com/ssltest/ 에서 도메인 테스트

## 주의사항

1. **개발 환경**
   - 로컬 개발시 자체 서명 인증서 사용 가능
   - Chrome에서 `chrome://flags/#allow-insecure-localhost` 활성화

2. **WebSocket 연결**
   - HTTPS 사용시 WebSocket도 WSS로 자동 전환됨
   - Socket.IO가 자동으로 처리함

3. **Mixed Content 방지**
   - 모든 리소스(이미지, 스크립트 등)도 HTTPS로 로드
   - API 호출도 모두 HTTPS 사용

## 문제 해결

### Nginx 에러 로그 확인
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/lilys-ai.error.log
```

### Let's Encrypt 인증서 문제
```bash
# 인증서 상태 확인
sudo certbot certificates

# 수동 갱신
sudo certbot renew --dry-run
```

### WebSocket 연결 실패
- 브라우저 개발자 도구에서 Network → WS 탭 확인
- `wss://` 프로토콜 사용 확인# 🚨 Lilys AI Clone - 긴급 수정 가이드

## 문제점 및 해결 방법

### 1. 로그인 페이지 문제
**문제**: "Email or Phone"으로 표시됨
**원인**: 구버전 코드가 배포됨

**해결**:
```bash
# Frontend 재빌드 및 배포
cd frontend
npm run build
# 빌드된 파일을 웹서버로 복사
```

### 2. WebSocket 연결 실패
**문제**: WSS 연결 실패 (HTTPS 환경)
**원인**: WebSocket이 HTTP URL로 연결 시도

**해결**: WebSocketContext.js가 이미 수정됨. 재빌드 필요

### 3. 계정 로그인 문제
**문제**: 휴대폰 번호로 로그인 불가
**원인**: 기본 계정이 생성되지 않음

**해결**:
```bash
cd backend
npm run accounts:reset
```

## 즉시 실행 명령어

### 옵션 1: 자동 수정 스크립트
```bash
cd /path/to/project
./scripts/deploy-fixes.sh
```

### 옵션 2: 수동 수정
```bash
# 1. Frontend 재빌드
cd frontend
npm run build

# 2. Backend 계정 초기화
cd ../backend
npm run accounts:reset

# 3. 서비스 재시작
pm2 restart all
sudo systemctl reload nginx
```

## 확인 사항

✅ 로그인 페이지에 "Phone Number" 표시
✅ 휴대폰 번호: 01034424668 / 비밀번호: root1234
✅ WebSocket 연결 성공 (개발자 도구 콘솔 확인)
✅ 대시보드에 사용자 이름 표시

## 테스트 계정

| 역할 | 휴대폰 번호 | 비밀번호 |
|------|------------|----------|
| 관리자 | 01034424668 | root1234 |
| 운영자 | 01012345678 | admin1234 |# Deployment Guide for Lilys AI Clone

This guide covers deployment options for the Lilys AI Clone application.

## 📋 Prerequisites

### Required Services
- Node.js 18+ and npm
- PostgreSQL 13+
- Redis 6+
- Google Cloud Platform account (for GCP deployment)
- Domain name (for production deployment)

### Required API Keys
- OpenAI API key
- Google Gemini API key
- Google Cloud Storage credentials (optional)

## 🚀 Deployment Options

### 1. Local Development (Docker)
```bash
# Quick start with Docker Compose
docker-compose up -d

# Access at http://localhost:3000
```

### 2. VPS/Cloud VM Deployment
```bash
# Use PM2 for process management
./scripts/pm2-setup.sh production

# Setup Nginx
sudo ./scripts/nginx-setup.sh
```

### 3. Google Cloud Platform (Recommended)
```bash
# Configure GCP credentials
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Run deployment script
./scripts/gcp-deploy.sh
```

### 4. Terraform Deployment (Infrastructure as Code)
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## 🏗️ GCP Deployment (Detailed)

### Step 1: Prerequisites
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### Step 2: Configure Environment
```bash
# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export GCP_ZONE="us-central1-a"
```

### Step 3: Run Deployment Script
```bash
# Make script executable
chmod +x scripts/gcp-deploy.sh

# Run deployment
./scripts/gcp-deploy.sh
```

The script will:
- Create a Compute Engine instance
- Set up firewall rules
- Install required software
- Deploy the application
- Configure PM2 and Nginx

### Step 4: Post-Deployment Configuration
```bash
# SSH into the instance
gcloud compute ssh lilys-ai-instance --zone=us-central1-a

# Update environment variables
sudo nano /var/www/lilys-ai/backend/.env

# Restart services
pm2 restart all
```

## 🔧 Manual Deployment Steps

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y nodejs npm nginx postgresql redis-server certbot python3-certbot-nginx

# Install PM2
sudo npm install -g pm2
```

### 2. Database Setup
```bash
# Create PostgreSQL user and database
sudo -u postgres psql
CREATE USER lilys_user WITH PASSWORD 'secure_password';
CREATE DATABASE lilys_ai_db OWNER lilys_user;
\q

# Run migrations
cd backend
npm run db:migrate
```

### 3. Application Deployment
```bash
# Clone repository
git clone https://github.com/your-repo/lilys-ai-clone.git
cd lilys-ai-clone

# Install dependencies
cd backend && npm install --production
cd ../frontend && npm install && npm run build

# Setup environment
cp backend/.env.example backend/.env
# Edit .env with your configuration

# Start with PM2
pm2 start pm2.ecosystem.config.js --env production
pm2 save
```

### 4. Nginx Configuration
```bash
# Copy Nginx config
sudo cp nginx/sites-available/lilys-ai /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/lilys-ai /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL Setup
```bash
# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🐳 Docker Production Deployment

### Build Images
```bash
# Build production images
docker build -t lilys-backend ./backend
docker build -t lilys-frontend ./frontend
```

### Docker Compose Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    image: lilys-backend:latest
    restart: always
    env_file: .env
    networks:
      - lilys-network
    
  frontend:
    image: lilys-frontend:latest
    restart: always
    depends_on:
      - backend
    networks:
      - lilys-network

networks:
  lilys-network:
    driver: bridge
```

## 🔄 CI/CD with GitHub Actions

### Setup Secrets
Add these secrets to your GitHub repository:
- `GCP_PROJECT_ID`
- `GCP_SA_KEY` (Service account JSON)
- `SLACK_WEBHOOK_URL` (optional)

### Deployment Workflow
The `.github/workflows/deploy.yml` file automates:
1. Running tests
2. Building frontend
3. Creating deployment package
4. Deploying to GCP instance
5. Health checks
6. Slack notifications

## 📊 Monitoring

### PM2 Monitoring
```bash
# View process status
pm2 status

# Monitor in real-time
pm2 monit

# View logs
pm2 logs

# Custom monitoring script
./scripts/pm2-monitor.sh --watch
```

### Application Metrics
```bash
# Check API health
curl http://your-domain.com/health

# View Nginx status
sudo systemctl status nginx

# Database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### Log Management
```bash
# Application logs
tail -f /var/www/lilys-ai/logs/*.log

# PM2 logs
pm2 logs --lines 100

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🔒 Security Checklist

### Before Deployment
- [ ] Change all default passwords
- [ ] Update JWT secret key
- [ ] Secure API keys in environment variables
- [ ] Enable firewall rules
- [ ] Set up SSL certificates
- [ ] Configure CORS properly
- [ ] Review Nginx security headers

### After Deployment
- [ ] Test SSL configuration
- [ ] Verify firewall rules
- [ ] Check file permissions
- [ ] Monitor error logs
- [ ] Set up backup strategy
- [ ] Configure monitoring alerts

## 🔧 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check PM2 logs
pm2 logs lilys-backend --err

# Verify environment variables
pm2 env lilys-backend

# Check port availability
sudo netstat -tlnp | grep 5000
```

#### Database Connection Failed
```bash
# Test PostgreSQL connection
psql -U lilys_user -h localhost -d lilys_ai_db

# Check PostgreSQL status
sudo systemctl status postgresql
```

#### Nginx 502 Bad Gateway
```bash
# Check if backend is running
pm2 status

# Test backend directly
curl http://localhost:5000/health

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Updates and Rollbacks

### Updating Application
```bash
# Pull latest changes
git pull origin main

# Install dependencies
cd backend && npm install --production
cd ../frontend && npm install && npm run build

# Restart services
pm2 reload all
sudo nginx -s reload
```

### Rollback Strategy
```bash
# Create backup before deployment
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/lilys-ai

# Rollback to previous version
cd /var/www/lilys-ai
git checkout previous-version-tag
pm2 reload all
```

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [GCP Compute Engine Guide](https://cloud.google.com/compute/docs)
- [Docker Production Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Checklist](https://github.com/goldbergyoni/nodebestpractices)# Lilys AI Clone - Docker Development Guide

## 🚀 Quick Start

1. **Prerequisites**
   - Docker Desktop installed and running
   - Node.js 18+ (for local development)
   - Make command available (optional but recommended)

2. **Environment Setup**
   ```bash
   # Copy environment files
   cp .env.docker .env
   cp backend/.env.example backend/.env
   
   # Update .env with your API keys
   # - OPENAI_API_KEY
   # - GOOGLE_GEMINI_API_KEY
   # - GCS_BUCKET_NAME (optional)
   ```

3. **Start Development Environment**
   ```bash
   # Using Make (recommended)
   make setup    # First time setup
   make dev      # Start all services
   
   # Or using docker-compose directly
   docker-compose up -d
   docker-compose logs -f
   ```

4. **Access Services**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health
   - PgAdmin: http://localhost:5050 (run `make tools`)
   - Bull Board: http://localhost:3001 (run `make monitoring`)

## 🛠 Development Commands

### Using Make (Recommended)
```bash
make help         # Show all available commands
make dev          # Start development environment
make logs         # View all logs
make shell        # Access backend shell
make test         # Run tests
make down         # Stop all services
make clean        # Remove volumes and containers
```

### Using Docker Compose
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f [service_name]

# Stop services
docker-compose down

# Rebuild after changes
docker-compose build [service_name]
docker-compose up -d
```

## 📁 Project Structure

```
/
├── docker-compose.yml       # Main compose configuration
├── docker-compose.dev.yml   # Development overrides
├── .env.docker             # Environment template
├── Makefile                # Development commands
├── backend/
│   ├── Dockerfile          # Backend container
│   └── ...
├── frontend/
│   ├── Dockerfile          # Frontend container
│   └── nginx.conf          # Production nginx config
├── nginx/
│   └── nginx.dev.conf      # Development nginx config
└── database/
    ├── init.sql            # Database schema
    └── dev-seeds.sql       # Development data
```

## 🔧 Configuration

### Environment Variables
Key variables in `.env`:
- `DB_*`: PostgreSQL configuration
- `JWT_SECRET`: Authentication secret
- `OPENAI_API_KEY`: OpenAI API key (required)
- `GOOGLE_GEMINI_API_KEY`: Google Gemini API key (required)
- `GCS_*`: Google Cloud Storage (optional)
- `EMAIL_*`: Email service configuration

### Service Ports
- Frontend: 3000
- Backend: 5000
- PostgreSQL: 5432
- Redis: 6379
- PgAdmin: 5050
- Bull Board: 3001

## 🧪 Testing

```bash
# Run all tests
make test

# Run specific service tests
make test-backend
make test-frontend

# Run tests in watch mode
make test-watch
```

## 🔍 Debugging

### View Logs
```bash
# All services
make logs

# Specific service
make logs-backend
make logs-frontend
```

### Access Container Shell
```bash
# Backend shell
make shell-backend

# PostgreSQL shell
make shell-postgres

# Redis CLI
make shell-redis
```

### Database Operations
```bash
# Run migrations
make db-migrate

# Seed development data
make db-seed

# Reset database
make db-reset
```

## 🚢 Production-like Environment

```bash
# Start with nginx proxy
make prod

# This runs services behind nginx on port 80
# Access via: http://localhost
```

## 🛑 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find and kill process using port
   lsof -ti:3000 | xargs kill -9
   ```

2. **Permission denied errors**
   ```bash
   # Fix volume permissions
   sudo chown -R $(id -u):$(id -g) .
   ```

3. **Database connection failed**
   ```bash
   # Check if postgres is healthy
   docker-compose ps
   docker-compose logs postgres
   ```

4. **Frontend hot reload not working**
   - Ensure `stdin_open: true` and `tty: true` in docker-compose
   - Try restarting the frontend container

### Reset Everything
```bash
make clean-all    # Remove all containers and images
make setup        # Fresh setup
make dev          # Start again
```

## 📊 Monitoring

### Bull Queue Dashboard
```bash
make monitoring
# Access at http://localhost:3001
```

### Database Management
```bash
make tools
# Access PgAdmin at http://localhost:5050
# Login: admin@lilys.ai / admin
```

### Health Checks
```bash
make health
# Or manually: curl http://localhost:5000/health
```

## 🔒 Security Notes

- Change default passwords in production
- Use proper JWT secret (not the default)
- Secure your API keys
- Enable HTTPS in production
- Review nginx security headers

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Make Command Reference](https://www.gnu.org/software/make/manual/make.html)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)# Nginx Configuration Guide

This guide covers Nginx setup for the Lilys AI Clone project in both development and production environments.

## 📁 Configuration Files

### Production Configuration
- `nginx/nginx.conf` - Main Nginx configuration with optimizations
- `nginx/sites-available/lilys-ai` - Site-specific configuration with SSL

### Development Configuration
- `nginx/nginx.dev.conf` - Development configuration for Docker
- `nginx/nginx-local.conf` - Local testing configuration

## 🚀 Production Setup

### 1. Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 2. Run Setup Script
```bash
sudo ./scripts/nginx-setup.sh
```

The script will:
- Install Nginx if not present
- Configure site settings
- Set up SSL with Let's Encrypt (optional)
- Create deployment scripts
- Configure firewall rules

### 3. Manual Setup (Alternative)
```bash
# Copy configuration files
sudo cp nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp nginx/sites-available/lilys-ai /etc/nginx/sites-available/

# Enable site
sudo ln -s /etc/nginx/sites-available/lilys-ai /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🔒 SSL Configuration

### Automatic SSL with Certbot
```bash
# Replace with your domain
sudo certbot --nginx -d lilys.ai -d www.lilys.ai
```

### Manual SSL Setup
1. Obtain certificates
2. Update site configuration with SSL paths
3. Enable HTTP/2 and configure SSL protocols

### SSL Best Practices
```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;

# Enable OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;

# HSTS
add_header Strict-Transport-Security "max-age=63072000" always;
```

## ⚡ Performance Optimizations

### 1. Gzip Compression
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript 
           application/json application/javascript;
```

### 2. Static Asset Caching
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. Connection Optimization
```nginx
keepalive_timeout 65;
keepalive_requests 100;

# Upstream keepalive
upstream backend {
    server localhost:5000;
    keepalive 32;
}
```

### 4. Buffer Tuning
```nginx
client_body_buffer_size 128k;
client_max_body_size 50M;
client_header_buffer_size 1k;
large_client_header_buffers 4 16k;
```

## 🛡️ Security Configuration

### 1. Security Headers
```nginx
# X-Frame-Options
add_header X-Frame-Options "SAMEORIGIN" always;

# X-Content-Type-Options
add_header X-Content-Type-Options "nosniff" always;

# X-XSS-Protection
add_header X-XSS-Protection "1; mode=block" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline'";
```

### 2. Rate Limiting
```nginx
# Define zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=1r/s;

# Apply limits
location /api {
    limit_req zone=api_limit burst=20 nodelay;
}

location /api/upload {
    limit_req zone=upload_limit burst=5 nodelay;
}
```

### 3. Connection Limits
```nginx
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

server {
    limit_conn conn_limit 50;
}
```

## 🔄 Load Balancing

### PM2 Cluster Integration
```nginx
upstream backend {
    least_conn;
    
    server localhost:5000 max_fails=3 fail_timeout=30s;
    server localhost:5001 max_fails=3 fail_timeout=30s;
    server localhost:5002 max_fails=3 fail_timeout=30s;
    server localhost:5003 max_fails=3 fail_timeout=30s;
    
    keepalive 32;
}
```

### WebSocket Load Balancing
```nginx
upstream websocket {
    ip_hash;  # Sticky sessions for WebSocket
    
    server localhost:5000;
    server localhost:5001;
    server localhost:5002;
    server localhost:5003;
}
```

## 🐳 Docker Development

### Using Docker Compose
```bash
# Start with Nginx proxy
docker-compose --profile production-like up -d

# Access application
# http://localhost (via Nginx)
```

### Local Testing
```bash
# Test production Nginx config locally
docker run -d \
  -p 80:80 \
  -v $(pwd)/nginx/nginx-local.conf:/etc/nginx/nginx.conf \
  -v $(pwd)/frontend/build:/usr/share/nginx/html \
  nginx:alpine
```

## 📊 Monitoring

### Enable Nginx Status
```nginx
location /nginx_status {
    stub_status on;
    access_log off;
    allow 127.0.0.1;
    deny all;
}
```

### View Status
```bash
# Connection statistics
curl http://localhost/nginx_status

# Monitor logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Log Analysis
```bash
# Top requested URLs
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head

# Response time analysis
awk '{print $NF}' /var/log/nginx/access.log | sort -n | awk '{
    count[NR] = $1;
    sum += $1
  }
  END {
    print "Average:", sum/NR;
    print "Median:", count[int(NR/2)];
    print "90th percentile:", count[int(NR*0.9)]
  }'
```

## 🚨 Troubleshooting

### Common Issues

#### 1. 502 Bad Gateway
- Check if backend is running: `pm2 status`
- Verify upstream servers: `curl http://localhost:5000/health`
- Check Nginx error logs: `tail -f /var/log/nginx/error.log`

#### 2. 413 Request Entity Too Large
- Increase `client_max_body_size` in Nginx config
- Default is set to 50M for file uploads

#### 3. WebSocket Connection Failed
- Ensure proper headers are set:
  ```nginx
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  ```

#### 4. SSL Certificate Issues
- Check certificate validity: `sudo certbot certificates`
- Renew certificates: `sudo certbot renew`
- Test SSL: `openssl s_client -connect lilys.ai:443`

### Debug Commands
```bash
# Test configuration
nginx -t

# Reload without downtime
nginx -s reload

# View process info
ps aux | grep nginx

# Check listening ports
netstat -tlnp | grep nginx
```

## 🔧 Maintenance

### Log Rotation
```bash
# Configure logrotate
sudo nano /etc/logrotate.d/nginx

# Add configuration
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
```

### Performance Tuning
```bash
# Optimize worker processes
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}
```

## 📚 Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Nginx Security Headers](https://securityheaders.com/)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [Nginx Amplify](https://www.nginx.com/products/nginx-amplify/) - Monitoring solution# PM2 Production Process Manager

PM2 is a production process manager for Node.js applications with built-in load balancer.

## 🚀 Quick Start

### Installation
```bash
# Install PM2 globally
npm install -g pm2

# Install PM2 log rotate module
pm2 install pm2-logrotate
```

### Setup Scripts
```bash
# Development environment
./scripts/pm2-setup.sh development

# Production environment
./scripts/pm2-setup.sh production
```

## 📋 Configuration Files

### Production Configuration
`pm2.ecosystem.config.js` - Production configuration with:
- Cluster mode for backend API (max CPU cores)
- 2 worker instances for queue processing
- Static server for frontend
- Health checks and auto-restart
- Graceful shutdown handling

### Development Configuration
`pm2.development.config.js` - Development configuration with:
- Fork mode with file watching
- Node inspector for debugging
- Separate logs for each service
- No auto-restart on crash

## 🛠 Common Commands

### Process Management
```bash
# Start all processes
pm2 start pm2.ecosystem.config.js

# Start specific app
pm2 start lilys-backend

# Stop all processes
pm2 stop all

# Restart all processes
pm2 restart all

# Reload with zero-downtime
pm2 reload all

# Delete all processes
pm2 delete all
```

### Monitoring
```bash
# List all processes
pm2 list
pm2 status

# Real-time monitoring
pm2 monit

# Custom monitoring script
./scripts/pm2-monitor.sh
./scripts/pm2-monitor.sh --watch  # Continuous monitoring

# View logs
pm2 logs
pm2 logs lilys-backend
pm2 logs --lines 100
```

### Cluster Management
```bash
# Scale backend to 4 instances
pm2 scale lilys-backend 4

# Scale down to 2 instances
pm2 scale lilys-backend 2
```

## 📊 PM2 Features Used

### 1. Cluster Mode
- Automatic load balancing
- Zero-downtime reloads
- Auto-scaling based on CPU cores

### 2. Process Monitoring
- CPU and memory usage tracking
- Automatic restarts on failure
- Health check integration

### 3. Log Management
- Centralized logging
- Log rotation with compression
- Timestamped entries

### 4. Graceful Shutdown
```javascript
// Implemented in backend/server.js
process.on('SIGINT', gracefulShutdown);
```

### 5. Environment Management
```bash
# Start with specific environment
pm2 start ecosystem.config.js --env production
pm2 start ecosystem.config.js --env staging
```

## 🔧 Advanced Configuration

### Log Rotation Setup
```bash
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
```

### Startup Script
```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save

# Resurrect saved processes
pm2 resurrect
```

### Monitoring Dashboard
```bash
# Install PM2 web dashboard
pm2 install pm2-web

# Access at http://localhost:9615
```

## 🏗 Production Deployment

### 1. Server Setup
```bash
# On production server
git clone <repository>
cd lilys-ai-clone
npm install --production
cd frontend && npm install && npm run build
```

### 2. Environment Configuration
```bash
# Copy and edit production environment
cp .env.example .env
nano .env
```

### 3. Start with PM2
```bash
# Start all services
pm2 start pm2.ecosystem.config.js --env production

# Save configuration
pm2 save

# Setup auto-start on reboot
pm2 startup
```

### 4. Nginx Integration
```nginx
upstream backend {
    server localhost:5000;
    server localhost:5001;
    server localhost:5002;
    server localhost:5003;
}

server {
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

## 📈 Performance Tuning

### Memory Limits
```javascript
// In ecosystem.config.js
max_memory_restart: '1G'  // Restart if memory exceeds 1GB
```

### Node Arguments
```javascript
// For production
node_args: '--max-old-space-size=4096'

// For development with debugging
node_args: '--inspect=0.0.0.0:9229'
```

### Cluster Optimization
```javascript
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster',
```

## 🚨 Troubleshooting

### Process Keeps Restarting
```bash
# Check error logs
pm2 logs lilys-backend --err

# Check process details
pm2 describe lilys-backend

# Flush logs if too large
pm2 flush
```

### High Memory Usage
```bash
# Monitor memory in real-time
pm2 monit

# Force garbage collection
pm2 restart lilys-backend --update-env
```

### Port Already in Use
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>
```

## 🔒 Security Considerations

1. **Run as non-root user**
   ```bash
   sudo useradd -m -s /bin/bash nodeapp
   sudo su - nodeapp
   ```

2. **Limit process privileges**
   ```javascript
   // In ecosystem.config.js
   uid: 'nodeapp',
   gid: 'nodeapp'
   ```

3. **Secure environment variables**
   ```bash
   chmod 600 .env
   ```

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [PM2 Graceful Shutdown](https://pm2.keymetrics.io/docs/usage/signals-clean-restart/)
- [PM2 Log Management](https://pm2.keymetrics.io/docs/usage/log-management/)# 🚨 긴급 수정 - 실제 작동하는 방법

## 현재 상황
- 배포된 코드는 **다른 프로젝트**입니다 (Lilys AI Clone이 아님)
- API는 작동하지만 프론트엔드가 우리 코드가 아님

## 즉시 수정 방법

### 방법 1: 현재 배포된 시스템에 맞춰 로그인
현재 시스템은 이미 작동 중이며, 다음 계정으로 로그인 가능:
- 휴대폰: **01034424668**
- 비밀번호: **root1234**

### 방법 2: Lilys AI Clone 코드 배포

```bash
# 1. 프로젝트 확인
cd /path/to/lilys-ai-clone

# 2. Frontend 빌드
cd frontend
npm install
npm run build

# 3. Backend 실행
cd ../backend
npm install
npm run accounts:reset  # 계정 생성
npm start

# 4. Nginx 설정 (HTTPS용)
sudo cp nginx/sites-available/lilys-ai /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/lilys-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 문제 진단

### 현재 배포된 시스템
- 다른 프로젝트가 실행 중
- user.name이 아닌 user.username 사용
- WebSocket은 작동하지 않지만 시스템은 사용 가능

### 우리가 만든 Lilys AI Clone
- 휴대폰 번호 전용 로그인
- user.name 필드 사용
- 파일 업로드 및 AI 요약 기능

## 결론

1. **현재 시스템을 사용하려면**: 01034424668 / root1234로 로그인
2. **Lilys AI Clone을 배포하려면**: 위의 배포 명령어 실행

WebSocket 오류는 백엔드 서버 설정 문제이므로 무시해도 기본 기능은 작동합니다.# 사용자 관점 테스트 시나리오

## 1. 로그인 테스트

### 관리자 계정
- 휴대폰 번호: `01034424668`
- 비밀번호: `root1234`

### 운영자 계정
- 휴대폰 번호: `01012345678`
- 비밀번호: `admin1234`

## 2. 테스트 순서

### Step 1: 프로젝트 실행
```bash
# Backend 실행
cd backend
npm install
npm run accounts:reset  # 계정 초기화
npm run dev

# Frontend 실행 (새 터미널)
cd frontend
npm install
npm start
```

### Step 2: 로그인 페이지 접속
1. 브라우저에서 http://localhost:3000 접속
2. 로그인 페이지로 리디렉션 확인

### Step 3: 로그인 시도
1. 휴대폰 번호 입력: `01034424668`
2. 비밀번호 입력: `root1234`
3. "Sign In" 버튼 클릭

### Step 4: 대시보드 확인
- 환영 메시지에 사용자 이름 표시
- 통계 카드 4개 표시
- Quick Actions 버튼 작동 확인

### Step 5: 파일 업로드 테스트
1. "Upload New Content" 버튼 클릭
2. PDF, DOCX, TXT 파일 업로드
3. 처리 상태 확인

## 3. 예상 문제점 및 해결방법

### 문제 1: 로그인 실패
- **원인**: 계정이 생성되지 않음
- **해결**: `npm run accounts:reset` 실행

### 문제 2: API 연결 실패
- **원인**: CORS 또는 포트 문제
- **해결**: 
  - Backend가 5000번 포트에서 실행 중인지 확인
  - Frontend .env 파일에 `REACT_APP_API_URL=http://localhost:5000/api` 설정

### 문제 3: 대시보드 데이터 없음
- **원인**: API 엔드포인트 오류
- **해결**: 브라우저 개발자 도구에서 네트워크 탭 확인

## 4. 체크리스트

- [ ] 로그인 페이지에서 휴대폰 번호 입력 가능
- [ ] 로그인 성공 후 대시보드로 이동
- [ ] JWT 토큰이 localStorage에 저장됨
- [ ] API 호출 시 Authorization 헤더 포함
- [ ] WebSocket 연결 성공
- [ ] 파일 업로드 기능 작동

## 5. 디버깅 도구

### Backend 로그 확인
```bash
# 실시간 로그
npm run dev

# 계정 상태 확인
npm run accounts:check
```

### Frontend 디버깅
```javascript
// 브라우저 콘솔에서
localStorage.getItem('token')  // 토큰 확인
```