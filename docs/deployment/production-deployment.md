# Production Deployment Guide

This document explains how to deploy Wheels & Wins to a production environment.

## Prerequisites
- Docker installed on the target server
- Access to environment variables and secrets
- Domain name configured to point to the server

## Steps
1. **Clone the repository** on the production host:
   ```bash
   git clone https://github.com/your-org/wheels-wins-landing-page.git
   cd wheels-wins-landing-page
   ```
2. **Create a `.env.production` file** with the necessary variables (see [environment-variables](environment-variables.md)).
3. **Build and start the containers** using the provided compose file:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```
4. **Verify** the service is running by visiting `https://your-domain.com/health`.
5. **Monitor** logs with:
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

This basic workflow can be adapted to other hosts such as Render or Railway. For advanced configuration, consult `backend/docs/DEPLOYMENT_GUIDE.md`.
