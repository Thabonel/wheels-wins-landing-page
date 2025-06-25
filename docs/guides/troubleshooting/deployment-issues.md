
# Deployment Issues & Solutions

## PAM Backend Deployment Problems

### Python Version Compatibility Issues

#### Problem
Render.com using Python 3.13.4 causing Pydantic compilation failures:
- `pydantic-core` won't compile on read-only filesystem
- `runtime.txt` not being respected by Render

#### Solutions

**Option 1: Force Python Version in Build Command**
```bash
# Update Build Command in Render dashboard:
python3.11 -m pip install --upgrade pip && python3.11 -m pip install -r requirements.txt
```

**Option 2: Use Compatible Package Versions**
```txt
# Update requirements.txt:
pydantic==2.3.0
pydantic-settings==2.0.3
fastapi==0.104.1
```

**Option 3: Docker Deployment**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 10000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]
```

### Build Failures

#### Common Causes
1. Missing environment variables
2. Dependency conflicts
3. Python version mismatches
4. Read-only filesystem restrictions

#### Debug Steps
```bash
# 1. Check build logs in Render dashboard
# 2. Verify environment variables are set
# 3. Test locally first:
cd pam-backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# 4. Force rebuild:
echo " " >> requirements.txt
git add requirements.txt
git commit -m "Force rebuild"
git push origin main
```

### Service Not Responding

#### Verification Steps
```bash
# Test health endpoints:
curl https://pam-backend.onrender.com/api/health
curl https://pam-backend.onrender.com/api/health/detailed

# Check service logs in Render dashboard
# Verify environment variables are loaded
```

#### Common Fixes
1. Check service is not in sleep mode (free tier)
2. Verify all required environment variables are set
3. Check CORS configuration allows frontend domain
4. Review startup logs for errors

### Alternative Hosting Options

If Render continues to have issues:

1. **Railway**
2. **Fly.io**
3. **Google Cloud Run**
4. **AWS Lambda with Mangum**
5. **Heroku** (if pricing acceptable)

## Prevention Tips

1. Always test locally before deploying
2. Use exact dependency versions
3. Set up monitoring/health checks
4. Keep deployment documentation updated
5. Have rollback plan ready

## Emergency Rollback

```bash
# If deployment breaks production:
git log --oneline -10  # Find last working commit
git reset --hard <commit-hash>
git push --force-with-lease origin main
```

## Monitoring Setup

```python
# Add to main.py for better debugging:
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
```
