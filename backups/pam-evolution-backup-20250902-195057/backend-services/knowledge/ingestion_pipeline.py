"""
Knowledge Ingestion Pipeline
Orchestrates continuous real-time data ingestion from multiple sources
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Tuple, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
import json

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from .vector_store import VectorKnowledgeBase, DocumentChunk
from .document_processor import DocumentProcessor
from ..scraping.enhanced_scraper import EnhancedScrapingService
from ..scraping.api_integrations import APIIntegrationService
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

@dataclass
class IngestionJob:
    """Represents a scheduled ingestion job"""
    name: str
    function: Callable
    trigger: str  # 'interval' or 'cron'
    trigger_params: Dict[str, Any]
    priority: int = 1  # 1=high, 2=medium, 3=low
    enabled: bool = True
    last_run: Optional[datetime] = None
    last_result: Optional[Dict[str, Any]] = None
    failure_count: int = 0
    max_failures: int = 3

@dataclass
class IngestionStats:
    """Statistics for ingestion operations"""
    total_jobs: int
    active_jobs: int
    successful_runs: int
    failed_runs: int
    total_documents_ingested: int
    last_ingestion: Optional[datetime]
    system_health: str

class KnowledgeIngestionPipeline:
    """Main pipeline for continuous knowledge ingestion"""
    
    def __init__(
        self, 
        vector_store: VectorKnowledgeBase,
        scraper: EnhancedScrapingService,
        api_service: APIIntegrationService
    ):
        self.vector_store = vector_store
        self.scraper = scraper
        self.api_service = api_service
        self.document_processor = DocumentProcessor(vector_store)
        
        # Scheduler for background jobs
        self.scheduler = AsyncIOScheduler()
        
        # Job management
        self.jobs: Dict[str, IngestionJob] = {}
        self.stats = IngestionStats(
            total_jobs=0,
            active_jobs=0,
            successful_runs=0,
            failed_runs=0,
            total_documents_ingested=0,
            last_ingestion=None,
            system_health="unknown"
        )
        
        # Active user locations for location-based ingestion
        self.active_user_locations: Dict[str, Tuple[float, float]] = {}
        
        # Initialize default jobs
        self._initialize_default_jobs()
    
    def _initialize_default_jobs(self):
        """Initialize default ingestion jobs"""
        
        # General knowledge ingestion (daily)
        self.add_job(
            name="general_knowledge_sync",
            function=self._ingest_general_knowledge,
            trigger="cron",
            trigger_params={"hour": 2, "minute": 0},  # 2 AM daily
            priority=3
        )
        
        # Travel information sync (twice daily)
        self.add_job(
            name="travel_info_sync",
            function=self._ingest_travel_information,
            trigger="interval",
            trigger_params={"hours": 12},
            priority=2
        )
        
        # Real-time data sync (every 2 hours) - Reduced from 15 minutes to save CPU
        self.add_job(
            name="realtime_data_sync",
            function=self._ingest_realtime_data,
            trigger="interval",
            trigger_params={"hours": 2},
            priority=2
        )
        
        # Location-based data sync (every 4 hours) - Reduced from 30 minutes to save CPU
        self.add_job(
            name="location_data_sync",
            function=self._ingest_location_data,
            trigger="interval",
            trigger_params={"hours": 4},
            priority=2
        )
        
        # Cleanup old data (daily)
        self.add_job(
            name="cleanup_old_data",
            function=self._cleanup_old_data,
            trigger="cron",
            trigger_params={"hour": 3, "minute": 0},  # 3 AM daily
            priority=3
        )
        
        # Health check (every 4 hours) - Reduced from 1 hour to save CPU
        self.add_job(
            name="system_health_check",
            function=self._system_health_check,
            trigger="interval",
            trigger_params={"hours": 4},
            priority=3
        )
    
    def add_job(
        self, 
        name: str, 
        function: Callable, 
        trigger: str,
        trigger_params: Dict[str, Any],
        priority: int = 2,
        enabled: bool = True
    ):
        """Add a new ingestion job"""
        
        job = IngestionJob(
            name=name,
            function=function,
            trigger=trigger,
            trigger_params=trigger_params,
            priority=priority,
            enabled=enabled
        )
        
        self.jobs[name] = job
        
        if enabled and not self.scheduler.running:
            # Job will be scheduled when pipeline starts
            logger.info(f"📝 Registered job: {name}")
        elif enabled and self.scheduler.running:
            # Schedule immediately if scheduler is running
            self._schedule_job(job)
    
    def _schedule_job(self, job: IngestionJob):
        """Schedule a job with the scheduler"""
        
        try:
            # Create trigger
            if job.trigger == "interval":
                trigger = IntervalTrigger(**job.trigger_params)
            elif job.trigger == "cron":
                trigger = CronTrigger(**job.trigger_params)
            else:
                raise ValueError(f"Unknown trigger type: {job.trigger}")
            
            # Schedule job with error handling wrapper
            self.scheduler.add_job(
                func=self._job_wrapper,
                trigger=trigger,
                args=[job],
                id=job.name,
                name=job.name,
                max_instances=1,
                coalesce=True,
                replace_existing=True
            )
            
            logger.info(f"⏰ Scheduled job: {job.name}")
            
        except Exception as e:
            logger.error(f"❌ Failed to schedule job {job.name}: {e}")
    
    async def _job_wrapper(self, job: IngestionJob):
        """Wrapper for job execution with error handling and statistics"""
        
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"🚀 Starting ingestion job: {job.name}")
            
            # Execute the job function
            result = await job.function()
            
            # Update job status
            job.last_run = start_time
            job.last_result = result
            job.failure_count = 0
            
            # Update statistics
            self.stats.successful_runs += 1
            self.stats.last_ingestion = start_time
            
            if isinstance(result, dict) and 'documents_added' in result:
                self.stats.total_documents_ingested += result['documents_added']
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"✅ Completed job {job.name} in {execution_time:.2f}s")
            
        except Exception as e:
            # Update failure tracking
            job.failure_count += 1
            job.last_result = {"error": str(e), "failed_at": start_time.isoformat()}
            
            self.stats.failed_runs += 1
            
            logger.error(f"❌ Job {job.name} failed (attempt {job.failure_count}): {e}")
            
            # Disable job if it fails too many times
            if job.failure_count >= job.max_failures:
                job.enabled = False
                self.scheduler.remove_job(job.name)
                logger.error(f"🚫 Disabled job {job.name} due to repeated failures")
    
    async def start_continuous_ingestion(self):
        """Start the continuous ingestion pipeline"""
        
        try:
            # Initialize vector store
            await self.vector_store.initialize_collections()
            
            # Schedule all enabled jobs
            for job in self.jobs.values():
                if job.enabled:
                    self._schedule_job(job)
            
            # Start scheduler
            self.scheduler.start()
            
            # Update statistics
            self.stats.total_jobs = len(self.jobs)
            self.stats.active_jobs = len([j for j in self.jobs.values() if j.enabled])
            self.stats.system_health = "running"
            
            logger.info(f"🚀 Knowledge ingestion pipeline started with {self.stats.active_jobs} active jobs")
            
        except Exception as e:
            self.stats.system_health = "error"
            logger.error(f"❌ Failed to start ingestion pipeline: {e}")
            raise
    
    async def stop_ingestion(self):
        """Stop the ingestion pipeline"""
        
        try:
            if self.scheduler.running:
                self.scheduler.shutdown(wait=True)
            
            # Close API connections
            await self.scraper.close()
            await self.api_service.close()
            await self.document_processor.close()
            
            self.stats.system_health = "stopped"
            logger.info("🛑 Knowledge ingestion pipeline stopped")
            
        except Exception as e:
            logger.error(f"❌ Error stopping ingestion pipeline: {e}")
    
    def add_user_location(self, user_id: str, location: Tuple[float, float]):
        """Add a user location for location-based ingestion"""
        self.active_user_locations[user_id] = location
        logger.info(f"📍 Added user location for {user_id}: {location}")
    
    def remove_user_location(self, user_id: str):
        """Remove a user location"""
        if user_id in self.active_user_locations:
            del self.active_user_locations[user_id]
            logger.info(f"📍 Removed user location for {user_id}")
    
    async def _ingest_general_knowledge(self) -> Dict[str, Any]:
        """Ingest general travel and camping knowledge from various sources"""
        
        knowledge_sources = [
            "https://en.wikipedia.org/wiki/Road_trip",
            "https://en.wikipedia.org/wiki/Camping",
            "https://en.wikipedia.org/wiki/Recreational_vehicle",
            "https://en.wikipedia.org/wiki/Travel_trailer",
            "https://en.wikipedia.org/wiki/Caravan_(towed_trailer)"
        ]
        
        documents_added = 0
        
        try:
            # Process URLs in batches
            results = await self.document_processor.batch_process_urls(
                knowledge_sources,
                content_type="travel_knowledge",
                max_concurrent=2
            )
            
            for url, chunk_ids in results.items():
                documents_added += len(chunk_ids)
            
            logger.info(f"📚 Ingested general knowledge: {documents_added} document chunks")
            
            return {
                "status": "success",
                "documents_added": documents_added,
                "sources_processed": len(results),
                "sources": list(results.keys())
            }
            
        except Exception as e:
            logger.error(f"❌ General knowledge ingestion failed: {e}")
            return {"status": "error", "error": str(e), "documents_added": 0}
    
    async def _ingest_travel_information(self) -> Dict[str, Any]:
        """Ingest travel guides and destination information"""
        
        travel_sources = [
            "https://www.nps.gov/index.htm",  # National Parks
            "https://www.recreation.gov/camping",  # Camping information
        ]
        
        documents_added = 0
        
        try:
            results = await self.document_processor.batch_process_urls(
                travel_sources,
                content_type="travel_guides",
                max_concurrent=1
            )
            
            for url, chunk_ids in results.items():
                documents_added += len(chunk_ids)
            
            logger.info(f"🗺️ Ingested travel information: {documents_added} document chunks")
            
            return {
                "status": "success",
                "documents_added": documents_added,
                "sources_processed": len(results)
            }
            
        except Exception as e:
            logger.error(f"❌ Travel information ingestion failed: {e}")
            return {"status": "error", "error": str(e), "documents_added": 0}
    
    async def _ingest_realtime_data(self) -> Dict[str, Any]:
        """Ingest real-time data like weather, traffic, etc."""
        
        documents_added = 0
        locations_processed = 0
        
        try:
            # Process active user locations
            for user_id, location in self.active_user_locations.items():
                try:
                    # Get weather data
                    weather_data = await self.api_service.weather_api.get_current_weather(location)
                    
                    if weather_data:
                        # Store weather data
                        weather_chunk = DocumentChunk(
                            content=f"Current weather in {weather_data.get('location_name', 'Unknown')}: "
                                   f"{weather_data['description']}, {weather_data['temperature']}°C, "
                                   f"humidity {weather_data['humidity']}%, wind {weather_data['wind_speed']} m/s",
                            metadata={
                                **weather_data,
                                "data_type": "real_time_weather",
                                "user_id": user_id,
                                "ingestion_source": "pipeline_realtime"
                            },
                            source="weather_api_pipeline",
                            created_at=datetime.utcnow()
                        )
                        
                        chunk_ids = await self.vector_store.add_documents("real_time_data", [weather_chunk])
                        documents_added += len(chunk_ids)
                    
                    locations_processed += 1
                    
                    # Rate limiting
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to process real-time data for {user_id}: {e}")
                    continue
            
            logger.info(f"🌡️ Ingested real-time data: {documents_added} documents for {locations_processed} locations")
            
            return {
                "status": "success",
                "documents_added": documents_added,
                "locations_processed": locations_processed
            }
            
        except Exception as e:
            logger.error(f"❌ Real-time data ingestion failed: {e}")
            return {"status": "error", "error": str(e), "documents_added": 0}
    
    async def _ingest_location_data(self) -> Dict[str, Any]:
        """Ingest location-specific business and attraction data"""
        
        documents_added = 0
        locations_processed = 0
        
        try:
            # Process active user locations
            for user_id, location in list(self.active_user_locations.items())[:5]:  # Limit to 5 locations
                try:
                    # Get comprehensive local data
                    recommendations = await self.api_service.get_local_recommendations(
                        location, 
                        preferences={"price_level": 3},  # Default preferences
                        radius_km=10.0
                    )
                    
                    # Count documents added
                    for category, data in recommendations.items():
                        if isinstance(data, list):
                            documents_added += len(data)
                        elif data:  # Single item like weather
                            documents_added += 1
                    
                    locations_processed += 1
                    
                    # Rate limiting between locations
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to process location data for {user_id}: {e}")
                    continue
            
            logger.info(f"📍 Ingested location data: {documents_added} documents for {locations_processed} locations")
            
            return {
                "status": "success",
                "documents_added": documents_added,
                "locations_processed": locations_processed
            }
            
        except Exception as e:
            logger.error(f"❌ Location data ingestion failed: {e}")
            return {"status": "error", "error": str(e), "documents_added": 0}
    
    async def _cleanup_old_data(self) -> Dict[str, Any]:
        """Clean up old data from vector store"""
        
        try:
            # Clean up real-time data older than 1 day
            await self.vector_store.cleanup_old_data(days_old=1)
            
            # Clean up general cache
            current_cache_size = len(self.scraper.cache)
            
            # Remove cache entries older than 4 hours
            cutoff_time = datetime.utcnow() - timedelta(hours=4)
            old_keys = [
                key for key, entry in self.scraper.cache.items()
                if entry['timestamp'] < cutoff_time
            ]
            
            for key in old_keys:
                del self.scraper.cache[key]
            
            cleaned_items = len(old_keys)
            
            logger.info(f"🧹 Cleanup completed: removed {cleaned_items} cached items")
            
            return {
                "status": "success",
                "cleaned_cache_items": cleaned_items,
                "current_cache_size": current_cache_size - cleaned_items
            }
            
        except Exception as e:
            logger.error(f"❌ Cleanup failed: {e}")
            return {"status": "error", "error": str(e)}
    
    async def _system_health_check(self) -> Dict[str, Any]:
        """Perform system health check"""
        
        try:
            # Check vector store health
            vector_health = await self.vector_store.health_check()
            
            # Check API service health
            api_health = await self.api_service.health_check()
            
            # Check scraper health
            scraper_health = await self.scraper.health_check()
            
            # Determine overall health
            all_healthy = (
                vector_health.get("status") == "healthy" and
                api_health.get("overall_status") == "healthy" and
                scraper_health.get("status") == "healthy"
            )
            
            overall_status = "healthy" if all_healthy else "degraded"
            self.stats.system_health = overall_status
            
            logger.info(f"💊 System health check completed: {overall_status}")
            
            return {
                "status": "success",
                "overall_health": overall_status,
                "vector_store": vector_health,
                "api_service": api_health,
                "scraper": scraper_health,
                "pipeline_stats": self.get_statistics()
            }
            
        except Exception as e:
            self.stats.system_health = "unhealthy"
            logger.error(f"❌ Health check failed: {e}")
            return {"status": "error", "error": str(e)}
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get current pipeline statistics"""
        
        # Update active job count
        self.stats.active_jobs = len([j for j in self.jobs.values() if j.enabled])
        
        return {
            "total_jobs": self.stats.total_jobs,
            "active_jobs": self.stats.active_jobs,
            "successful_runs": self.stats.successful_runs,
            "failed_runs": self.stats.failed_runs,
            "total_documents_ingested": self.stats.total_documents_ingested,
            "last_ingestion": self.stats.last_ingestion.isoformat() if self.stats.last_ingestion else None,
            "system_health": self.stats.system_health,
            "active_user_locations": len(self.active_user_locations),
            "scheduler_running": self.scheduler.running if hasattr(self.scheduler, 'running') else False
        }
    
    def get_job_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all jobs"""
        
        job_status = {}
        
        for name, job in self.jobs.items():
            job_status[name] = {
                "enabled": job.enabled,
                "priority": job.priority,
                "last_run": job.last_run.isoformat() if job.last_run else None,
                "last_result": job.last_result,
                "failure_count": job.failure_count,
                "max_failures": job.max_failures,
                "trigger": job.trigger,
                "trigger_params": job.trigger_params
            }
        
        return job_status
    
    async def manual_trigger_job(self, job_name: str) -> Dict[str, Any]:
        """Manually trigger a specific job"""
        
        if job_name not in self.jobs:
            return {"status": "error", "error": f"Job {job_name} not found"}
        
        job = self.jobs[job_name]
        
        try:
            logger.info(f"🔧 Manually triggering job: {job_name}")
            result = await self._job_wrapper(job)
            
            return {
                "status": "success",
                "job_name": job_name,
                "result": job.last_result
            }
            
        except Exception as e:
            logger.error(f"❌ Manual job trigger failed for {job_name}: {e}")
            return {"status": "error", "job_name": job_name, "error": str(e)}