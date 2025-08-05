"""
Data Deduplicator

Removes duplicate locations using multiple strategies:
- Geographic proximity clustering
- Name similarity matching
- Source reliability prioritization
- Coordinate precision analysis
"""

import logging
from typing import List, Dict, Tuple, Set
from datetime import datetime
import math
from collections import defaultdict
import difflib

logger = logging.getLogger(__name__)

class DataDeduplicator:
    """Service for removing duplicate locations from collected data"""
    
    def __init__(self, sources_config: Dict):
        self.sources_config = sources_config
        
        # Configuration
        self.proximity_threshold_meters = sources_config.get('processing', {}).get('duplicate_threshold_meters', 500)
        self.name_similarity_threshold = 0.8
        self.source_reliability = sources_config.get('source_reliability', {})
    
    async def deduplicate(self, locations: List[Dict]) -> List[Dict]:
        """Main deduplication process"""
        
        if not locations:
            return locations
        
        logger.info(f"Starting deduplication of {len(locations)} locations")
        
        # Step 1: Group by proximity
        location_clusters = self._cluster_by_proximity(locations)
        logger.info(f"Created {len(location_clusters)} proximity clusters")
        
        # Step 2: Deduplicate within each cluster
        deduplicated = []
        total_removed = 0
        
        for cluster in location_clusters:
            if len(cluster) == 1:
                # No duplicates in this cluster
                deduplicated.extend(cluster)
            else:
                # Resolve duplicates in this cluster
                resolved = self._resolve_cluster_duplicates(cluster)
                deduplicated.extend(resolved)
                removed = len(cluster) - len(resolved)
                total_removed += removed
                
                if removed > 0:
                    logger.debug(f"Cluster: {len(cluster)} -> {len(resolved)} locations (removed {removed})")
        
        logger.info(f"Deduplication complete: {len(locations)} -> {len(deduplicated)} locations (removed {total_removed} duplicates)")
        
        return deduplicated
    
    def _cluster_by_proximity(self, locations: List[Dict]) -> List[List[Dict]]:
        """Group locations by geographic proximity"""
        
        clusters = []
        unprocessed = locations.copy()
        
        while unprocessed:
            # Start a new cluster with the first unprocessed location
            seed_location = unprocessed.pop(0)
            current_cluster = [seed_location]
            
            # Find all locations within proximity threshold
            i = 0
            while i < len(unprocessed):
                location = unprocessed[i]
                
                # Check if this location is close to any location in current cluster
                is_close = False
                for cluster_location in current_cluster:
                    if self._are_locations_close(seed_location, location):
                        is_close = True
                        break
                
                if is_close:
                    # Add to current cluster and remove from unprocessed
                    current_cluster.append(unprocessed.pop(i))
                else:
                    i += 1
            
            clusters.append(current_cluster)
        
        return clusters
    
    def _are_locations_close(self, loc1: Dict, loc2: Dict) -> bool:
        """Check if two locations are within proximity threshold"""
        
        lat1 = loc1.get('latitude')
        lng1 = loc1.get('longitude')
        lat2 = loc2.get('latitude')
        lng2 = loc2.get('longitude')
        
        if not all([lat1, lng1, lat2, lng2]):
            return False
        
        distance_meters = self._calculate_distance(lat1, lng1, lat2, lng2)
        return distance_meters <= self.proximity_threshold_meters
    
    def _calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two coordinates in meters using Haversine formula"""
        
        # Convert latitude and longitude from degrees to radians
        lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in meters
        r = 6371000
        
        return c * r
    
    def _resolve_cluster_duplicates(self, cluster: List[Dict]) -> List[Dict]:
        """Resolve duplicates within a proximity cluster"""
        
        if len(cluster) <= 1:
            return cluster
        
        # Group by name similarity
        name_groups = self._group_by_name_similarity(cluster)
        
        resolved_locations = []
        
        for name_group in name_groups:
            if len(name_group) == 1:
                # No name duplicates
                resolved_locations.extend(name_group)
            else:
                # Merge duplicates with similar names
                merged_location = self._merge_duplicate_locations(name_group)
                resolved_locations.append(merged_location)
        
        return resolved_locations
    
    def _group_by_name_similarity(self, locations: List[Dict]) -> List[List[Dict]]:
        """Group locations by name similarity"""
        
        groups = []
        unprocessed = locations.copy()
        
        while unprocessed:
            seed_location = unprocessed.pop(0)
            current_group = [seed_location]
            seed_name = seed_location.get('name', '').lower().strip()
            
            i = 0
            while i < len(unprocessed):
                location = unprocessed[i]
                location_name = location.get('name', '').lower().strip()
                
                # Calculate name similarity
                similarity = difflib.SequenceMatcher(None, seed_name, location_name).ratio()
                
                if similarity >= self.name_similarity_threshold:
                    current_group.append(unprocessed.pop(i))
                else:
                    i += 1
            
            groups.append(current_group)
        
        return groups
    
    def _merge_duplicate_locations(self, duplicates: List[Dict]) -> Dict:
        """Merge multiple duplicate locations into one, prioritizing by source reliability"""
        
        if len(duplicates) == 1:
            return duplicates[0]
        
        # Sort by source reliability (highest first)
        sorted_duplicates = sorted(
            duplicates, 
            key=lambda x: self._get_source_reliability(x.get('data_source', '')),
            reverse=True
        )
        
        # Use the most reliable source as the base
        merged_location = sorted_duplicates[0].copy()
        
        # Enhance with data from other sources
        merged_location = self._enhance_location_data(merged_location, sorted_duplicates[1:])
        
        # Add merge metadata
        merged_location['merge_info'] = {
            'merged_from_sources': [loc.get('data_source') for loc in duplicates],
            'merge_count': len(duplicates),
            'merged_at': datetime.now().isoformat()
        }
        
        logger.debug(f"Merged {len(duplicates)} locations: {merged_location.get('name')} from sources: {merged_location['merge_info']['merged_from_sources']}")
        
        return merged_location
    
    def _get_source_reliability(self, data_source: str) -> int:
        """Get reliability score for a data source"""
        return self.source_reliability.get(data_source, 5)  # Default medium reliability
    
    def _enhance_location_data(self, base_location: Dict, other_locations: List[Dict]) -> Dict:
        """Enhance base location with additional data from other sources"""
        
        enhanced = base_location.copy()
        
        # Fields that can be enhanced from other sources
        enhanceable_fields = [
            'description', 'phone', 'email', 'website', 'official_website',
            'opening_hours', 'amenities', 'activities', 'images', 'reviews'
        ]
        
        for field in enhanceable_fields:
            enhanced = self._merge_field(enhanced, other_locations, field)
        
        # Special handling for specific field types
        enhanced = self._merge_coordinates(enhanced, other_locations)
        enhanced = self._merge_ratings(enhanced, other_locations)
        enhanced = self._merge_arrays(enhanced, other_locations, 'images')
        enhanced = self._merge_arrays(enhanced, other_locations, 'activities')
        enhanced = self._merge_objects(enhanced, other_locations, 'amenities')
        
        return enhanced
    
    def _merge_field(self, base_location: Dict, other_locations: List[Dict], field: str) -> Dict:
        """Merge a specific field from other locations if base doesn't have it"""
        
        if base_location.get(field):
            return base_location  # Base already has this field
        
        # Look for this field in other locations
        for location in other_locations:
            if location.get(field):
                base_location[field] = location[field]
                break
        
        return base_location
    
    def _merge_coordinates(self, base_location: Dict, other_locations: List[Dict]) -> Dict:
        """Merge coordinates, preferring more precise ones"""
        
        base_lat = base_location.get('latitude')
        base_lng = base_location.get('longitude')
        
        if not base_lat or not base_lng:
            # Base has no coordinates, use first available
            for location in other_locations:
                if location.get('latitude') and location.get('longitude'):
                    base_location['latitude'] = location['latitude']
                    base_location['longitude'] = location['longitude']
                    break
        else:
            # Check if other sources have more precise coordinates
            base_precision = self._get_coordinate_precision(base_lat, base_lng)
            
            for location in other_locations:
                lat = location.get('latitude')
                lng = location.get('longitude')
                
                if lat and lng:
                    precision = self._get_coordinate_precision(lat, lng)
                    if precision > base_precision:
                        base_location['latitude'] = lat
                        base_location['longitude'] = lng
                        base_precision = precision
        
        return base_location
    
    def _get_coordinate_precision(self, lat: float, lng: float) -> int:
        """Estimate coordinate precision based on decimal places"""
        
        lat_str = str(lat)
        lng_str = str(lng)
        
        lat_decimals = len(lat_str.split('.')[-1]) if '.' in lat_str else 0
        lng_decimals = len(lng_str.split('.')[-1]) if '.' in lng_str else 0
        
        return min(lat_decimals, lng_decimals)
    
    def _merge_ratings(self, base_location: Dict, other_locations: List[Dict]) -> Dict:
        """Merge ratings by averaging or taking the most reliable source"""
        
        ratings = []
        rating_counts = []
        
        # Collect ratings from all sources
        if base_location.get('rating'):
            ratings.append(float(base_location['rating']))
            rating_counts.append(base_location.get('user_ratings_total', 1))
        
        for location in other_locations:
            if location.get('rating'):
                ratings.append(float(location['rating']))
                rating_counts.append(location.get('user_ratings_total', 1))
        
        if ratings:
            # Weighted average based on number of ratings
            if rating_counts and sum(rating_counts) > 0:
                weighted_sum = sum(r * c for r, c in zip(ratings, rating_counts))
                total_count = sum(rating_counts)
                base_location['rating'] = round(weighted_sum / total_count, 1)
                base_location['user_ratings_total'] = total_count
            else:
                # Simple average
                base_location['rating'] = round(sum(ratings) / len(ratings), 1)
        
        return base_location
    
    def _merge_arrays(self, base_location: Dict, other_locations: List[Dict], field: str) -> Dict:
        """Merge array fields by combining unique items"""
        
        combined_items = []
        
        # Add items from base
        base_items = base_location.get(field, [])
        if isinstance(base_items, list):
            combined_items.extend(base_items)
        
        # Add items from other sources
        for location in other_locations:
            items = location.get(field, [])
            if isinstance(items, list):
                for item in items:
                    if item not in combined_items:
                        combined_items.append(item)
        
        if combined_items:
            base_location[field] = combined_items
        
        return base_location
    
    def _merge_objects(self, base_location: Dict, other_locations: List[Dict], field: str) -> Dict:
        """Merge object fields by combining keys"""
        
        combined_object = {}
        
        # Add from base
        base_obj = base_location.get(field, {})
        if isinstance(base_obj, dict):
            combined_object.update(base_obj)
        
        # Add from other sources
        for location in other_locations:
            obj = location.get(field, {})
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if key not in combined_object:
                        combined_object[key] = value
        
        if combined_object:
            base_location[field] = combined_object
        
        return base_location