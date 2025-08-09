"""
Database session configuration
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.infra_config import infra_settings

# Use Supabase DATABASE_URL if available, otherwise construct from components
database_url = infra_settings.DATABASE_URL
if not database_url and infra_settings.POSTGRES_HOST:
    database_url = f"postgresql://{infra_settings.POSTGRES_USER}:{infra_settings.POSTGRES_PASSWORD}@{infra_settings.POSTGRES_HOST}:{infra_settings.POSTGRES_PORT}/{infra_settings.POSTGRES_DB}"

engine = create_engine(
    database_url or "sqlite:///./test.db",  # Fallback to SQLite for testing
    pool_pre_ping=True,
    pool_size=infra_settings.DATABASE_POOL_SIZE,
    max_overflow=infra_settings.DATABASE_MAX_OVERFLOW
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)