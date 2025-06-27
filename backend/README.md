# PAM Backend - Personal AI Manager

A high-performance FastAPI backend powering the PAM (Personal AI Manager) system with comprehensive AI orchestration, real-time communication, and intelligent automation.

## 🚀 Overview

PAM Backend is a production-ready FastAPI application that provides:

- **AI-Powered Orchestration**: Intelligent request processing through specialized AI nodes
- **Real-time Communication**: WebSocket support for instant PAM interactions
- **High Performance**: Optimized with connection pooling, caching, and monitoring
- **Comprehensive Security**: Multi-layered security with rate limiting and authentication
- **Scalable Architecture**: Microservices-ready with monitoring and observability

## 📋 Features

### Core AI System
- **Multi-Node Architecture**: Specialized nodes for different functionalities (Wins, Wheels, You, Social)
- **Intent Recognition**: Advanced NLP for understanding user requests
- **Context Management**: Persistent conversation context and user preferences
- **Action Planning**: Intelligent action sequences for complex tasks

### Real-time Features
- **WebSocket Support**: Instant bidirectional communication
- **Live Updates**: Real-time notifications and status updates
- **Session Management**: Persistent chat sessions with context

### Performance & Monitoring
- **Connection Pooling**: Optimized database connections
- **Redis Caching**: High-speed data caching
- **Metrics Collection**: Comprehensive performance monitoring
- **Error Tracking**: Sentry integration for error monitoring

### Security
- **JWT Authentication**: Secure user authentication
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Secure cross-origin requests
- **Request Validation**: Comprehensive input validation

## 🏗️ Architecture

```
PAM Backend
├── API Layer (FastAPI)
│   ├── Authentication
│   ├── Chat/WebSocket
│   ├── Domain APIs (Wins, Wheels, You, Social)
│   └── Health/Monitoring
├── AI Orchestration Layer
│   ├── Intent Recognition
│   ├── Node Routing
│   ├── Action Planning
│   └── Context Management
├── Service Layer
│   ├── Database Services
│   ├── Cache Services
│   ├── External API Services
│   └── Background Tasks
└── Infrastructure Layer
    ├── Database Pool
    ├── Redis Cache
    ├── Monitoring
    └── Security Middleware
```

## 🛠️ Technology Stack

### Core Framework
- **FastAPI 0.111.0**: Modern, fast web framework
- **Uvicorn**: High-performance ASGI server
- **Pydantic 2.8.2**: Data validation and settings

### AI & External Services
- **OpenAI 1.35.3**: AI language models
- **Supabase 2.5.0**: Backend-as-a-Service

### Database & Caching
- **PostgreSQL**: Primary database (via Supabase)
- **Redis 5.0.7**: High-speed caching
- **AsyncPG**: Async PostgreSQL driver

### Monitoring & Observability
- **Sentry**: Error tracking and performance monitoring
- **Prometheus**: Metrics collection
- **Structlog**: Structured logging
- **PSUtil**: System metrics

### Background Processing
- **Celery 5.4.0**: Distributed task queue
- **APScheduler 3.10.4**: Task scheduling

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/                 # API endpoints
│   │   ├── v1/             # API version 1
│   │   │   ├── health.py   # Health checks
│   │   │   ├── chat.py     # Chat endpoints
│   │   │   ├── pam.py      # PAM WebSocket & REST
│   │   │   ├── wins.py     # Financial management
│   │   │   ├── wheels.py   # Travel & vehicles
│   │   │   ├── you.py      # Personal organization
│   │   │   └── social.py   # Social features
│   │   └── deps.py         # API dependencies
│   ├── core/               # Core functionality
│   │   ├── config.py       # Configuration
│   │   ├── security.py     # Authentication
│   │   ├── middleware.py   # Custom middleware
│   │   └── logging.py      # Logging setup
│   ├── models/             # Data models
│   │   ├── domain/         # Domain models
│   │   └── schemas/        # API schemas
│   ├── services/           # Business logic
│   │   ├── pam/           # PAM AI services
│   │   ├── cache_service.py
│   │   ├── database.py
│   │   └── monitoring_service.py
│   ├── workers/            # Background tasks
│   │   └── celery.py
│   └── main.py            # Application entry point
├── tests/                 # Test suites
├── monitoring/           # Monitoring configs
├── scripts/              # Utility scripts
├── requirements.txt      # Dependencies
├── Dockerfile           # Container config
└── docker-compose.yml   # Local development
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL (or Supabase account)
- Redis
- OpenAI API key

### Installation

1. **Clone and setup environment**:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Environment configuration**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run the application**:
```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🔧 Configuration

### Environment Variables

```bash
# Application
ENVIRONMENT=development
DEBUG=false
VERSION=2.0.0

# Security
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=postgresql://user:pass@localhost/pam_backend
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379

# External APIs
OPENAI_API_KEY=your-openai-key
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
PROMETHEUS_ENABLED=true

# Performance
CACHE_TTL=300
RATE_LIMIT_PER_MINUTE=100
```

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`

### Key Endpoints

#### Health & Monitoring
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Comprehensive health metrics
- `GET /api/monitoring/metrics` - Prometheus metrics

#### PAM AI System
- `WebSocket /api/pam/ws` - Real-time PAM communication
- `POST /api/pam/chat` - REST chat endpoint
- `GET /api/pam/history` - Conversation history
- `PUT /api/pam/context` - Update user context

#### Domain APIs
- `GET|POST /api/wins/*` - Financial management (budgets, expenses, income)
- `GET|POST /api/wheels/*` - Travel & vehicle management
- `GET|POST /api/you/*` - Personal organization (calendar, tasks)
- `GET|POST /api/social/*` - Social features (groups, posts)

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test category
pytest tests/unit/
pytest tests/integration/
pytest tests/api/
```

## 🔍 Monitoring & Observability

### Metrics & Health Checks
- **Prometheus metrics**: Available at `/metrics`
- **Health endpoints**: Detailed system health
- **Performance monitoring**: Request timing, throughput

### Logging
- **Structured logging**: JSON format for production
- **Log levels**: DEBUG, INFO, WARN, ERROR
- **Context tracking**: Request tracing with correlation IDs

### Error Tracking
- **Sentry integration**: Automatic error capture
- **Performance monitoring**: Transaction tracing
- **Custom alerts**: Critical error notifications

## 🛡️ Security

### Authentication & Authorization
- **JWT tokens**: Secure, stateless authentication
- **Role-based access**: User/admin permissions
- **Token expiration**: Configurable token lifetimes

### Security Headers
- **CORS protection**: Configured allowed origins
- **Rate limiting**: Per-user and global limits
- **Input validation**: Comprehensive request validation

### Data Protection
- **Row Level Security**: Database-level access control
- **Encryption**: Sensitive data encryption
- **Audit logging**: Security event tracking

## 🚀 Deployment

### Production Deployment
1. **Environment setup**:
   - Set production environment variables
   - Configure external services (Redis, PostgreSQL)
   - Set up monitoring (Sentry, Prometheus)

2. **Application deployment**:
   ```bash
   # Using Docker
   docker build -t pam-backend .
   docker run -p 8000:8000 --env-file .env pam-backend

   # Using systemd service
   sudo systemctl enable pam-backend
   sudo systemctl start pam-backend
   ```

3. **Load balancer configuration**:
   - Configure reverse proxy (nginx, traefik)
   - Set up SSL/TLS certificates
   - Configure health check endpoints

### Scaling Considerations
- **Horizontal scaling**: Multiple worker processes
- **Database optimization**: Connection pooling, query optimization
- **Caching strategy**: Redis for session and data caching
- **CDN integration**: Static asset delivery

## 🔧 Development

### Code Style
- **Black**: Code formatting
- **isort**: Import sorting
- **pylint**: Code linting
- **mypy**: Type checking

### Pre-commit Hooks
```bash
# Install pre-commit
pip install pre-commit
pre-commit install

# Run manually
pre-commit run --all-files
```

### Adding New Features
1. Create feature branch
2. Add models/schemas in `app/models/`
3. Implement business logic in `app/services/`
4. Add API endpoints in `app/api/v1/`
5. Write tests in `tests/`
6. Update documentation

## 📈 Performance

### Optimization Features
- **Async/await**: Non-blocking I/O operations
- **Connection pooling**: Efficient database connections
- **Response caching**: Redis-based caching
- **Request batching**: Bulk operations support

### Performance Metrics
- **Response times**: < 100ms for cached responses
- **Throughput**: 1000+ requests/second
- **Memory usage**: Optimized memory footprint
- **Database efficiency**: Query optimization

## 🐛 Troubleshooting

### Common Issues
1. **Database connection errors**:
   - Check DATABASE_URL configuration
   - Verify database is accessible
   - Check connection pool settings

2. **Redis connection issues**:
   - Verify REDIS_URL configuration
   - Check Redis server status
   - Review cache settings

3. **Performance issues**:
   - Monitor database query performance
   - Check cache hit rates
   - Review worker process utilization

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
export DEBUG=true

# Run with debug output
uvicorn app.main:app --reload --log-level debug
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For questions and support:
- **Documentation**: [Full API Documentation](../docs/technical/api-documentation.md)
- **Issues**: Create GitHub issue
- **Email**: support@pam-system.com

---

*PAM Backend v2.0.0 - Building the future of personal AI assistance*