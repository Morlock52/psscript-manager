# PSScript Remote Server Usage Guide

## Access Information

After successful deployment on 74.208.184.195, you can access PSScript at:

- **Frontend Application**: http://74.208.184.195:3002
- **Backend API**: http://74.208.184.195:4000/api
- **AI Service**: http://74.208.184.195:8000

## Login Credentials

Default administrator account:
- **Username**: `admin`
- **Password**: `admin123!`

**IMPORTANT**: Change this password immediately after first login!

## Getting Started

### 1. First Login
1. Navigate to http://74.208.184.195:3002
2. Enter the default credentials
3. You'll be redirected to the dashboard

### 2. Change Default Password
1. Click on your profile icon (top right)
2. Go to Settings → Security
3. Change your password

### 3. Configure AI Features (Optional)
By default, the app runs in mock mode. To enable real AI features:

1. SSH into the server:
   ```bash
   ssh root@74.208.184.195
   ```

2. Navigate to the app directory:
   ```bash
   cd /opt/psscript
   ```

3. Edit the .env file:
   ```bash
   nano .env
   ```

4. Update these settings:
   - Set `USE_MOCK_AI=false`
   - Add your OpenAI API key: `OPENAI_API_KEY=sk-your-key-here`

5. Restart the services:
   ```bash
   docker-compose restart
   ```

## Core Features

### Script Management
1. **Upload Scripts**
   - Click "Upload Script" button
   - Select your PowerShell (.ps1) files
   - Add tags and categories

2. **View Scripts**
   - Browse all scripts in the Scripts page
   - Use search and filters
   - Click on any script for details

3. **Edit Scripts**
   - Open any script
   - Use the built-in code editor
   - Save changes with version tracking

### AI Features (When Enabled)
1. **Script Analysis**
   - Automatic security scanning
   - Performance recommendations
   - Code quality assessment

2. **AI Assistant**
   - Ask questions about PowerShell
   - Get code suggestions
   - Generate scripts from descriptions

3. **Documentation Generation**
   - Auto-generate script documentation
   - Create README files
   - Export as markdown

### Categories & Organization
1. **Create Categories**
   - Go to Categories page
   - Click "New Category"
   - Organize scripts by type

2. **Tag Management**
   - Add tags during upload
   - Bulk tag operations
   - Search by tags

## Server Management

### SSH Access
```bash
ssh root@74.208.184.195
# Password: Morlock52b
```

### Application Commands

**Check Status**:
```bash
cd /opt/psscript
docker-compose ps
```

**View Logs**:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f ai-service
```

**Restart Services**:
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
```

**Stop Application**:
```bash
docker-compose down
```

**Start Application**:
```bash
docker-compose up -d
```

### Database Management

**Backup Database**:
```bash
cd /opt/psscript
docker-compose exec postgres pg_dump -U postgres psscript > backup_$(date +%Y%m%d).sql
```

**Restore Database**:
```bash
docker-compose exec -T postgres psql -U postgres psscript < backup.sql
```

### Monitor Resources

**Check Container Stats**:
```bash
docker stats
```

**Check Disk Usage**:
```bash
df -h
docker system df
```

**Clean Up**:
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

## Troubleshooting

### Application Not Accessible

1. Check if services are running:
   ```bash
   docker-compose ps
   ```

2. Check firewall:
   ```bash
   # Check if ports are open
   netstat -tlnp | grep -E '3002|4000|8000'
   
   # Open ports if needed
   ufw allow 3002/tcp
   ufw allow 4000/tcp
   ufw allow 8000/tcp
   ```

3. Check logs for errors:
   ```bash
   docker-compose logs --tail=50
   ```

### Database Connection Issues

1. Check PostgreSQL status:
   ```bash
   docker-compose exec postgres pg_isready -U postgres
   ```

2. Reset database if needed:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

### Performance Issues

1. Check resource usage:
   ```bash
   docker stats
   free -h
   top
   ```

2. Restart specific service:
   ```bash
   docker-compose restart backend
   ```

3. Clear Redis cache:
   ```bash
   docker-compose exec redis redis-cli FLUSHALL
   ```

## Security Recommendations

1. **Change Default Passwords**
   - Admin account password
   - Database password in .env file

2. **Setup Firewall**
   ```bash
   ufw enable
   ufw allow 22/tcp  # SSH
   ufw allow 3002/tcp  # Frontend
   ufw allow 4000/tcp  # Backend
   ufw allow 8000/tcp  # AI Service
   ```

3. **Enable HTTPS** (Optional)
   - Install SSL certificate
   - Configure nginx reverse proxy
   - Update docker-compose to use nginx

4. **Regular Backups**
   ```bash
   # Create backup script
   cat > /opt/psscript/backup.sh << 'EOF'
   #!/bin/bash
   cd /opt/psscript
   docker-compose exec postgres pg_dump -U postgres psscript > backups/psscript_$(date +%Y%m%d_%H%M%S).sql
   # Keep only last 7 days of backups
   find backups -name "*.sql" -mtime +7 -delete
   EOF
   
   chmod +x /opt/psscript/backup.sh
   
   # Add to crontab
   (crontab -l 2>/dev/null; echo "0 2 * * * /opt/psscript/backup.sh") | crontab -
   ```

## Support & Updates

### Check Application Version
```bash
cd /opt/psscript
cat package.json | grep version
```

### Update Application
1. Backup current installation
2. Download new deployment package
3. Follow deployment steps again

### Get Help
- Check logs first: `docker-compose logs`
- Review this guide
- Check TROUBLESHOOTING_GUIDE.md in the docs folder

## Quick Reference

| Task | Command |
|------|---------|
| Access App | http://74.208.184.195:3002 |
| SSH Login | `ssh root@74.208.184.195` |
| App Directory | `/opt/psscript` |
| View Logs | `docker-compose logs -f` |
| Restart All | `docker-compose restart` |
| Check Status | `docker-compose ps` |
| Backup DB | `docker-compose exec postgres pg_dump -U postgres psscript > backup.sql` |

## Common Workflows

### Upload and Analyze a Script
1. Login to the web interface
2. Click "Upload Script"
3. Select your .ps1 file
4. Wait for AI analysis (if enabled)
5. Review results and recommendations

### Search for Scripts
1. Go to Scripts page
2. Use search bar for keywords
3. Filter by category or tags
4. Sort by date, name, or rating

### Generate New Script
1. Go to AI Assistant
2. Describe what you need
3. Review generated code
4. Save to your library

Remember to regularly check for updates and maintain backups of your scripts and database!