"""
Image Services Module
Handles image fetching, processing, and management for trip templates and locations
"""

from .image_service import ImageService
from .wikipedia_scraper import WikipediaScraper, fetch_national_parks_for_country

__all__ = [
    'ImageService',
    'WikipediaScraper',
    'fetch_national_parks_for_country'
]