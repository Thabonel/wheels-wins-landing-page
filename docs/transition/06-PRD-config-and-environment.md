# Phase 6 PRD: Configuration and Environment Abstraction

## Goal

Replace all Supabase-specific environment variables and configuration with generic, provider-neutral alternatives. Create a provider configuration factory that can initialize the correct database, auth, and storage backends based on environment settings. This enables migration away from Supabase or use of alternative providers without code changes.

## Current State

### Backend Environment Variables

The application currently has hardcoded Supabase-specific configuration in `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/config.py`:

**Supabase-Specific Settings (lines 301-320):**
- `SUPABASE_URL: AnyHttpUrl` (line 302) - Supabase project URL (required field)
- `SUPABASE_SERVICE_ROLE_KEY: SecretStr` (line 307) - Service role key for admin operations (required field)
- `VITE_SUPABASE_URL: Optional[AnyHttpUrl]` (line 312) - Frontend Supabase URL
- `VITE_SUPABASE_ANON_KEY: Optional[SecretStr]` (line 317) - Frontend anonymous key

**Validators (lines 590-609):**
- `construct_database_url` (line 591) - Derives DATABASE_URL from SUPABASE_URL
- `copy_supabase_url` (line 603) - Copies SUPABASE_URL to VITE_SUPABASE_URL

**Module Exports (lines 911-912):**
- `SUPABASE_URL = str(settings.SUPABASE_URL)`
- `SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY.get_secret_value()`

**Required Fields Validation (line 869, lines 941-942):**
- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in critical_fields set
- Checked in `validate_on_startup()` (lines 642-654)

**Generic Fields Already Present:**
- `DATABASE_URL: Optional[PostgresDsn]` (line 323) - Already generic PostgreSQL connection string
- `REDIS_URL: Optional[str]` (line 407) - Already generic Redis connection

### Database Client Initialization

Three files directly read Supabase settings:

**`/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/database.py` (lines 42-56):**
```python
url = getattr(settings, "SUPABASE_URL", None)
key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)
client = create_client(str(url), key)
```

**`/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/database.py` (lines 24-31):**
```python
supabase_url = str(settings.SUPABASE_URL)
service_key = settings.SUPABASE_SERVICE_ROLE_KEY.get_secret_value()
self.client = create_client(supabase_url, service_key)
```

### File Storage Implementation

**`/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/file_upload_service.py`** uses Supabase Storage directly:

- Line 66: `database_service.client.storage.from_('profiles').upload()`
- Line 83: `database_service.client.storage.from_('profiles').get_public_url()`
- Line 125: `database_service.client.storage.from_('profiles').remove()`

Storage operations assume Supabase client with `.storage` property.

### CSRF Token Storage

**In-memory storage** in FastAPI process (not shown in files, but documented):
- Dict-based session storage
- Not persisted across restarts
- Not shared across multiple backend instances
- Single point of failure

### Frontend Environment Variables

From `.env` files (not shown, but referenced in CLAUDE.md):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Anonymous key for client-side auth
- `VITE_API_URL` - Backend API URL (already generic)
- `VITE_PAM_WEBSOCKET_URL` - WebSocket URL (already generic)
- `VITE_MAPBOX_TOKEN` - Mapbox token (already generic)
- `VITE_GEMINI_API_KEY` - Gemini API key (already generic)

### Infrastructure

**Production:**
- Frontend: wheelsandwins.com (Netlify, main branch)
- Backend: pam-backend.onrender.com (Render)
- Database: Supabase PostgreSQL (shared)

**Staging:**
- Frontend: wheels-wins-staging.netlify.app (Netlify, staging branch)
- Backend: wheels-wins-backend-staging.onrender.com (Render)
- Database: Supabase PostgreSQL (shared)

**Critical Issue:** Both staging and production share one Supabase database - this is a risk.

### Redis Usage

**`/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/cache_service.py`:**
- Line 39: Reads `settings.REDIS_URL` or `REDIS_URL` env var
- Line 48: Creates `aioredis.from_url()` connection
- Already provider-agnostic (works with any Redis-compatible service)

**Current Usage:**
- User profile caching (line 262 in database.py)
- Trip data caching (line 343)
- Social data caching (lines 494, 539)
- Shop data caching (lines 685, 735)
- Context caching (lines 1089, 1160)
- NOT used for CSRF tokens (still in-memory)

## Target State

### Generic Environment Variables

**New Provider-Neutral Variables:**

| Current | New | Default | Notes |
|---------|-----|---------|-------|
| SUPABASE_URL | DB_PROVIDER_URL | None | Transition only - deprecated after migration |
| SUPABASE_SERVICE_ROLE_KEY | DB_SERVICE_KEY | None | Transition only - deprecated after migration |
| VITE_SUPABASE_URL | (removed) | N/A | Frontend talks to backend API only |
| VITE_SUPABASE_ANON_KEY | (removed) | N/A | Frontend talks to backend API only |
| DATABASE_URL | DATABASE_URL | None | Keep as-is (already generic) |
| (new) | AUTH_PROVIDER | supabase | Options: supabase, jwt, auth0 |
| (new) | AUTH_JWKS_URL | None | JWKS endpoint for JWT validation |
| (new) | STORAGE_PROVIDER | supabase | Options: supabase, s3, local |
| (new) | STORAGE_BUCKET_URL | None | Object storage URL (S3-compatible) |
| (new) | STORAGE_BUCKET_NAME | profiles | Storage bucket/container name |
| REDIS_URL | REDIS_URL | redis://localhost:6379 | Keep as-is (already generic) |

**Backward Compatibility:**
- Old SUPABASE_* variables still work during transition
- New variables take precedence if both are set
- Validators check for either old or new variables
- Deprecation warnings logged when old variables are used

### Provider Configuration Factory

**New File: `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/providers.py`**

```python
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class DatabaseProvider(str, Enum):
    POSTGRESQL = "postgresql"
    SUPABASE = "supabase"  # Uses PostgreSQL + Supabase client features

class AuthProvider(str, Enum):
    SUPABASE = "supabase"  # Supabase Auth
    JWT = "jwt"            # Generic JWT with JWKS
    AUTH0 = "auth0"        # Auth0

class StorageProvider(str, Enum):
    SUPABASE = "supabase"  # Supabase Storage
    S3 = "s3"              # Amazon S3 or S3-compatible
    LOCAL = "local"        # Local filesystem

class ProviderConfig(BaseModel):
    """Provider configuration for database, auth, and storage"""

    db_provider: DatabaseProvider = Field(default=DatabaseProvider.POSTGRESQL)
    auth_provider: AuthProvider = Field(default=AuthProvider.SUPABASE)
    storage_provider: StorageProvider = Field(default=StorageProvider.SUPABASE)

    # Database settings
    database_url: str = Field(default="")
    db_service_key: Optional[str] = Field(default=None)

    # Auth settings
    auth_jwks_url: Optional[str] = Field(default=None)
    auth_issuer: Optional[str] = Field(default=None)

    # Storage settings
    storage_bucket_url: Optional[str] = Field(default=None)
    storage_bucket_name: str = Field(default="profiles")
    storage_access_key: Optional[str] = Field(default=None)
    storage_secret_key: Optional[str] = Field(default=None)

    @classmethod
    def from_env(cls, settings) -> "ProviderConfig":
        """Create ProviderConfig from environment settings"""
        import os

        # Backward compatibility: check for old SUPABASE_* vars
        db_provider_url = getattr(settings, 'DB_PROVIDER_URL', None) or getattr(settings, 'SUPABASE_URL', None)
        db_service_key = getattr(settings, 'DB_SERVICE_KEY', None) or getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', None)

        if hasattr(db_service_key, 'get_secret_value'):
            db_service_key = db_service_key.get_secret_value()

        return cls(
            db_provider=DatabaseProvider(os.getenv("DB_PROVIDER", "postgresql")),
            auth_provider=AuthProvider(os.getenv("AUTH_PROVIDER", "supabase")),
            storage_provider=StorageProvider(os.getenv("STORAGE_PROVIDER", "supabase")),
            database_url=getattr(settings, 'DATABASE_URL', ""),
            db_service_key=db_service_key,
            auth_jwks_url=os.getenv("AUTH_JWKS_URL"),
            auth_issuer=os.getenv("AUTH_ISSUER"),
            storage_bucket_url=os.getenv("STORAGE_BUCKET_URL"),
            storage_bucket_name=os.getenv("STORAGE_BUCKET_NAME", "profiles"),
            storage_access_key=os.getenv("STORAGE_ACCESS_KEY"),
            storage_secret_key=os.getenv("STORAGE_SECRET_KEY")
        )
```

### Database Initialization Update

**Update `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/database.py`:**

Replace direct Supabase client creation (lines 41-58) with provider factory:

```python
from app.core.providers import ProviderConfig, DatabaseProvider

@lru_cache(maxsize=1)
def get_cached_supabase_client() -> Client:
    """Create a single shared database client with connection pooling"""
    try:
        provider_config = ProviderConfig.from_env(settings)

        if provider_config.db_provider == DatabaseProvider.SUPABASE:
            # Use Supabase client
            if not provider_config.db_service_key:
                logger.warning("Database settings not configured; using dummy client")
                return MockClient()

            client = create_client(str(provider_config.database_url), provider_config.db_service_key)
            logger.info("✅ Cached Supabase client created")
            return client

        elif provider_config.db_provider == DatabaseProvider.POSTGRESQL:
            # Use asyncpg directly (no Supabase features)
            logger.info("✅ PostgreSQL-only mode (no Supabase client)")
            return MockClient()  # Return minimal client for compatibility

        else:
            raise ValueError(f"Unsupported database provider: {provider_config.db_provider}")

    except Exception as e:
        logger.error(f"Failed to create cached database client: {str(e)}")
        return MockClient()
```

### Storage Abstraction

**New File: `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/storage_service.py`**

```python
from abc import ABC, abstractmethod
from typing import Optional
import os
import boto3
from app.core.providers import ProviderConfig, StorageProvider
from app.core.config import settings

class StorageBackend(ABC):
    """Abstract storage backend interface"""

    @abstractmethod
    async def upload(self, path: str, content: bytes, content_type: str) -> str:
        """Upload file and return public URL"""
        pass

    @abstractmethod
    async def delete(self, path: str) -> bool:
        """Delete file"""
        pass

    @abstractmethod
    async def get_public_url(self, path: str) -> str:
        """Get public URL for file"""
        pass

class SupabaseStorageBackend(StorageBackend):
    """Supabase Storage implementation"""

    def __init__(self, client, bucket_name: str):
        self.client = client
        self.bucket_name = bucket_name

    async def upload(self, path: str, content: bytes, content_type: str) -> str:
        response = self.client.storage.from_(self.bucket_name).upload(
            path, content, {'content-type': content_type, 'upsert': 'true'}
        )
        if response.error:
            raise Exception(f"Upload failed: {response.error.message}")
        return await self.get_public_url(path)

    async def delete(self, path: str) -> bool:
        response = self.client.storage.from_(self.bucket_name).remove([path])
        return not response.error

    async def get_public_url(self, path: str) -> str:
        return self.client.storage.from_(self.bucket_name).get_public_url(path)

class S3StorageBackend(StorageBackend):
    """S3-compatible storage implementation"""

    def __init__(self, bucket_url: str, bucket_name: str, access_key: str, secret_key: str):
        self.bucket_name = bucket_name
        self.s3_client = boto3.client(
            's3',
            endpoint_url=bucket_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key
        )

    async def upload(self, path: str, content: bytes, content_type: str) -> str:
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=path,
            Body=content,
            ContentType=content_type
        )
        return await self.get_public_url(path)

    async def delete(self, path: str) -> bool:
        self.s3_client.delete_object(Bucket=self.bucket_name, Key=path)
        return True

    async def get_public_url(self, path: str) -> str:
        # Generate presigned URL or construct public URL
        return f"{self.s3_client.meta.endpoint_url}/{self.bucket_name}/{path}"

class StorageService:
    """Provider-agnostic storage service"""

    def __init__(self):
        self.backend: Optional[StorageBackend] = None
        self._initialize_backend()

    def _initialize_backend(self):
        """Initialize storage backend based on provider config"""
        provider_config = ProviderConfig.from_env(settings)

        if provider_config.storage_provider == StorageProvider.SUPABASE:
            from app.services.database import database_service
            self.backend = SupabaseStorageBackend(
                database_service.client,
                provider_config.storage_bucket_name
            )

        elif provider_config.storage_provider == StorageProvider.S3:
            self.backend = S3StorageBackend(
                provider_config.storage_bucket_url,
                provider_config.storage_bucket_name,
                provider_config.storage_access_key,
                provider_config.storage_secret_key
            )

        else:
            raise ValueError(f"Unsupported storage provider: {provider_config.storage_provider}")

    async def upload_file(self, path: str, content: bytes, content_type: str) -> str:
        """Upload file to storage backend"""
        return await self.backend.upload(path, content, content_type)

    async def delete_file(self, path: str) -> bool:
        """Delete file from storage backend"""
        return await self.backend.delete(path)

    async def get_public_url(self, path: str) -> str:
        """Get public URL for file"""
        return await self.backend.get_public_url(path)

# Global instance
storage_service = StorageService()
```

**Update `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/file_upload_service.py`:**

Replace direct Supabase Storage calls (lines 62-89) with StorageService:

```python
from app.services.storage_service import storage_service

async def upload_profile_photo(user_id: str, file: UploadFile, field_type: str) -> str:
    # ... validation code ...

    # Upload using storage service (provider-agnostic)
    public_url = await storage_service.upload_file(
        storage_filename,
        file_content,
        file.content_type
    )

    logger.info(f"Successfully uploaded {field_type} for user {user_id}: {public_url}")
    return public_url
```

### CSRF Token Migration to Redis

**New File: `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/csrf_service.py`**

```python
from app.services.cache_service import get_cache
from app.core.logging import get_logger
from typing import Optional
import secrets

logger = get_logger(__name__)

class CSRFService:
    """Redis-backed CSRF token service"""

    async def create_token(self, session_id: str) -> str:
        """Create and store CSRF token"""
        token = secrets.token_urlsafe(32)
        cache = await get_cache()
        await cache.set(f"csrf:{session_id}", token, ttl=3600)  # 1 hour TTL
        return token

    async def validate_token(self, session_id: str, token: str) -> bool:
        """Validate CSRF token"""
        cache = await get_cache()
        stored_token = await cache.get(f"csrf:{session_id}")
        return stored_token == token

    async def delete_token(self, session_id: str):
        """Delete CSRF token"""
        cache = await get_cache()
        await cache.delete(f"csrf:{session_id}")

# Global instance
csrf_service = CSRFService()
```

### Configuration Updates

**Update `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/config.py`:**

1. Add new generic fields (after line 320):

```python
# Generic Provider Configuration (replaces Supabase-specific)
DB_PROVIDER: str = Field(default="postgresql", description="Database provider")
DB_PROVIDER_URL: Optional[AnyHttpUrl] = Field(default=None, description="Database provider URL")
DB_SERVICE_KEY: Optional[SecretStr] = Field(default=None, description="Database service key")

AUTH_PROVIDER: str = Field(default="supabase", description="Auth provider")
AUTH_JWKS_URL: Optional[AnyHttpUrl] = Field(default=None, description="JWKS endpoint for JWT validation")
AUTH_ISSUER: Optional[str] = Field(default=None, description="JWT issuer")

STORAGE_PROVIDER: str = Field(default="supabase", description="Storage provider")
STORAGE_BUCKET_URL: Optional[AnyHttpUrl] = Field(default=None, description="Storage bucket URL")
STORAGE_BUCKET_NAME: str = Field(default="profiles", description="Storage bucket name")
STORAGE_ACCESS_KEY: Optional[SecretStr] = Field(default=None, description="Storage access key")
STORAGE_SECRET_KEY: Optional[SecretStr] = Field(default=None, description="Storage secret key")
```

2. Add backward compatibility validators (after line 609):

```python
@field_validator("DB_PROVIDER_URL", mode="before")
@classmethod
def copy_supabase_url_to_db_provider(cls, v, info):
    """Copy SUPABASE_URL to DB_PROVIDER_URL if not set (backward compatibility)"""
    if not v and info.data and "SUPABASE_URL" in info.data:
        logger.warning("Using deprecated SUPABASE_URL, migrate to DB_PROVIDER_URL")
        return info.data["SUPABASE_URL"]
    return v

@field_validator("DB_SERVICE_KEY", mode="before")
@classmethod
def copy_supabase_key_to_db_service_key(cls, v, info):
    """Copy SUPABASE_SERVICE_ROLE_KEY to DB_SERVICE_KEY if not set"""
    if not v and info.data and "SUPABASE_SERVICE_ROLE_KEY" in info.data:
        logger.warning("Using deprecated SUPABASE_SERVICE_ROLE_KEY, migrate to DB_SERVICE_KEY")
        return info.data["SUPABASE_SERVICE_ROLE_KEY"]
    return v
```

3. Update startup validation (line 642):

```python
required_settings = {
    "ANTHROPIC_API_KEY": {
        "message": "Anthropic API key is required for PAM functionality",
        "validation": self._validate_anthropic_key
    },
    "DATABASE_URL": {
        "message": "Database URL is required",
        "validation": None
    }
}

# Check for either old or new DB provider settings
if not (getattr(self, 'DB_PROVIDER_URL', None) or getattr(self, 'SUPABASE_URL', None)):
    issues.append("DB_PROVIDER_URL or SUPABASE_URL: Database provider URL is required")

if not (getattr(self, 'DB_SERVICE_KEY', None) or getattr(self, 'SUPABASE_SERVICE_ROLE_KEY', None)):
    issues.append("DB_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY: Database service key is required")
```

4. Mark SUPABASE_* fields as deprecated (line 302):

```python
# DEPRECATED: Use DB_PROVIDER_URL and DB_SERVICE_KEY instead
SUPABASE_URL: AnyHttpUrl = Field(
    ...,
    description="DEPRECATED: Use DB_PROVIDER_URL instead"
)

SUPABASE_SERVICE_ROLE_KEY: SecretStr = Field(
    ...,
    description="DEPRECATED: Use DB_SERVICE_KEY instead"
)
```

### Environment File Updates

**`.env.example` updates:**

```bash
# Database Provider (postgresql, supabase)
DB_PROVIDER=postgresql
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# DEPRECATED - use DB_PROVIDER_URL instead
# SUPABASE_URL=https://project.supabase.co

# Auth Provider (supabase, jwt, auth0)
AUTH_PROVIDER=supabase
AUTH_JWKS_URL=https://your-domain.auth0.com/.well-known/jwks.json
AUTH_ISSUER=https://your-domain.auth0.com/

# Storage Provider (supabase, s3, local)
STORAGE_PROVIDER=supabase
STORAGE_BUCKET_URL=https://s3.amazonaws.com
STORAGE_BUCKET_NAME=profiles
STORAGE_ACCESS_KEY=your_access_key
STORAGE_SECRET_KEY=your_secret_key

# Redis (already generic)
REDIS_URL=redis://localhost:6379
```

**Frontend `.env` cleanup:**

Remove Supabase-specific variables (no longer needed, frontend talks to backend API only):
- Remove `VITE_SUPABASE_URL`
- Remove `VITE_SUPABASE_ANON_KEY`

Keep generic variables:
- `VITE_API_URL`
- `VITE_PAM_WEBSOCKET_URL`
- `VITE_MAPBOX_TOKEN`
- `VITE_GEMINI_API_KEY`

## Tasks

### 1. Create Provider Configuration Factory

**File:** `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/providers.py`

Create new file with:
- `DatabaseProvider`, `AuthProvider`, `StorageProvider` enums
- `ProviderConfig` Pydantic model
- `from_env()` class method with backward compatibility

**Acceptance:**
- File exists and imports successfully
- `ProviderConfig.from_env(settings)` returns valid config
- Works with both old SUPABASE_* and new generic vars

### 2. Add Generic Environment Variables

**File:** `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/config.py`

Add fields after line 320:
- `DB_PROVIDER`, `DB_PROVIDER_URL`, `DB_SERVICE_KEY`
- `AUTH_PROVIDER`, `AUTH_JWKS_URL`, `AUTH_ISSUER`
- `STORAGE_PROVIDER`, `STORAGE_BUCKET_URL`, `STORAGE_BUCKET_NAME`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`

**Acceptance:**
- Fields exist in Settings class
- Have proper types and defaults
- Include descriptions

### 3. Add Backward Compatibility Validators

**File:** `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/config.py`

Add validators after line 609:
- `copy_supabase_url_to_db_provider` - copies SUPABASE_URL to DB_PROVIDER_URL
- `copy_supabase_key_to_db_service_key` - copies SUPABASE_SERVICE_ROLE_KEY to DB_SERVICE_KEY
- Log deprecation warnings

**Acceptance:**
- Old SUPABASE_* vars still work
- Deprecation warnings logged
- New vars take precedence if both set

### 4. Update Startup Validation

**File:** `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/config.py`

Update `validate_on_startup()` method (line 633):
- Check for either old or new DB provider vars
- Remove SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from critical_fields
- Add logic to check for DB_PROVIDER_URL OR SUPABASE_URL

**Acceptance:**
- Startup succeeds with old vars
- Startup succeeds with new vars
- Startup fails if neither provided

### 5. Mark SUPABASE_* Fields as Deprecated

**File:** `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/config.py`

Update field descriptions (lines 302, 307):
- Add "DEPRECATED: Use DB_PROVIDER_URL instead" to SUPABASE_URL description
- Add "DEPRECATED: Use DB_SERVICE_KEY instead" to SUPABASE_SERVICE_ROLE_KEY description

**Acceptance:**
- Descriptions updated
- Fields still functional
- No breaking changes

### 6. Update Database Initialization

**File:** `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/database.py`

Update `get_cached_supabase_client()` function (lines 30-64):
- Import `ProviderConfig`
- Use `ProviderConfig.from_env(settings)` to get provider config
- Switch on `db_provider` enum
- Create appropriate client type

**Acceptance:**
- Function works with Supabase provider
- Function works with PostgreSQL-only provider
- Backward compatible with old code

### 7. Update DatabaseService Initialization

**File:** `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/database.py`

Update `_initialize_client()` method (lines 21-37):
- Import `ProviderConfig`
- Use `ProviderConfig.from_env(settings)` instead of direct settings access
- Use generic provider config fields

**Acceptance:**
- DatabaseService initializes successfully
- Works with both old and new config
- No errors on startup

### 8. Create Storage Abstraction

**File:** `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/storage_service.py`

Create new file with:
- `StorageBackend` abstract base class
- `SupabaseStorageBackend` implementation
- `S3StorageBackend` implementation
- `StorageService` factory

**Acceptance:**
- File exists and imports successfully
- `storage_service` singleton works
- Supabase storage backend functional
- S3 storage backend functional

### 9. Update File Upload Service

**File:** `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/file_upload_service.py`

Replace direct Supabase Storage calls (lines 62-89, 125):
- Import `storage_service`
- Replace `database_service.client.storage` with `storage_service`
- Update `upload_profile_photo()` function
- Update `delete_profile_photo()` function

**Acceptance:**
- File uploads work with Supabase storage
- File uploads work with S3 storage
- Public URLs returned correctly
- No breaking changes to API

### 10. Create CSRF Service with Redis Backend

**File:** `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/csrf_service.py`

Create new file with:
- `CSRFService` class
- `create_token()` method using Redis
- `validate_token()` method
- `delete_token()` method
- Global `csrf_service` instance

**Acceptance:**
- File exists and imports successfully
- CSRF tokens stored in Redis
- CSRF tokens validated correctly
- Tokens persist across backend restarts

### 11. Update CSRF Usage in Application

**Files:** Various (endpoints using CSRF tokens)

Replace in-memory CSRF storage with `csrf_service`:
- Import `csrf_service`
- Replace dict-based token storage
- Use Redis-backed methods

**Acceptance:**
- CSRF validation works
- Tokens shared across backend instances
- Tokens persist across restarts

### 12. Update .env.example Files

**Files:**
- `/Users/thabonel/Code/wheels-wins-landing-page/backend/.env.example`
- `/Users/thabonel/Code/wheels-wins-landing-page/.env.example`

Add new generic variables:
- DB_PROVIDER, DB_PROVIDER_URL, DB_SERVICE_KEY
- AUTH_PROVIDER, AUTH_JWKS_URL, AUTH_ISSUER
- STORAGE_PROVIDER, STORAGE_BUCKET_URL, STORAGE_BUCKET_NAME, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY

Mark old variables as deprecated:
- Add "# DEPRECATED" comments to SUPABASE_* vars

**Acceptance:**
- .env.example files updated
- Comments explain new variables
- Old variables marked deprecated
- Examples show both providers

### 13. Update Render Environment Variables (Staging)

**Platform:** Render Dashboard (wheels-wins-backend-staging.onrender.com)

Add new environment variables:
- `DB_PROVIDER=postgresql`
- `DB_PROVIDER_URL=<current SUPABASE_URL value>`
- `DB_SERVICE_KEY=<current SUPABASE_SERVICE_ROLE_KEY value>`
- `AUTH_PROVIDER=supabase`
- `STORAGE_PROVIDER=supabase`
- `STORAGE_BUCKET_NAME=profiles`

Keep old variables during transition:
- `SUPABASE_URL` (existing)
- `SUPABASE_SERVICE_ROLE_KEY` (existing)

**Acceptance:**
- Staging backend starts successfully
- No errors in logs
- Deprecation warnings visible
- All features functional

### 14. Update Render Environment Variables (Production)

**Platform:** Render Dashboard (pam-backend.onrender.com)

Add new environment variables:
- `DB_PROVIDER=postgresql`
- `DB_PROVIDER_URL=<current SUPABASE_URL value>`
- `DB_SERVICE_KEY=<current SUPABASE_SERVICE_ROLE_KEY value>`
- `AUTH_PROVIDER=supabase`
- `STORAGE_PROVIDER=supabase`
- `STORAGE_BUCKET_NAME=profiles`

Keep old variables during transition:
- `SUPABASE_URL` (existing)
- `SUPABASE_SERVICE_ROLE_KEY` (existing)

**Acceptance:**
- Production backend starts successfully
- No errors in logs
- Deprecation warnings visible
- All features functional

### 15. Remove Frontend VITE_SUPABASE_* Variables

**Files:**
- Netlify environment variables (both staging and production)
- Local `.env` files

Remove:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Acceptance:**
- Frontend builds successfully
- No errors about missing variables
- Frontend talks to backend API only
- No direct database access from frontend

### 16. Test End-to-End with New Variables

**Environment:** Local development

Set only new variables in `.env`:
- `DB_PROVIDER=postgresql`
- `DB_PROVIDER_URL=https://kycoklimpzkyrecbjecn.supabase.co`
- `AUTH_PROVIDER=supabase`
- `STORAGE_PROVIDER=supabase`
- Remove all `SUPABASE_*` variables

**Acceptance:**
- Backend starts without errors
- Database queries work
- File uploads work
- Auth works
- CSRF tokens work

### 17. Remove Old SUPABASE_* Fields (Final Migration)

**File:** `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/config.py`

Delete deprecated fields (after confirming all environments migrated):
- Remove `SUPABASE_URL` field (line 302)
- Remove `SUPABASE_SERVICE_ROLE_KEY` field (line 307)
- Remove `VITE_SUPABASE_URL` field (line 312)
- Remove `VITE_SUPABASE_ANON_KEY` field (line 317)
- Remove `copy_supabase_url` validator (line 603)
- Remove `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from module exports (lines 911-912)

**Acceptance:**
- Code builds successfully
- All tests pass
- No references to SUPABASE_* in application code
- Only provider implementations mention Supabase

### 18. Update Documentation

**Files:**
- `/Users/thabonel/Code/wheels-wins-landing-page/CLAUDE.md`
- `/Users/thabonel/Code/wheels-wins-landing-page/README.md`

Update environment variable documentation:
- Replace SUPABASE_* references with generic provider vars
- Add provider configuration examples
- Document migration path

**Acceptance:**
- Documentation accurate
- Examples use new variables
- Migration instructions clear

## Verification

### Backward Compatibility

**Test with old variables only:**
```bash
export SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
export DATABASE_URL=postgresql://...
```

**Expected:**
- Application starts successfully
- Deprecation warnings logged
- All features functional

### New Variables

**Test with new variables only:**
```bash
export DB_PROVIDER=postgresql
export DB_PROVIDER_URL=https://kycoklimpzkyrecbjecn.supabase.co
export DB_SERVICE_KEY=eyJhbGc...
export DATABASE_URL=postgresql://...
export AUTH_PROVIDER=supabase
export STORAGE_PROVIDER=supabase
```

**Expected:**
- Application starts successfully
- No deprecation warnings
- All features functional

### Mixed Configuration

**Test with both old and new variables:**
```bash
export SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
export DB_PROVIDER_URL=https://kycoklimpzkyrecbjecn.supabase.co
```

**Expected:**
- New variables take precedence
- Deprecation warning for old variables
- Application functional

### Provider Switching

**Test switching to S3 storage:**
```bash
export STORAGE_PROVIDER=s3
export STORAGE_BUCKET_URL=https://s3.amazonaws.com
export STORAGE_BUCKET_NAME=wheels-wins-profiles
export STORAGE_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
export STORAGE_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Expected:**
- File uploads use S3
- Public URLs use S3 URLs
- No errors

### CSRF Token Persistence

**Test Redis-backed CSRF tokens:**
1. Create CSRF token
2. Restart backend server
3. Validate CSRF token

**Expected:**
- Token validation succeeds after restart
- Tokens shared across multiple backend instances

### Configuration Validation

**Test missing required fields:**
```bash
# Remove all database config
unset SUPABASE_URL
unset DB_PROVIDER_URL
unset DATABASE_URL
```

**Expected:**
- Application startup fails
- Clear error message about missing config

### Feature Testing

**Test all major features:**
- User authentication
- File uploads (profile photos)
- Database queries (trips, expenses, social)
- CSRF protection
- Caching (Redis)
- PAM AI interactions

**Expected:**
- All features functional
- No Supabase-specific errors
- Provider abstraction transparent to users

## Rollback

### Immediate Rollback

**If issues occur after deployment:**

1. Set old SUPABASE_* environment variables in Render
2. Restart backend services
3. Application continues working (backward compatibility maintained)

**Rollback commands:**
```bash
# On Render dashboard, add back:
SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

### Code Rollback

**If code changes cause issues:**

1. Revert git commits (phase 6 changes)
2. Redeploy previous version
3. Remove new environment variables from Render

**Git commands:**
```bash
git revert <phase-6-commit-hash>
git push origin staging
```

### Partial Rollback

**Keep new code, use old variables:**

The backward compatibility ensures old SUPABASE_* variables continue working even with new code deployed. Simply don't set the new variables.

### Data Considerations

**No data migration needed:**
- Configuration changes only
- No database schema changes
- No data structure changes
- CSRF tokens stored in Redis (ephemeral, no data loss concern)

### Testing After Rollback

**Verify:**
- Application starts successfully
- All features functional
- No errors in logs
- User experience unaffected

## Dependencies

### Python Packages

**New dependencies needed:**
```
boto3==1.34.34  # For S3 storage backend
```

**Add to `/Users/thabonel/Code/wheels-wins-landing-page/backend/requirements.txt`**

### Existing Dependencies

**Already present:**
- `redis[hiredis]` - Redis client (already used for caching)
- `supabase` - Supabase client (already used)
- `asyncpg` - PostgreSQL async driver (already used)

### Environment Dependencies

**Required services:**
- Redis (already deployed)
- PostgreSQL database (already deployed)
- Object storage (Supabase Storage or S3)

## Risks and Mitigations

### Risk: Breaking Changes

**Mitigation:**
- Maintain backward compatibility with old variables
- Gradual migration (keep old variables during transition)
- Test thoroughly on staging before production

### Risk: Storage Migration Complexity

**Mitigation:**
- Start with Supabase storage backend (no migration needed)
- Implement S3 backend for future flexibility
- Document migration path for storage provider switching

### Risk: CSRF Token Migration

**Mitigation:**
- CSRF tokens are ephemeral (short TTL)
- Users may need to refresh/re-login (acceptable UX)
- Test Redis connectivity before deploying

### Risk: Configuration Confusion

**Mitigation:**
- Clear documentation of new variables
- Deprecation warnings for old variables
- `.env.example` files show both old and new

### Risk: Deployment Coordination

**Mitigation:**
- Deploy to staging first
- Test all features on staging
- Coordinate Render environment variable updates with deployments

## Success Metrics

### Code Quality

- Zero references to SUPABASE_* in application logic (only in provider implementations)
- All configuration through ProviderConfig factory
- Storage operations through StorageService abstraction

### Backward Compatibility

- Application works with old SUPABASE_* variables
- Application works with new generic variables
- Smooth migration path documented

### Flexibility

- Can switch storage provider without code changes (only env vars)
- Can switch auth provider without code changes (only env vars)
- Can use PostgreSQL without Supabase client

### Operational

- CSRF tokens persist across backend restarts
- CSRF tokens shared across multiple backend instances
- No increase in error rates after deployment

## Timeline Estimate

**Total: 2-3 days**

- Day 1: Tasks 1-9 (provider factory, config updates, storage abstraction)
- Day 2: Tasks 10-15 (CSRF service, environment updates)
- Day 3: Tasks 16-18 (testing, migration, documentation)

## Notes

- This is a **non-breaking change** - old configuration continues working
- **No database migrations required** - configuration changes only
- **No user-facing changes** - backend implementation detail
- **Foundation for future migration** - enables moving away from Supabase if needed
- **Redis already deployed** - no new infrastructure needed for CSRF tokens
- **Staging and production share database** - this is a risk that should be addressed separately

## References

- Current config: `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/config.py`
- Database init: `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/core/database.py`
- Database service: `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/database.py`
- File upload: `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/file_upload_service.py`
- Cache service: `/Users/thabonel/Code/wheels-wins-landing-page/backend/app/services/cache_service.py`
- CLAUDE.md: Project instructions and environment documentation
