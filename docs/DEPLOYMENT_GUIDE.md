# Deployment Guide

This guide provides essential information for deploying the GENBOOK.AI application with Razorpay integration in production.

## Prerequisites

- Node.js 16+ and npm/yarn installed
- Supabase project with database schema initialized
- Razorpay account with API keys and webhook configured
- Domain name with SSL certificate (for webhooks)

## Environment Configuration

### Required Environment Variables

#### Frontend (`.env.production`)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_RAZORPAY_PROFESSIONAL_PLAN_ID=your_pro_plan_id
VITE_RAZORPAY_ENTERPRISE_PLAN_ID=your_ent_plan_id
```

#### Backend (`server/.env`)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/db

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE=your_supabase_service_role

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Security
JWT_SECRET=your_jwt_secret
COOKIE_SECRET=your_cookie_secret

# Deployment
NODE_ENV=production
PORT=3001
```

## Deployment Steps

### 1. Build the Frontend

```bash
# Install dependencies
npm install

# Build for production
npm run build

# The built files will be in the `dist` directory
```

### 2. Set Up the Backend

```bash
# Install dependencies
cd server
npm install

# Build TypeScript
npm run build
```

### 3. Database Migrations

Ensure all database migrations are applied before starting the server:

```bash
# Run migrations
npm run migrate
```

### 4. Start the Server

Use a process manager like PM2 to keep the server running:

```bash
# Install PM2 globally
npm install -g pm2

# Start the server
pm2 start dist/index.js --name "genbook-api"

# Save the process list for automatic startup
pm2 save
pm2 startup
```

### 5. Set Up Reverse Proxy (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/privkey.pem;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Webhooks
    location /webhooks {
        proxy_pass http://localhost:3001/webhooks;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Logging

### Log Management

Set up log rotation and monitoring:

```bash
# Install logrotate
sudo apt-get install logrotate

# Create logrotate configuration
sudo nano /etc/logrotate.d/genbook
```

Example logrotate configuration:
```
/var/log/genbook/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root adm
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Error Monitoring

Set up Sentry for error tracking:

1. Create a project in Sentry
2. Add your DSN to the environment variables:
   ```
   SENTRY_DSN=your_sentry_dsn
   ```

## Scaling Considerations

### Horizontal Scaling

For high traffic, consider:

1. **Load Balancing**: Use a load balancer (AWS ALB, Nginx) to distribute traffic
2. **Database**: Consider read replicas for read-heavy workloads
3. **Caching**: Implement Redis for session storage and caching

### Database Connection Pooling

Configure connection pooling in your database settings:

```typescript
// src/utils/db.ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // max number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Security Best Practices

1. **Secrets Management**:
   - Use a secrets manager (AWS Secrets Manager, HashiCorp Vault)
   - Never commit secrets to version control

2. **Rate Limiting**:
   ```typescript
   import rateLimit from 'express-rate-limit';
   
   const apiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
   });
   
   app.use('/api/', apiLimiter);
   ```

3. **CORS**:
   - Restrict CORS to your frontend domain in production
   - Configure CORS middleware:
     ```typescript
     app.use(cors({
       origin: process.env.FRONTEND_URL,
       credentials: true,
     }));
     ```

## Backup and Recovery

### Database Backups

Set up automated database backups:

```bash
# Example backup script
pg_dump -U username -d dbname -f backup.sql

# Schedule with cron
0 2 * * * pg_dump -U username -d dbname -f /backups/db_backup_$(date +\%Y\%m\%d).sql
```

### Disaster Recovery

1. Regular database dumps
2. Off-site backups
3. Documented recovery procedures

## Maintenance

### Updates

Regularly update dependencies:

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Test thoroughly after updates
npm test
```

### Monitoring

Set up monitoring for:
- Server resource usage (CPU, memory, disk)
- Application performance (response times, error rates)
- Database performance (query times, connection pool usage)

## Troubleshooting

### Common Issues

1. **Webhook Failures**
   - Check webhook delivery in Razorpay dashboard
   - Verify webhook secret matches
   - Check server logs for errors

2. **Database Connection Issues**
   - Verify database credentials
   - Check connection pool settings
   - Monitor for connection leaks

3. **Performance Problems**
   - Check for N+1 queries
   - Review slow queries in database logs
   - Consider adding database indexes

### Getting Help

For support, please contact:
- Email: support@genbook.ai
- GitHub Issues: https://github.com/yourorg/genbook/issues
