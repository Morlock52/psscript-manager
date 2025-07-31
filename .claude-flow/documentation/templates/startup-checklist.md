# PSScript Application Startup Checklist

## Prerequisites ✓

- [ ] **System Requirements**
  - [ ] Node.js v18+ installed
  - [ ] Docker Desktop 4.20+ installed and running
  - [ ] PostgreSQL client tools (optional for debugging)
  - [ ] Git 2.40+ installed
  - [ ] Minimum 8GB RAM available
  - [ ] 10GB free disk space

- [ ] **Development Tools**
  - [ ] VS Code or preferred IDE
  - [ ] PowerShell 7+ (for script testing)
  - [ ] Postman/Insomnia (for API testing)
  - [ ] Browser DevTools

## Environment Setup 🔧

- [ ] **Clone Repository**
  ```bash
  git clone <repository-url>
  cd psscript
  ```

- [ ] **Environment Variables**
  - [ ] Copy `.env.example` to `.env`
  - [ ] Set `NODE_ENV=development`
  - [ ] Configure `DATABASE_URL`
  - [ ] Set `REDIS_URL`
  - [ ] Add `JWT_SECRET` (generate secure key)
  - [ ] Configure `AI_API_KEY` if using AI features

## Dependency Installation 📦

- [ ] **Root Dependencies**
  ```bash
  npm install
  ```

- [ ] **Frontend Dependencies**
  ```bash
  cd src/frontend
  npm install
  cd ../..
  ```

- [ ] **Backend Dependencies**
  ```bash
  cd src/backend
  npm install
  cd ../..
  ```

- [ ] **AI Service Dependencies** (if applicable)
  ```bash
  cd src/ai
  pip install -r requirements.txt
  cd ../..
  ```

## Database Initialization 🗄️

- [ ] **Start Database Services**
  ```bash
  docker-compose up -d postgres redis
  ```

- [ ] **Wait for Services**
  ```bash
  # Check postgres is ready
  docker-compose exec postgres pg_isready
  
  # Check redis is ready
  docker-compose exec redis redis-cli ping
  ```

- [ ] **Run Migrations**
  ```bash
  cd src/backend
  npm run migrate
  ```

- [ ] **Seed Initial Data** (optional)
  ```bash
  npm run seed
  ```

- [ ] **Initialize Categories**
  ```bash
  cd ../..
  ./init-categories.sh
  ```

## Configuration ⚙️

- [ ] **Backend Configuration**
  - [ ] Verify `src/backend/config.js`
  - [ ] Check CORS settings
  - [ ] Confirm upload directory exists
  - [ ] Set appropriate rate limits

- [ ] **Frontend Configuration**
  - [ ] Update `src/frontend/.env`
  - [ ] Set correct API endpoints
  - [ ] Configure feature flags

- [ ] **Docker Configuration**
  - [ ] Review `docker-compose.yml`
  - [ ] Check port mappings
  - [ ] Verify volume mounts

## Startup Commands 🚀

### Development Mode

- [ ] **Start All Services**
  ```bash
  docker-compose up -d
  ```

- [ ] **Start Backend** (separate terminal)
  ```bash
  cd src/backend
  npm run dev
  ```

- [ ] **Start Frontend** (separate terminal)
  ```bash
  cd src/frontend
  npm run dev
  ```

- [ ] **Start AI Service** (if needed)
  ```bash
  cd src/ai
  python main.py
  ```

### Production Mode

- [ ] **Build Applications**
  ```bash
  npm run build
  ```

- [ ] **Start with Docker**
  ```bash
  docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
  ```

## Health Checks 🏥

- [ ] **Backend Health**
  ```bash
  curl http://localhost:3001/api/health
  ```

- [ ] **Frontend Access**
  - [ ] Open http://localhost:3000
  - [ ] Verify page loads without errors

- [ ] **Database Connection**
  ```bash
  cd src/backend
  npm run test:db
  ```

- [ ] **Redis Connection**
  ```bash
  npm run test:redis
  ```

- [ ] **API Endpoints**
  ```bash
  # Test auth endpoint
  curl http://localhost:3001/api/auth/status
  
  # Test scripts endpoint
  curl http://localhost:3001/api/scripts
  ```

## Troubleshooting 🔍

### Common Issues

- [ ] **Port Already in Use**
  ```bash
  # Find process using port
  lsof -i :3000  # or :3001, :5432, etc.
  
  # Kill process
  kill -9 <PID>
  ```

- [ ] **Database Connection Failed**
  ```bash
  # Check postgres logs
  docker-compose logs postgres
  
  # Restart database
  docker-compose restart postgres
  ```

- [ ] **Dependencies Issues**
  ```bash
  # Clear cache and reinstall
  rm -rf node_modules package-lock.json
  npm install
  ```

- [ ] **Permission Issues**
  ```bash
  # Fix upload directory permissions
  chmod 755 src/backend/uploads
  ```

### Logs Location

- [ ] Backend logs: `src/backend/logs/`
- [ ] Docker logs: `docker-compose logs <service>`
- [ ] Frontend console: Browser DevTools

## Verification Steps ✅

- [ ] Create test user account
- [ ] Upload sample PowerShell script
- [ ] Run script analysis
- [ ] Check AI chat functionality
- [ ] Verify file downloads
- [ ] Test search functionality
- [ ] Confirm responsive design

## Support Resources 📚

- [ ] Technical Documentation: `/docs/TECHNICAL_DOCUMENTATION.md`
- [ ] API Reference: `/docs/api/`
- [ ] Troubleshooting Guide: `/docs/TROUBLESHOOTING.md`
- [ ] Team Contact: [support email/slack]

---

**Last Updated**: ${new Date().toISOString().split('T')[0]}
**Version**: 1.0.0