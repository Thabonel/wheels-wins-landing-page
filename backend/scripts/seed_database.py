
#!/usr/bin/env python3
"""
Seed database with test data for development and testing.
"""

import asyncio
import sys
import os
from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.database.supabase_client import get_supabase_client
from app.core.logging import get_logger

logger = get_logger(__name__)

class DatabaseSeeder:
    def __init__(self):
        self.client = get_supabase_client()
        
    async def seed_all(self):
        """Seed all test data"""
        logger.info("Starting database seeding...")
        
        try:
            # Create test users first
            test_users = await self.seed_test_users()
            
            # Seed data for each module
            await self.seed_expenses(test_users)
            await self.seed_maintenance_records(test_users)
            await self.seed_fuel_logs(test_users)
            await self.seed_camping_locations()
            await self.seed_hustle_ideas(test_users)
            await self.seed_social_data(test_users)
            
            logger.info("Database seeding completed successfully!")
            
        except Exception as e:
            logger.error(f"Error seeding database: {e}")
            raise
    
    async def seed_test_users(self):
        """Create test user profiles"""
        test_users = [
            {
                "id": str(uuid4()),
                "email": "test.nomad1@example.com",
                "full_name": "John Wanderer",
                "region": "Australia",
                "preferences": {"notifications": True, "theme": "light"}
            },
            {
                "id": str(uuid4()),
                "email": "test.nomad2@example.com", 
                "full_name": "Sarah Explorer",
                "region": "Australia",
                "preferences": {"notifications": False, "theme": "dark"}
            }
        ]
        
        for user in test_users:
            result = self.client.table("profiles").insert(user).execute()
            logger.info(f"Created test user: {user['email']}")
            
        return test_users
    
    async def seed_expenses(self, users):
        """Create sample expense records"""
        categories = ["fuel", "food", "camping", "maintenance", "entertainment"]
        
        for user in users:
            for i in range(20):
                expense = {
                    "user_id": user["id"],
                    "amount": float(Decimal(str(10 + (i * 5.5)))),
                    "category": categories[i % len(categories)],
                    "description": f"Test expense {i+1}",
                    "date": (date.today() - timedelta(days=i)).isoformat()
                }
                self.client.table("expenses").insert(expense).execute()
                
        logger.info("Created sample expenses")
    
    async def seed_maintenance_records(self, users):
        """Create sample maintenance records"""
        maintenance_tasks = [
            "Oil Change", "Tire Rotation", "Brake Inspection", 
            "Air Filter Replacement", "Coolant Check"
        ]
        
        for user in users:
            for i, task in enumerate(maintenance_tasks):
                record = {
                    "user_id": user["id"],
                    "task": task,
                    "date": (date.today() - timedelta(days=i*30)).isoformat(),
                    "mileage": 50000 + (i * 3000),
                    "cost": float(Decimal(str(50 + (i * 25)))),
                    "status": "completed",
                    "next_due_date": (date.today() + timedelta(days=90)).isoformat(),
                    "next_due_mileage": 53000 + (i * 3000)
                }
                self.client.table("maintenance_records").insert(record).execute()
                
        logger.info("Created sample maintenance records")
    
    async def seed_fuel_logs(self, users):
        """Create sample fuel log entries"""
        locations = ["Shell Station", "BP", "Caltex", "7-Eleven", "United"]
        
        for user in users:
            for i in range(10):
                fuel_log = {
                    "user_id": user["id"],
                    "date": (date.today() - timedelta(days=i*7)).isoformat(),
                    "location": locations[i % len(locations)],
                    "volume": float(Decimal(str(45 + (i * 2)))),
                    "price": float(Decimal("1.65")),
                    "total": float(Decimal(str((45 + (i * 2)) * 1.65))),
                    "odometer": 75000 + (i * 500)
                }
                self.client.table("fuel_log").insert(fuel_log).execute()
                
        logger.info("Created sample fuel logs")
    
    async def seed_camping_locations(self):
        """Create sample camping locations"""
        locations = [
            {
                "name": "Sunset Beach Campground",
                "type": "beachfront",
                "latitude": -33.8688,
                "longitude": 151.2093,
                "address": "123 Beach Road, Sydney NSW",
                "amenities": {"toilets": True, "showers": True, "bbq": True},
                "price_per_night": float(Decimal("25.00")),
                "reservation_required": True
            },
            {
                "name": "Mountain View Free Camp",
                "type": "free_camp",
                "latitude": -33.9688,
                "longitude": 151.3093,
                "address": "Mountain Road, Blue Mountains NSW",
                "amenities": {"toilets": False, "showers": False, "bbq": False},
                "price_per_night": float(Decimal("0.00")),
                "reservation_required": False
            }
        ]
        
        for location in locations:
            self.client.table("camping_locations").insert(location).execute()
            
        logger.info("Created sample camping locations")
    
    async def seed_hustle_ideas(self, users):
        """Create sample hustle ideas"""
        hustles = [
            {
                "user_id": users[0]["id"],
                "title": "Mobile Car Detailing",
                "description": "Offer car cleaning services at campsites",
                "status": "approved",
                "avg_earnings": float(Decimal("150.00")),
                "tags": ["automotive", "service", "mobile"]
            },
            {
                "user_id": users[1]["id"],
                "title": "Campfire Cooking Classes",
                "description": "Teach outdoor cooking techniques to fellow nomads",
                "status": "approved", 
                "avg_earnings": float(Decimal("75.00")),
                "tags": ["cooking", "education", "outdoor"]
            }
        ]
        
        for hustle in hustles:
            self.client.table("hustle_ideas").insert(hustle).execute()
            
        logger.info("Created sample hustle ideas")
    
    async def seed_social_data(self, users):
        """Create sample social posts and groups"""
        # Create a test group
        group = {
            "name": "Test Grey Nomads Group",
            "description": "A test group for grey nomads",
            "location": "Australia",
            "group_type": "regional",
            "member_count": 2,
            "is_private": False
        }
        group_result = self.client.table("social_groups").insert(group).execute()
        group_id = group_result.data[0]["id"]
        
        # Add users to group
        for user in users:
            membership = {
                "user_id": user["id"],
                "group_id": group_id,
                "role": "member"
            }
            self.client.table("group_memberships").insert(membership).execute()
        
        # Create test posts
        post = {
            "user_id": users[0]["id"],
            "content": "Just arrived at beautiful Sunset Beach! Amazing views 🌅",
            "location": "feed",
            "group_id": group_id
        }
        self.client.table("social_posts").insert(post).execute()
        
        logger.info("Created sample social data")

async def main():
    """Main function to run database seeding"""
    seeder = DatabaseSeeder()
    await seeder.seed_all()

if __name__ == "__main__":
    asyncio.run(main())
