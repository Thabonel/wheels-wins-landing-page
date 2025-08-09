"""
Patch for main.py to add import guards for problematic modules

This shows the minimal changes needed to prevent camping and youtube_scraper
from breaking PAM when they fail to import.
"""

# Add this import at the top of main.py after other imports:
from app.core.import_guard import safe_import_router

# Replace the problematic imports in the import section (lines 44-72):
# Instead of importing camping and youtube_scraper directly,
# remove them from the import list and load them separately

# After the import section, add:
# Safe import for modules that have caused issues
camping = safe_import_router("app.api.v1.camping", "router")
youtube_scraper = safe_import_router("app.api.v1.youtube_scraper", "router")

# Then modify the router registration section (around lines 530-531):
# Replace:
# app.include_router(camping.router, prefix="/api/v1", tags=["Camping Locations"])
# app.include_router(youtube_scraper.router, prefix="/api/v1/youtube", tags=["YouTube Scraper"])

# With:
if camping:
    app.include_router(camping, prefix="/api/v1", tags=["Camping Locations"])
else:
    logger.warning("⚠️ Camping module not available - skipping registration")

if youtube_scraper:
    app.include_router(youtube_scraper, prefix="/api/v1/youtube", tags=["YouTube Scraper"])
else:
    logger.warning("⚠️ YouTube scraper module not available - skipping registration")

# This minimal change ensures PAM continues to work even if these modules fail