"""
Database State Management for Data Collector
Replaces file-based progress tracking with robust Supabase integration
"""

import json
import logging
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from uuid import uuid4
from supabase import Client
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


class DatabaseStateManager:
    """Manages collector state in Supabase instead of files"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.run_id = None
        self.state = None
        
    async def initialize(self) -> Dict:
        """Initialize or load existing collector state"""
        try:
            # Get the latest state record
            result = self.supabase.table('data_collector_state')\
                .select('*')\
                .eq('is_active', True)\
                .order('created_at', desc=False)\
                .limit(1)\
                .execute()
            
            if result.data and len(result.data) > 0:
                self.state = result.data[0]
                logger.info(f"Loaded existing state: {self.state['total_collected']} items collected")
            else:
                # Create initial state
                self.state = await self.create_initial_state()
                logger.info("Created new collector state")
            
            return self.state
            
        except Exception as e:
            logger.error(f"Failed to initialize state: {e}")
            raise
    
    async def create_initial_state(self) -> Dict:
        """Create initial collector state"""
        initial_state = {
            'next_priority': 'camping',
            'total_collected': 0,
            'active_sources': ['recreation_gov', 'openstreetmap', 'ioverlander'],
            'collection_config': {
                'target_per_run': 500,
                'run_frequency': 'weekly',
                'enable_ai_enhancement': False,
                'enable_deduplication': True,
                'quality_threshold': 0.3
            },
            'error_count': 0,
            'is_active': True
        }
        
        result = self.supabase.table('data_collector_state')\
            .insert(initial_state)\
            .execute()
        
        return result.data[0]
    
    async def start_run(self, run_type: str = 'scheduled', target_count: int = 500) -> str:
        """Start a new collection run"""
        try:
            run_data = {
                'run_type': run_type,
                'status': 'running',
                'started_at': datetime.now().isoformat(),
                'target_count': target_count,
                'sources_attempted': []
            }
            
            result = self.supabase.table('data_collector_runs')\
                .insert(run_data)\
                .execute()
            
            self.run_id = result.data[0]['id']
            
            # Update state with last run time
            self.supabase.table('data_collector_state')\
                .update({'last_run': datetime.now().isoformat()})\
                .eq('id', self.state['id'])\
                .execute()
            
            logger.info(f"Started collection run: {self.run_id}")
            return self.run_id
            
        except Exception as e:
            logger.error(f"Failed to start run: {e}")
            raise
    
    async def complete_run(self, actual_count: int, sources_succeeded: List[str]):
        """Complete a collection run"""
        try:
            if not self.run_id:
                logger.warning("No active run to complete")
                return
            
            update_data = {
                'status': 'completed',
                'completed_at': datetime.now().isoformat(),
                'actual_count': actual_count,
                'sources_succeeded': sources_succeeded
            }
            
            self.supabase.table('data_collector_runs')\
                .update(update_data)\
                .eq('id', self.run_id)\
                .execute()
            
            # Update total collected in state
            new_total = self.state['total_collected'] + actual_count
            self.supabase.table('data_collector_state')\
                .update({'total_collected': new_total})\
                .eq('id', self.state['id'])\
                .execute()
            
            self.state['total_collected'] = new_total
            
            logger.info(f"Completed run {self.run_id}: {actual_count} items collected")
            
        except Exception as e:
            logger.error(f"Failed to complete run: {e}")
    
    async def fail_run(self, error_message: str):
        """Mark a run as failed"""
        try:
            if not self.run_id:
                return
            
            update_data = {
                'status': 'failed',
                'completed_at': datetime.now().isoformat(),
                'error_summary': error_message
            }
            
            self.supabase.table('data_collector_runs')\
                .update(update_data)\
                .eq('id', self.run_id)\
                .execute()
            
            # Increment error count
            new_error_count = self.state['error_count'] + 1
            self.supabase.table('data_collector_state')\
                .update({'error_count': new_error_count})\
                .eq('id', self.state['id'])\
                .execute()
            
            logger.error(f"Failed run {self.run_id}: {error_message}")
            
        except Exception as e:
            logger.error(f"Failed to mark run as failed: {e}")
    
    async def record_metric(
        self,
        source: str,
        items_collected: int,
        duration: float,
        errors: List[str] = None,
        quality_scores: List[float] = None
    ):
        """Record metrics for a source collection"""
        try:
            metric_data = {
                'run_id': self.run_id,
                'run_date': datetime.now().isoformat(),
                'source': source,
                'items_collected': items_collected,
                'items_failed': len(errors) if errors else 0,
                'duration_seconds': duration,
                'error_messages': errors or [],
                'quality_scores': quality_scores or []
            }
            
            self.supabase.table('data_collector_metrics')\
                .insert(metric_data)\
                .execute()
            
            logger.info(f"Recorded metrics for {source}: {items_collected} items in {duration:.1f}s")
            
        except Exception as e:
            logger.error(f"Failed to record metrics: {e}")
    
    async def get_active_sources(self) -> List[Dict]:
        """Get list of active collection sources"""
        try:
            result = self.supabase.table('data_collector_sources')\
                .select('*')\
                .eq('is_active', True)\
                .order('priority', desc=True)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get active sources: {e}")
            return []
    
    async def update_source_stats(self, source_name: str, items_collected: int):
        """Update source statistics after collection"""
        try:
            # Get current source data
            result = self.supabase.table('data_collector_sources')\
                .select('total_collected')\
                .eq('name', source_name)\
                .single()\
                .execute()
            
            if result.data:
                new_total = result.data['total_collected'] + items_collected
                
                self.supabase.table('data_collector_sources')\
                    .update({
                        'total_collected': new_total,
                        'last_collected_at': datetime.now().isoformat()
                    })\
                    .eq('name', source_name)\
                    .execute()
                
                logger.info(f"Updated {source_name} stats: {new_total} total collected")
                
        except Exception as e:
            logger.error(f"Failed to update source stats: {e}")
    
    async def check_location_exists(self, latitude: float, longitude: float) -> bool:
        """Check if a location already exists (for deduplication)"""
        try:
            # Round coordinates for fuzzy matching
            lat_rounded = round(latitude, 4)
            lng_rounded = round(longitude, 4)
            
            # Check within a small radius (approximately 11 meters)
            result = self.supabase.table('trip_locations')\
                .select('id')\
                .gte('latitude', lat_rounded - 0.0001)\
                .lte('latitude', lat_rounded + 0.0001)\
                .gte('longitude', lng_rounded - 0.0001)\
                .lte('longitude', lng_rounded + 0.0001)\
                .limit(1)\
                .execute()
            
            return len(result.data) > 0 if result.data else False
            
        except Exception as e:
            logger.error(f"Failed to check location existence: {e}")
            return False
    
    async def insert_location(self, location_data: Dict) -> Optional[str]:
        """Insert a new location with deduplication check"""
        try:
            # Check if location exists
            if await self.check_location_exists(
                location_data['latitude'],
                location_data['longitude']
            ):
                logger.debug(f"Location already exists: {location_data.get('name')}")
                return None
            
            # Generate location hash
            lat_rounded = round(location_data['latitude'], 4)
            lng_rounded = round(location_data['longitude'], 4)
            location_hash = hashlib.md5(f"{lat_rounded},{lng_rounded}".encode()).hexdigest()
            
            # Prepare location record
            location_record = {
                'name': location_data.get('name', 'Unnamed Location'),
                'latitude': location_data['latitude'],
                'longitude': location_data['longitude'],
                'location_hash': location_hash,
                'country': location_data.get('country'),
                'state_province': location_data.get('state_province'),
                'data_sources': [location_data.get('data_source', 'unknown')],
                'quality_score': location_data.get('quality_score', 0.0),
                'verified': False
            }
            
            result = self.supabase.table('trip_locations')\
                .insert(location_record)\
                .execute()
            
            if result.data:
                return result.data[0]['id']
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to insert location: {e}")
            return None
    
    async def batch_insert_locations(self, locations: List[Dict]) -> int:
        """Batch insert locations with deduplication"""
        inserted_count = 0
        
        for location in locations:
            location_id = await self.insert_location(location)
            if location_id:
                inserted_count += 1
        
        logger.info(f"Inserted {inserted_count} of {len(locations)} locations (deduped)")
        return inserted_count
    
    async def get_collection_stats(self) -> Dict:
        """Get overall collection statistics"""
        try:
            # Get total locations
            locations_result = self.supabase.table('trip_locations')\
                .select('id', count='exact')\
                .execute()
            
            # Get verified locations
            verified_result = self.supabase.table('trip_locations')\
                .select('id', count='exact')\
                .eq('verified', True)\
                .execute()
            
            # Get recent runs
            runs_result = self.supabase.table('data_collector_runs')\
                .select('*')\
                .order('started_at', desc=True)\
                .limit(10)\
                .execute()
            
            # Get source performance
            sources_result = self.supabase.table('data_collector_sources')\
                .select('name, total_collected, average_quality_score')\
                .order('total_collected', desc=True)\
                .execute()
            
            return {
                'total_locations': locations_result.count if locations_result else 0,
                'verified_locations': verified_result.count if verified_result else 0,
                'recent_runs': runs_result.data if runs_result.data else [],
                'source_performance': sources_result.data if sources_result.data else [],
                'state': self.state
            }
            
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {}
    
    def get_next_priority(self) -> str:
        """Get the next data type to prioritize"""
        priorities = ['camping', 'parks', 'attractions', 'swimming']
        current = self.state.get('next_priority', 'camping')
        
        try:
            current_idx = priorities.index(current)
            next_priority = priorities[(current_idx + 1) % len(priorities)]
            
            # Update in database
            self.supabase.table('data_collector_state')\
                .update({'next_priority': next_priority})\
                .eq('id', self.state['id'])\
                .execute()
            
            return next_priority
            
        except Exception as e:
            logger.error(f"Failed to update priority: {e}")
            return 'camping'
    
    def get_config(self) -> Dict:
        """Get collection configuration"""
        return self.state.get('collection_config', {
            'target_per_run': 500,
            'run_frequency': 'weekly',
            'enable_ai_enhancement': False,
            'enable_deduplication': True,
            'quality_threshold': 0.3
        })