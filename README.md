# PSScript Manager

A comprehensive PowerShell script management platform with AI-powered analysis, collaborative features, and enterprise-grade security.

![PSScript Manager Dashboard](assets/images/dashboard.png)

## 🚀 Features

### Core Features
- **Script Management**: Upload, organize, and version control PowerShell scripts
- **AI-Powered Analysis**: Automated security scanning and best practice recommendations
- **Real-time Collaboration**: Share scripts and collaborate with team members
- **Advanced Search**: Find scripts by content, metadata, or AI-generated tags
- **Category Organization**: Organize scripts into categories with custom taxonomies

### AI & Analytics
- **Security Analysis**: Detect potential security vulnerabilities
- **Performance Optimization**: Identify performance bottlenecks
- **Code Quality**: Best practice recommendations
- **Risk Assessment**: Automated risk scoring
- **Smart Suggestions**: AI-powered script improvements

### Enterprise Features
- **Role-Based Access Control**: Granular permissions system
- **Audit Logging**: Complete activity tracking
- **Multi-tenant Support**: Organization and team management
- **API Integration**: RESTful API for automation
- **SSO Integration**: Enterprise authentication support

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with pgvector for embeddings
- **AI Services**: Multiple AI agent integration (OpenAI, Anthropic, etc.)
- **Caching**: Redis for session management and caching
- **Search**: Vector embeddings for semantic search
- **Deployment**: Docker + Docker Compose

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │   Node.js API   │    │   AI Services   │
│                 │◄──►│                 │◄──►│                 │
│ • Dashboard     │    │ • Authentication│    │ • Script Analysis│
│ • Script Editor │    │ • Script CRUD   │    │ • Risk Assessment│
│ • Analytics     │    │ • User Management│   │ • Recommendations│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐             │
         │              │   PostgreSQL    │             │
         │              │                 │             │
         └──────────────►│ • Scripts       │◄────────────┘
                        │ • Users         │
                        │ • Analytics     │
                        │ • Vector Data   │
                        └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- PostgreSQL 15+ (for local development)

### One-Line Installation
```bash
curl -sSL https://raw.githubusercontent.com/Morlock52/psscript-manager/main/quick-install.sh | bash
```

### Manual Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Morlock52/psscript-manager.git
   cd psscript-manager
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:4000
   - Admin Panel: http://localhost:3000/admin

### Default Credentials
- **Email**: admin@example.com
- **Password**: admin123!

## 📁 Project Structure

```
psscript-manager/
├── src/
│   ├── frontend/          # React frontend application
│   ├── backend/           # Node.js backend API
│   ├── ai/               # AI services and agents
│   ├── db/               # Database schemas and migrations
│   └── utils/            # Shared utilities
├── deploy/               # Deployment configurations
├── docs/                 # Documentation
├── tests/               # Test suites
├── scripts/             # Utility scripts
└── docker-compose.yml   # Development environment
```

## 🔧 Development

### Local Development Setup

1. **Install dependencies**
   ```bash
   # Backend
   cd src/backend && npm install
   
   # Frontend
   cd src/frontend && npm install
   
   # AI Services
   cd src/ai && pip install -r requirements.txt
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up postgres redis -d
   
   # Run migrations
   npm run migrate
   
   # Seed initial data
   npm run seed
   ```

4. **Start Development Servers**
   ```bash
   # Backend (Terminal 1)
   cd src/backend && npm run dev
   
   # Frontend (Terminal 2)
   cd src/frontend && npm run dev
   
   # AI Services (Terminal 3)
   cd src/ai && python main.py
   ```

### Testing

```bash
# Run all tests
npm test

# Backend tests
npm run test:backend

# Frontend tests
npm run test:frontend

# E2E tests
npm run test:e2e

# AI service tests
cd src/ai && python -m pytest
```

## 🚀 Deployment

### Production Deployment

1. **Using Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Manual Deployment**
   ```bash
   # Build frontend
   cd src/frontend && npm run build
   
   # Build backend
   cd src/backend && npm run build
   
   # Deploy to your server
   ./deploy/deploy.sh production
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `OPENAI_API_KEY` | OpenAI API key for AI features | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |

## 📖 API Documentation

### Authentication
```bash
# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password",
  "name": "User Name"
}
```

### Script Management
```bash
# Upload script
POST /api/scripts
Content-Type: multipart/form-data

# Get scripts
GET /api/scripts?page=1&limit=10&category=monitoring

# Analyze script
POST /api/scripts/:id/analyze

# Get script analysis
GET /api/scripts/:id/analysis
```

### AI Features
```bash
# Analyze script content
POST /api/ai/analyze
{
  "content": "PowerShell script content",
  "type": "security_scan"
}

# Get AI recommendations
GET /api/ai/recommendations/:scriptId
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Ensure tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Style

- **TypeScript**: Use strict type checking
- **ESLint**: Follow the configured rules
- **Prettier**: Code formatting
- **Conventional Commits**: Use conventional commit messages

## 📊 Monitoring & Observability

PSScript Manager includes comprehensive monitoring:

- **Application Metrics**: Performance and usage metrics
- **Health Checks**: Service health monitoring
- **Audit Logs**: Complete activity tracking
- **Error Tracking**: Automated error reporting
- **Analytics Dashboard**: Usage analytics and insights

## 🔒 Security

### Security Features
- **Input Validation**: All inputs are validated and sanitized
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: Token-based CSRF protection
- **Rate Limiting**: API rate limiting
- **Audit Logging**: Complete activity logging

### Security Best Practices
- Regular security updates
- Dependency vulnerability scanning
- Secure configuration defaults
- Encrypted data at rest and in transit
- Role-based access control

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Community Support
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community discussions and Q&A
- **Documentation**: Comprehensive documentation

### Enterprise Support
For enterprise support, training, and consulting services, please contact us at:
- Email: support@psscript-manager.com
- Website: https://psscript-manager.com

## 🗺️ Roadmap

### Current Version (v1.0)
- ✅ Core script management
- ✅ AI-powered analysis
- ✅ User authentication
- ✅ Basic collaboration

### Upcoming Features (v1.1)
- 🔄 Advanced AI agents
- 🔄 Voice API integration
- 🔄 Enhanced analytics
- 🔄 Mobile application

### Future Plans (v2.0)
- 📋 Multi-cloud deployment
- 📋 Advanced workflow automation
- 📋 Enterprise integrations
- 📋 Machine learning insights

## 🙏 Acknowledgments

- **React Team** for the amazing React framework
- **Node.js Community** for the robust backend ecosystem
- **PostgreSQL Team** for the reliable database
- **OpenAI** for AI capabilities
- **All Contributors** who made this project possible

---

**Made with ❤️ by the PSScript Manager Team**

For more information, visit our [website](https://psscript-manager.com) or check out our [documentation](docs/).