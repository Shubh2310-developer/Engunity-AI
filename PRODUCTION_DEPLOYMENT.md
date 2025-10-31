# 🚀 Production Deployment Guide - Engunity AI

## 📋 Pre-Deployment Checklist

### 1. Environment Setup
- [ ] All `.env.production` files configured
- [ ] API keys verified and working
- [ ] MongoDB production instance ready
- [ ] Docker installed and running
- [ ] Domain and SSL certificates configured

### 2. Code Quality
- [ ] All tests passing
- [ ] TypeScript strict mode enabled
- [ ] ESLint issues resolved
- [ ] No console.log in production code
- [ ] Bundle size analyzed and optimized

### 3. Security
- [ ] ENV_BACKUP folder excluded from Git ✅
- [ ] All secrets in environment variables
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Helmet.js enabled
- [ ] Input validation on all endpoints

### 4. Performance
- [ ] Images optimized (WebP/AVIF)
- [ ] Code splitting enabled
- [ ] Lazy loading implemented
- [ ] Caching strategy configured
- [ ] Database indexes created ✅ (34 indexes)

---

## 🐳 Docker Deployment (Recommended)

### Step 1: Build Production Images

```bash
# Build all services
docker-compose -f docker-compose.optimized.yml build

# Or build individually
docker build -t engunity-frontend:latest ./frontend
docker build -t engunity-backend:latest ./backend
docker build -t engunity-executor:latest ./code-executor
```

### Step 2: Configure Environment

```bash
# Copy production environment files
cp frontend/.env.production frontend/.env.local
cp backend/.env.example backend/.env
cp code-executor/.env.example code-executor/.env

# Edit with production values
nano frontend/.env.local
nano backend/.env
nano code-executor/.env
```

### Step 3: Start Services

```bash
# Start all services with resource limits
docker-compose -f docker-compose.optimized.yml up -d

# Check logs
docker-compose logs -f

# Check health
docker-compose ps
```

### Step 4: Verify Deployment

```bash
# Test frontend
curl http://localhost:3000

# Test backend
curl http://localhost:8000/api/health

# Test code executor
curl http://localhost:4001/health

# Test MongoDB
mongosh mongodb://localhost:27017/engunity-ai-dev --eval "db.stats()"
```

---

## 🖥️ Manual Deployment

### Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm ci --only=production

# Build
NODE_ENV=production npm run build

# Start with PM2
pm2 start npm --name "engunity-frontend" -- start -- -p 3000

# Or with standalone server
node .next/standalone/server.js
```

### Backend (FastAPI)

```bash
cd backend

# Activate conda environment
conda activate engunity

# Start with Gunicorn
gunicorn -w 4 --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --access-logfile - \
  --error-logfile - \
  app.main:app

# Or with PM2
pm2 start "gunicorn app.main:app ..." --name engunity-backend
```

### Code Executor

```bash
cd code-executor

# Install dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/index.js --name engunity-executor \
  --max-memory-restart 600M \
  --instances 1
```

---

## 🔧 Memory Optimization Configuration

### System-wide Settings

```bash
# Add to /etc/sysctl.conf
vm.swappiness=10
vm.overcommit_memory=1
net.core.somaxconn=65535

# Apply
sudo sysctl -p
```

### Python Services

```bash
# Add to your start script
export MALLOC_ARENA_MAX=2
export PYTHONOPTIMIZE=1
export PYTHONHASHSEED=0
export OMP_NUM_THREADS=2
export MKL_NUM_THREADS=2
export TOKENIZERS_PARALLELISM=false
```

### Node.js Services

```bash
# Add to your start script
export NODE_OPTIONS="--max-old-space-size=512 --max-semi-space-size=2"
```

### MongoDB

```yaml
# /etc/mongod.conf
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.5
    collectionConfig:
      blockCompressor: snappy
```

---

## 📊 Monitoring Setup

### PM2 Monitoring

```bash
# Install PM2
npm install -g pm2

# Start monitoring
pm2 monit

# Setup startup script
pm2 startup
pm2 save
```

### Health Check Endpoints

```bash
# Add health check cron job
*/5 * * * * curl -f http://localhost:8000/api/health || systemctl restart engunity-backend
*/5 * * * * curl -f http://localhost:4001/health || systemctl restart engunity-executor
*/5 * * * * curl -f http://localhost:3000 || systemctl restart engunity-frontend
```

### Log Management

```bash
# Rotate logs daily
# Add to /etc/logrotate.d/engunity-ai

/var/log/engunity/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload engunity-*
    endscript
}
```

---

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 27017/tcp  # Block external MongoDB access
sudo ufw enable
```

### 2. SSL/TLS Setup (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Code Executor
    location /executor/ {
        proxy_pass http://localhost:4001;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Environment Variables Security

```bash
# Never commit these files!
# Keep in a secure location, encrypted

# Use secret management (e.g., HashiCorp Vault)
vault kv put secret/engunity-ai \
  GROQ_API_KEY="your_key" \
  SUPABASE_KEY="your_key"

# Or use systemd environment files
# /etc/systemd/system/engunity.service.d/env.conf
[Service]
EnvironmentFile=/etc/engunity/secrets.env
```

---

## 📈 Performance Tuning

### Database Optimization

```javascript
// MongoDB indexes (already created via setup)
// Verify indexes
db.users.getIndexes()
db.documents.getIndexes()
db.chat_sessions.getIndexes()

// Query performance
db.users.explain("executionStats").find({email: "test@example.com"})
```

### Caching Strategy

```typescript
// Redis caching example
import Redis from 'ioredis'
const redis = new Redis()

// Cache expensive queries
async function getCachedData(key: string) {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)

  const data = await expensiveQuery()
  await redis.setex(key, 3600, JSON.stringify(data))
  return data
}
```

### CDN Configuration

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['cdn.yourdomain.com'],
    loader: 'custom',
    loaderFile: './imageLoader.js',
  },
}
```

---

## 🔄 Backup & Recovery

### Automated Backups

```bash
#!/bin/bash
# /usr/local/bin/backup-engunity.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/engunity"

# MongoDB backup
mongodump --uri="mongodb://localhost:27017/engunity-ai-dev" \
  --out="$BACKUP_DIR/mongodb_$DATE"

# Compress
tar -czf "$BACKUP_DIR/mongodb_$DATE.tar.gz" "$BACKUP_DIR/mongodb_$DATE"
rm -rf "$BACKUP_DIR/mongodb_$DATE"

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/mongodb_$DATE.tar.gz" \
  s3://your-bucket/backups/

# Keep only last 30 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# Add to crontab
# 0 2 * * * /usr/local/bin/backup-engunity.sh
```

### Disaster Recovery

```bash
# Restore from backup
mongorestore --uri="mongodb://localhost:27017/engunity-ai-dev" \
  --drop \
  "/backups/engunity/mongodb_YYYYMMDD/engunity-ai-dev"
```

---

## 📊 Monitoring Dashboards

### Grafana + Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'engunity-backend'
    static_configs:
      - targets: ['localhost:8000']
  - job_name: 'engunity-executor'
    static_configs:
      - targets: ['localhost:4001']
  - job_name: 'mongodb'
    static_configs:
      - targets: ['localhost:27017']
```

### PM2 Plus (Keymetrics)

```bash
# Link to PM2 Plus
pm2 link <secret_key> <public_key>

# Start with monitoring
pm2 start ecosystem.config.js
```

---

## 🚨 Troubleshooting

### High Memory Usage

```bash
# Check memory by service
docker stats

# Restart heavy services
pm2 restart engunity-backend --update-env

# Trigger garbage collection
kill -USR2 $(pgrep -f "node dist/index.js")
```

### Service Won't Start

```bash
# Check logs
journalctl -u engunity-backend -n 100 --no-pager
docker-compose logs --tail=100

# Check ports
lsof -i:3000
lsof -i:8000
lsof -i:4001
lsof -i:27017

# Restart services
systemctl restart engunity-*
docker-compose restart
```

### Database Connection Issues

```bash
# Test MongoDB connection
mongosh --eval "db.adminCommand('ping')"

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod
```

---

## 📝 Post-Deployment Checklist

- [ ] All services started successfully
- [ ] Health checks passing
- [ ] SSL certificates valid
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Logs rotating
- [ ] Firewall configured
- [ ] Domain pointing correctly
- [ ] Email notifications setup
- [ ] Documentation updated

---

## 🎯 Performance Benchmarks

### Target Metrics:
- **Page Load Time:** < 2 seconds
- **API Response Time:** < 200ms (p95)
- **Code Execution Time:** < 5 seconds
- **Memory Usage:** < 2 GB total
- **CPU Usage:** < 50% average
- **Uptime:** > 99.5%

### Monitor With:
```bash
# Run benchmarks
artillery quick --count 100 -n 10 http://localhost:3000
wrk -t12 -c400 -d30s http://localhost:8000/api/health

# Lighthouse audit
lighthouse http://localhost:3000 --view
```

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks

**Daily:**
- Check error logs
- Monitor memory usage
- Verify backups completed

**Weekly:**
- Update dependencies
- Review performance metrics
- Check security advisories

**Monthly:**
- Database optimization
- Security audit
- Capacity planning
- Cost analysis

---

**Deployment Status:** Ready for Production
**Last Updated:** 2025-10-24
**Maintained By:** Project Team

