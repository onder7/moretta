# Moretta E-Commerce Deployment - COMPLETE ✅

## Deployment Summary
Successfully deployed the Moretta e-commerce platform to production server at **31.7.33.14** on August 5, 2026.

## Access Points

### Frontend
- **URL**: http://31.7.33.14:8082/
- **Status**: ✅ Running
- **Purpose**: Customer-facing storefront

### Admin Panel
- **URL**: http://31.7.33.14:8082/admin/
- **Status**: ✅ Running
- **Purpose**: Product and order management
- **Credentials**:
  - Email: `admin@ecommerce.com`
  - Password: `Admin123!`

### Backend API
- **URL**: http://31.7.33.14:8082/api/
- **Status**: ✅ Running
- **Port**: 5010 (internal), 8082 (external via nginx)
- **Sample Endpoint**: `/api/products` (returns 80 seeded products)

## Infrastructure

### Docker Containers (All Running)
1. **nginx** (v1.31.3-alpine)
   - Reverse proxy on port 8082
   - Routes traffic to frontend, admin, and API
   
2. **frontend** (Node.js 20, React)
   - Main application UI
   - Port: 80 (internal)
   
3. **admin** (Node.js 20, React)
   - Admin dashboard
   - Port: 80 (internal)
   
4. **backend** (Node.js 20, Express)
   - REST API
   - Port: 5010 (internal)
   
5. **postgres** (v16-alpine)
   - Database: ecommerce
   - User: ecom
   - Status: Healthy ✅
   
6. **redis** (v7-alpine)
   - Caching layer
   - Status: Healthy ✅

### Seeded Data
- **Products**: 80 items
- **Variants**: 160 (2 per product)
- **Categories**: 10
- **Images**: 160
- **Tags**: 240
- **Users**: 5 (1 admin + 4 customers)
- **Test Accounts**:
  - Admin: admin@ecommerce.com / Admin123!
  - Customer: test@ecommerce.com / Test123!
- **Discount Coupons**: 3 active
- **Chatbot Rules**: 10 configured

## Configuration

### Server Details
- **IP Address**: 31.7.33.14
- **SSH User**: onder
- **Project Directory**: /home/onder/moretta/
- **External Port**: 8082
- **Docker Compose**: v2

### Environment Variables
Located in: `/home/onder/moretta/.env`

Key configurations:
```
POSTGRES_USER=ecom
POSTGRES_PASSWORD=ecom123
POSTGRES_DB=ecommerce
DATABASE_URL=postgresql://ecom:ecom123@postgres:5432/ecommerce
FRONTEND_URL=http://31.7.33.14:8082
ADMIN_URL=http://31.7.33.14:8082/admin
```

### Nginx Configuration
File: `/home/onder/moretta/nginx/conf.d/default-http.conf`

Routing:
- `/api/*` → backend:5010
- `/uploads/*` → backend:5010
- `/admin/*` → admin:80 (rewritten)
- `/` → frontend:80 (default)

## Recent Changes

### Docker Setup
- Added port mapping for nginx on port 8082
- Fixed backend port reference from 5000 to 5010
- Added ceyiz_diyari_mock_db-v2.json to backend Dockerfile
- Installed ts-node in production image for seed execution

### Database Seeding
- Successfully ran seed script: `node dist/utils/seed.js`
- Populated database with 80 products across 10 categories
- Created test accounts and discount coupons

### GitHub Repository
- Repository: https://github.com/onder7/moretta
- Latest commits:
  - Copy mock database JSON to backend container
  - Fix backend port from 5000 to 5010
  - Update nginx port to 8082
  - Expose nginx on port 81 for production access
  - Initial commit: Complete Moretta e-commerce project

## Testing Endpoints

### Verify All Services
```bash
# Frontend
curl -s http://31.7.33.14:8082/ | head -20

# Admin
curl -s http://31.7.33.14:8082/admin/ | head -20

# API Products
curl -s http://31.7.33.14:8082/api/products | jq '.pagination'
```

## Next Steps (Optional)

1. **SSL/HTTPS Configuration**
   - Set up SSL certificates with Let's Encrypt
   - Update nginx config to handle SSL
   
2. **Performance Optimization**
   - Configure CDN for static assets
   - Set up caching headers
   
3. **Monitoring**
   - Set up health checks
   - Configure logging aggregation
   
4. **Backups**
   - Configure PostgreSQL backups
   - Set up automated backup strategy

## Maintenance Commands

### View Logs
```bash
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f postgres
```

### Restart Services
```bash
docker compose restart backend
docker compose restart nginx
```

### Full Restart
```bash
docker compose down
docker compose up -d
```

### Database Access
```bash
docker compose exec postgres psql -U ecom -d ecommerce
```

### Reseed Database
```bash
docker compose exec -T backend node dist/utils/seed.js
```

## Support & Troubleshooting

### Common Issues
- **503 Service Unavailable**: Check if backend is running with `docker compose ps`
- **Database Connection Error**: Verify PostgreSQL is healthy with `docker compose ps`
- **Nginx Routing Issues**: Check `/home/onder/moretta/nginx/conf.d/default-http.conf`

### Debug Mode
SSH to server and check container status:
```bash
cd /home/onder/moretta
docker compose ps
docker compose logs backend
```

---

**Deployment Date**: August 5, 2026
**Status**: Production Ready ✅
**All Services**: Operational ✅
