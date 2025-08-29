#!/usr/bin/env python3
"""
Wheels & Wins Mass Data Collection System
Main orchestrator for collecting travel data across 5 countries

⚠️ STANDALONE SYSTEM - SAFE TO DELETE AFTER USE ⚠️

This script coordinates the massive one-time data collection for:
- Australia, New Zealand, Canada, US, Great Britain
- National parks, camping spots, attractions, swimming spots, waterfalls
- ~35,000 locations total

Usage:
    python main.py --countries all --data-types all
    python main.py --countries australia,canada --data-types parks,camping
    python main.py --test-run  # Small test run first
"""

import asyncio
import argparse
import sys
from pathlib import Path
import yaml
from datetime import datetime
from typing import List, Dict
import logging
from dataclasses import dataclass

# Add the project root to path
sys.path.append(str(Path(__file__).parent))

from scrapers.national_parks import NationalParksScraperService
from scrapers.camping_spots import CampingSpotsScraperService
from scrapers.attractions import AttractionsScraperService
from scrapers.swimming_spots import SwimmingSpotsScraperService
from data_processors.deduplicator import DataDeduplicator
from data_processors.validator import DataValidator
from data_processors.enhancer import DataEnhancer
from outputs.json_exporter import JSONExporter
from outputs.sql_exporter import SQLExporter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/main.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class CollectionStats:
    """Track collection statistics"""
    total_locations: int = 0
    by_country: Dict[str, int] = None
    by_type: Dict[str, int] = None
    duplicates_removed: int = 0
    validation_failures: int = 0
    start_time: datetime = None
    end_time: datetime = None
    
    def __post_init__(self):
        if self.by_country is None:
            self.by_country = {}
        if self.by_type is None:
            self.by_type = {}
        if self.start_time is None:
            self.start_time = datetime.now()

class DataCollectionOrchestrator:
    """Main orchestrator for the mass data collection system"""
    
    def __init__(self, config_path: str = "config"):
        self.config_path = Path(config_path)
        self.countries_config = self._load_config("countries.yaml")
        self.sources_config = self._load_config("data_sources.yaml")
        self.stats = CollectionStats()
        
        # Create output directories
        self._create_directories()
        
        # Initialize scrapers
        self.scrapers = {
            'national_parks': NationalParksScraperService(self.countries_config, self.sources_config),
            'camping_spots': CampingSpotsScraperService(self.countries_config, self.sources_config),
            'attractions': AttractionsScraperService(self.countries_config, self.sources_config),
            'swimming_spots': SwimmingSpotsScraperService(self.countries_config, self.sources_config),
        }
        
        # Initialize processors
        self.deduplicator = DataDeduplicator(self.sources_config)
        self.validator = DataValidator(self.sources_config)
        self.enhancer = DataEnhancer(self.sources_config)
        
        # Initialize exporters
        self.json_exporter = JSONExporter()
        self.sql_exporter = SQLExporter()
    
    def _load_config(self, filename: str) -> Dict:
        """Load configuration from YAML file"""
        config_file = self.config_path / filename
        try:
            with open(config_file, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.error(f"Configuration file not found: {config_file}")
            sys.exit(1)
        except yaml.YAMLError as e:
            logger.error(f"Error parsing configuration file {config_file}: {e}")
            sys.exit(1)
    
    def _create_directories(self):
        """Create necessary directories"""
        directories = [
            "data/raw",
            "data/processed", 
            "data/final",
            "logs",
            "outputs"
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
    
    async def collect_data(self, countries: List[str], data_types: List[str], test_run: bool = False):
        """Main data collection process"""
        logger.info("🚀 Starting Wheels & Wins Mass Data Collection")
        logger.info(f"Countries: {countries}")
        logger.info(f"Data types: {data_types}")
        logger.info(f"Test run: {test_run}")
        
        if test_run:
            logger.info("🧪 TEST MODE - Limited collection for validation")
        
        self.stats.start_time = datetime.now()
        
        # Phase 1: Data Collection
        logger.info("📊 Phase 1: Data Collection")
        collected_data = {}
        
        for country in countries:
            logger.info(f"🌍 Collecting data for {country}")
            country_data = {}
            
            for data_type in data_types:
                if data_type in self.scrapers:
                    logger.info(f"  📍 Collecting {data_type} for {country}")
                    
                    try:
                        scraper = self.scrapers[data_type]
                        if test_run:
                            locations = await scraper.collect_sample(country, limit=10)
                        else:
                            locations = await scraper.collect_all(country)
                        
                        country_data[data_type] = locations
                        self.stats.by_country[country] = self.stats.by_country.get(country, 0) + len(locations)
                        self.stats.by_type[data_type] = self.stats.by_type.get(data_type, 0) + len(locations)
                        
                        logger.info(f"    ✅ Collected {len(locations)} {data_type} locations")
                        
                        # Save raw data immediately
                        await self._save_raw_data(country, data_type, locations)
                        
                    except Exception as e:
                        logger.error(f"    ❌ Error collecting {data_type} for {country}: {e}")
                        continue
            
            collected_data[country] = country_data
            
            # Add delay between countries to be respectful
            if not test_run:
                await asyncio.sleep(5)
        
        # Phase 2: Data Processing
        logger.info("🔄 Phase 2: Data Processing")
        processed_data = await self._process_data(collected_data)
        
        # Phase 3: Export and Upload
        logger.info("📤 Phase 3: Export and Upload")
        await self._export_data(processed_data)
        
        # Final statistics
        self.stats.end_time = datetime.now()
        self.stats.total_locations = sum(self.stats.by_type.values())
        
        await self._print_final_stats()
        
        logger.info("🎉 Data collection complete!")
        
        return processed_data
    
    async def _save_raw_data(self, country: str, data_type: str, locations: List[Dict]):
        """Save raw collected data"""
        filename = f"data/raw/{country}_{data_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        await self.json_exporter.save_data(locations, filename)
    
    async def _process_data(self, collected_data: Dict) -> Dict:
        """Process collected data: deduplicate, validate, enhance"""
        
        # Flatten all data for processing
        all_locations = []
        for country_data in collected_data.values():
            for data_type_locations in country_data.values():
                all_locations.extend(data_type_locations)
        
        logger.info(f"Processing {len(all_locations)} total locations")
        
        # Step 1: Deduplication
        logger.info("  🔍 Deduplicating locations...")
        deduplicated = await self.deduplicator.deduplicate(all_locations)
        duplicates_removed = len(all_locations) - len(deduplicated)
        self.stats.duplicates_removed = duplicates_removed
        logger.info(f"  ✅ Removed {duplicates_removed} duplicates")
        
        # Step 2: Validation
        logger.info("  ✔️  Validating data quality...")
        validated, failed = await self.validator.validate_batch(deduplicated)
        self.stats.validation_failures = len(failed)
        logger.info(f"  ✅ Validated {len(validated)} locations, {len(failed)} failed validation")
        
        # Step 3: Enhancement
        logger.info("  ✨ Enhancing data with AI...")
        enhanced = await self.enhancer.enhance_batch(validated)
        logger.info(f"  ✅ Enhanced {len(enhanced)} locations")
        
        # Save processed data
        await self.json_exporter.save_data(enhanced, "data/processed/all_locations_processed.json")
        
        return enhanced
    
    async def _export_data(self, processed_data: List[Dict]):
        """Export data in multiple formats"""
        
        # Export as JSON (organized by country and type)
        logger.info("  📄 Exporting JSON files...")
        await self._export_organized_json(processed_data)
        
        # Export as SQL inserts
        logger.info("  🗄️  Generating SQL inserts...")
        sql_files = await self.sql_exporter.generate_inserts(processed_data)
        logger.info(f"  ✅ Generated {len(sql_files)} SQL files")
        
        # Generate summary report
        logger.info("  📊 Generating summary report...")
        await self._generate_summary_report(processed_data)
    
    async def _export_organized_json(self, locations: List[Dict]):
        """Export JSON files organized by country and type"""
        
        # Organize by country and type
        organized = {}
        for location in locations:
            country = location.get('country', 'unknown')
            data_type = location.get('data_type', 'unknown')
            
            if country not in organized:
                organized[country] = {}
            if data_type not in organized[country]:
                organized[country][data_type] = []
            
            organized[country][data_type].append(location)
        
        # Save organized files
        for country, country_data in organized.items():
            for data_type, locations in country_data.items():
                filename = f"data/final/{country}_{data_type}_final.json"
                await self.json_exporter.save_data(locations, filename)
    
    async def _generate_summary_report(self, processed_data: List[Dict]):
        """Generate a comprehensive summary report"""
        
        report = {
            "collection_summary": {
                "total_locations": len(processed_data),
                "countries": list(self.stats.by_country.keys()),
                "data_types": list(self.stats.by_type.keys()),
                "start_time": self.stats.start_time.isoformat(),
                "end_time": self.stats.end_time.isoformat(),
                "duration_hours": (self.stats.end_time - self.stats.start_time).total_seconds() / 3600
            },
            "statistics": {
                "by_country": self.stats.by_country,
                "by_type": self.stats.by_type,
                "duplicates_removed": self.stats.duplicates_removed,
                "validation_failures": self.stats.validation_failures
            },
            "data_quality": await self._analyze_data_quality(processed_data),
            "next_steps": [
                "Review the generated SQL files in outputs/",
                "Test database import on staging environment",
                "Verify data quality and completeness",
                "Import to production database",
                "Update PAM integration to use new data",
                "Delete this collection system"
            ]
        }
        
        await self.json_exporter.save_data(report, "data/final/COLLECTION_SUMMARY.json")
    
    async def _analyze_data_quality(self, locations: List[Dict]) -> Dict:
        """Analyze data quality metrics"""
        
        total = len(locations)
        if total == 0:
            return {}
        
        has_description = sum(1 for loc in locations if loc.get('description'))
        has_images = sum(1 for loc in locations if loc.get('image_url'))
        has_contact = sum(1 for loc in locations if loc.get('contact_info'))
        has_amenities = sum(1 for loc in locations if loc.get('amenities'))
        
        return {
            "completeness": {
                "descriptions": f"{has_description}/{total} ({has_description/total*100:.1f}%)",
                "images": f"{has_images}/{total} ({has_images/total*100:.1f}%)",
                "contact_info": f"{has_contact}/{total} ({has_contact/total*100:.1f}%)",
                "amenities": f"{has_amenities}/{total} ({has_amenities/total*100:.1f}%)"
            },
            "coordinate_accuracy": "All coordinates validated",
            "source_diversity": len(set(loc.get('data_source', 'unknown') for loc in locations))
        }
    
    async def _print_final_stats(self):
        """Print final collection statistics"""
        
        duration = self.stats.end_time - self.stats.start_time
        
        print("\n" + "="*60)
        print("🎉 WHEELS & WINS DATA COLLECTION COMPLETE")
        print("="*60)
        print(f"📊 Total Locations Collected: {self.stats.total_locations:,}")
        print(f"⏱️  Collection Duration: {duration}")
        print(f"🔄 Duplicates Removed: {self.stats.duplicates_removed:,}")
        print(f"❌ Validation Failures: {self.stats.validation_failures:,}")
        print("\n📍 By Country:")
        for country, count in self.stats.by_country.items():
            print(f"   {country}: {count:,} locations")
        print("\n🏷️  By Type:")
        for data_type, count in self.stats.by_type.items():
            print(f"   {data_type}: {count:,} locations")
        print("\n📁 Output Files:")
        print("   • Raw data: data/raw/")
        print("   • Processed data: data/processed/")
        print("   • Final organized data: data/final/")
        print("   • SQL inserts: outputs/")
        print("   • Summary report: data/final/COLLECTION_SUMMARY.json")
        print("\n🚀 Next Steps:")
        print("   1. Review data quality in summary report")
        print("   2. Test SQL imports on staging database")
        print("   3. Import to production database")
        print("   4. Update PAM integration")
        print("   5. Delete this collection system")
        print("="*60)

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Wheels & Wins Mass Data Collection System",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--countries',
        default='all',
        help='Countries to collect data for (comma-separated or "all")'
    )
    
    parser.add_argument(
        '--data-types',
        default='all',
        help='Data types to collect (comma-separated or "all")'
    )
    
    parser.add_argument(
        '--test-run',
        action='store_true',
        help='Run in test mode with limited data collection'
    )
    
    parser.add_argument(
        '--config-path',
        default='config',
        help='Path to configuration files'
    )
    
    return parser.parse_args()

async def main():
    """Main entry point"""
    
    print("🌟 Wheels & Wins Mass Data Collection System")
    print("⚠️  STANDALONE SYSTEM - SAFE TO DELETE AFTER USE")
    print()
    
    args = parse_arguments()
    
    # Initialize orchestrator
    orchestrator = DataCollectionOrchestrator(args.config_path)
    
    # Parse countries
    if args.countries == 'all':
        countries = list(orchestrator.countries_config['countries'].keys())
    else:
        countries = [c.strip() for c in args.countries.split(',')]
    
    # Parse data types
    if args.data_types == 'all':
        data_types = ['national_parks', 'camping_spots', 'attractions', 'swimming_spots']
    else:
        data_types = [t.strip() for t in args.data_types.split(',')]
    
    # Validate inputs
    valid_countries = set(orchestrator.countries_config['countries'].keys())
    invalid_countries = set(countries) - valid_countries
    if invalid_countries:
        logger.error(f"Invalid countries: {invalid_countries}")
        logger.error(f"Valid countries: {valid_countries}")
        sys.exit(1)
    
    valid_types = {'national_parks', 'camping_spots', 'attractions', 'swimming_spots'}
    invalid_types = set(data_types) - valid_types
    if invalid_types:
        logger.error(f"Invalid data types: {invalid_types}")
        logger.error(f"Valid types: {valid_types}")
        sys.exit(1)
    
    # Run collection
    try:
        await orchestrator.collect_data(countries, data_types, args.test_run)
    except KeyboardInterrupt:
        logger.info("Collection interrupted by user")
    except Exception as e:
        logger.error(f"Collection failed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())