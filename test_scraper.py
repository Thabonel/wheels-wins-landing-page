#!/usr/bin/env python3
import asyncio
from scraper_service.main import scheduled_job

if __name__ == "__main__":
    asyncio.run(scheduled_job())
