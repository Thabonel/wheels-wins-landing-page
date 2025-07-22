# Wheels & Wins - Complete Travel Planning & RV Community Platform

[![Code Quality](https://github.com/Thabonel/wheels-wins-landing-page/actions/workflows/code-quality.yml/badge.svg)](https://github.com/Thabonel/wheels-wins-landing-page/actions/workflows/code-quality.yml)
[![Security Analysis](https://github.com/Thabonel/wheels-wins-landing-page/actions/workflows/code-quality.yml/badge.svg)](https://github.com/Thabonel/wheels-wins-landing-page/actions/workflows/code-quality.yml)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-green.svg)](https://developers.google.com/web/progressive-web-apps/)
[![TTS Enabled](https://img.shields.io/badge/TTS-Enabled-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

## 🚛 Project Overview

Wheels & Wins is a comprehensive travel planning and RV community platform that combines intelligent trip planning, financial management, and AI-powered assistance. The platform helps users plan routes, manage expenses, connect with fellow travelers, and optimize their travel experiences with PAM (Personal AI Mobility) assistant.

**🌐 Live Demo**: [wheelsandwins.com](https://wheelsandwins.com)
**🔧 Admin Dashboard**: [admin.wheelsandwins.com](https://admin.wheelsandwins.com)

## ✨ Key Features

### 🗺️ **Intelligent Trip Planning**
- **Interactive Map Interface**: Mapbox-powered trip planning with real-time overlays
- **Route Optimization**: Multi-waypoint route calculation with fuel efficiency
- **Real-World Data**: Live weather, traffic, campground availability, and hazard alerts
- **Offline Support**: Trip data accessible without internet connectivity

### 🤖 **PAM AI Assistant**
- **Voice-Enabled Chat**: Natural conversation with TTS/STT capabilities
- **Contextual Intelligence**: Trip-aware recommendations and proactive suggestions
- **Multi-Engine TTS**: Edge TTS, Coqui TTS, and system TTS fallbacks
- **Smart Suggestions**: Campgrounds, attractions, route optimization, and cost estimates

### 💰 **Financial Management**
- **Expense Tracking**: Categorized expense management with receipt capture
- **Budget Planning**: Income tracking and goal setting with analytics
- **Cost Predictions**: AI-powered trip cost estimates and optimization
- **Financial Insights**: Detailed spending analysis and recommendations

### 👥 **Community Features**
- **Social Networking**: Connect with fellow travelers and RV enthusiasts
- **Experience Sharing**: Photo sharing, trip reviews, and recommendations
- **Community Knowledge**: Crowdsourced campground reviews and travel tips

### 📱 **Progressive Web App**
- **Mobile Optimized**: Responsive design with mobile-first approach
- **Offline Functionality**: Core features work without internet
- **App-Like Experience**: Install on mobile devices with native feel
- **Push Notifications**: Trip alerts and community updates

## 🛠️ Technology Stack

### Frontend
- **React 18** + **TypeScript** - Modern React with strict typing
- **Vite** - Fast build tool with optimized bundling
- **Tailwind CSS** - Utility-first styling with responsive design
- **Radix UI** - Accessible component primitives
- **Mapbox GL JS** - Interactive mapping and visualization
- **Tanstack Query** - Server state management and caching

### Backend  
- **FastAPI** - High-performance Python API framework
- **PostgreSQL** - Primary database via Supabase
- **Redis** - Caching and session management
- **WebSocket** - Real-time communication for PAM
- **Celery** - Background task processing

### AI & Voice
- **OpenAI GPT** - PAM conversation intelligence
- **Edge TTS** - Microsoft's cloud text-to-speech
- **Web Speech API** - Browser-native speech recognition
- **Multiple TTS Engines** - Fallback chain for reliability

### Infrastructure
- **Netlify** - Frontend hosting with automatic deployments
- **Render** - Backend hosting with Docker containers
- **Supabase** - Database, authentication, and real-time features
- **GitHub Actions** - CI/CD with automated testing and quality checks

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ ([install with nvm](https://github.com/nvm-sh/nvm))
  - The repository includes an `.nvmrc` file so `nvm use` will automatically select Node 18.
- **Python** 3.11+ (required for TTS dependencies)
- **Git** for version control

### 1. Clone and Install
```bash
# Clone the repository
git clone https://github.com/Thabonel/wheels-wins-landing-page.git
cd wheels-wins-landing-page

# Install frontend dependencies
npm install

# Set up Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r backend/requirements.txt
```

### 2. Environment Configuration
```bash
# Copy example environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Configure required variables in .env:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_TOKEN=your_mapbox_token

# Backend environment variables in backend/.env:
DATABASE_URL=your_postgresql_url
REDIS_URL=your_redis_url
OPENAI_API_KEY=your_openai_key
```

### 3. Start Development Servers
```bash
# Terminal 1: Frontend (http://localhost:8080)
npm run dev

# Terminal 2: Backend (http://localhost:8000)
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 3: TTS Setup (one-time)
python backend/setup_tts.py
```

### 4. Initialize TTS Services
```bash
# Run TTS setup for voice capabilities
cd backend
python setup_tts.py
```

## 🧪 Testing & Quality

### Frontend Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test src/__tests__/integration/

# Watch mode for development
npm run test:watch
```

### Backend Testing  
```bash
# Install test dependencies
pip install -r backend/requirements-test.txt

# Run Python tests
cd backend
pytest

# Run with coverage
pytest --cov=app --cov-report=html
```

### Code Quality
```bash
# Full quality check pipeline
npm run quality:check:full

# Individual checks
npm run lint          # ESLint code linting
npm run type-check    # TypeScript validation  
npm run format:check  # Prettier formatting
npm run test:coverage # Test coverage report
npm run e2e:ci        # End-to-end tests
```

## 📚 Documentation

### User Guides
- [Getting Started](docs/guides/user-guides/getting-started.md) - First-time user walkthrough
- [Trip Planning Guide](docs/features/travel-vehicles.md) - Complete trip planning tutorial
- [PAM Assistant Usage](docs/features/pam-ai-assistant.md) - AI assistant capabilities
- [Financial Management](docs/features/financial-management.md) - Expense tracking and budgeting

### Developer Documentation
- [Architecture Overview](docs/guides/development/architecture-overview.md) - System design and patterns
- [API Documentation](docs/technical/api-documentation.md) - Complete API reference
- [Adding Features](docs/guides/development/adding-new-features.md) - Development workflow
- [Deployment Guide](docs/deployment/production-deployment.md) - Production deployment

### Technical Guides
- [PWA Setup](docs/technical/pwa-configuration.md) - Progressive Web App features
- [TTS Configuration](docs/technical/tts-setup.md) - Voice synthesis setup
- [Mobile Optimization](docs/technical/mobile-responsiveness.md) - Mobile-first development
- [Integration Testing](docs/technical/testing-strategy.md) - Comprehensive testing approach

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mapbox Configuration  
VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token

# Optional APIs
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_OPEN_WEATHER_API_KEY=your_openweather_key
```

#### Backend (backend/.env)
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/wheels_wins
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cache & Sessions
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your_session_secret

# AI Services
OPENAI_API_KEY=your_openai_api_key

# TTS Configuration
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=edge
TTS_VOICE_DEFAULT=en-US-AriaNeural

# External APIs
MAPBOX_SECRET_TOKEN=sk.your_mapbox_secret_token
```

## 📊 Performance Metrics

### Bundle Optimization
- **Main Bundle**: 1.5-2MB (optimized from 4.38MB)
- **Code Splitting**: Strategic chunking by feature and vendor
- **Lazy Loading**: Admin dashboard and video editor
- **Tree Shaking**: Optimized imports for icons and utilities

### Test Coverage
- **Frontend**: 80%+ coverage requirement
- **Integration Tests**: 4 comprehensive test suites
- **E2E Tests**: Complete user workflow validation
- **Backend**: 85%+ API endpoint coverage

### Mobile Performance
- **Lighthouse Score**: 90+ for mobile
- **Responsive Design**: Mobile-first approach
- **Progressive Loading**: Optimized for slow connections
- **Offline Support**: Core features work offline

## 🚀 Deployment

### Automatic Deployment
- **Frontend**: Auto-deploys from `main` branch to Netlify
- **Backend**: Auto-deploys to Render with Docker
- **Database**: Managed by Supabase with automatic backups

### Manual Deployment
```bash
# Build for production
npm run build

# Deploy frontend
npm run deploy

# Deploy backend (Docker)
docker build -t wheels-wins-backend ./backend
docker run -p 10000:10000 wheels-wins-backend
```

## 🔒 Security Features

### Authentication & Authorization
- **Supabase Auth**: Secure user authentication and session management
- **JWT Tokens**: Stateless authentication with automatic refresh
- **Role-Based Access**: Admin, user, and guest permission levels
- **Password Security**: Secure reset and update workflows

### Data Protection
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries and ORM
- **XSS Protection**: Content sanitization and CSP headers
- **Rate Limiting**: API throttling and abuse prevention

### Privacy Compliance
- **GDPR Ready**: User data export and deletion capabilities
- **Cookie Management**: Transparent cookie usage and consent
- **Data Encryption**: Encrypted data in transit and at rest

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Test** your changes: `npm run quality:check:full`
4. **Commit** with conventional commits: `git commit -m 'feat: add amazing feature'`
5. **Push** to your branch: `git push origin feature/amazing-feature`
6. **Create** a Pull Request

### Code Standards
- **TypeScript**: Strict mode with comprehensive typing
- **ESLint**: Enforced code quality and security rules
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Structured commit messages
- **Test Coverage**: 80%+ coverage for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

### Documentation
- **User Guides**: [docs/guides/](docs/guides/)
- **API Reference**: [docs/technical/api-documentation.md](docs/technical/api-documentation.md)
- **Troubleshooting**: [docs/guides/troubleshooting/](docs/guides/troubleshooting/)

### Community
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Community support and ideas
- **Documentation**: Comprehensive guides and tutorials

### Contact
- **Project Maintainer**: [Thabonel](https://github.com/Thabonel)
- **Business Inquiries**: contact@wheelsandwins.com
- **Technical Support**: support@wheelsandwins.com

---

**Built with ❤️ for the RV and travel community**