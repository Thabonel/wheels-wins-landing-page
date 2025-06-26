
"""
Enhanced Database Service with additional methods for PAM nodes
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date
import asyncio

from app.models.domain.pam import PamMemory, IntentType, MemoryType
from app.models.domain.user import UserProfile
from app.models.domain.wheels import Trip, MaintenanceItem, FuelLog
from app.models.domain.wins import BudgetCategory, Expense
from app.models.domain.social import SocialPost, SocialGroup
from app.core.exceptions import DatabaseError
from app.database.supabase_client import get_supabase

logger = logging.getLogger("database_service")

class DatabaseService:
    """Enhanced database service with comprehensive data access methods"""
    
    def __init__(self):
        self.client = get_supabase()
    
    # Memory operations
    async def store_memory(self, memory: PamMemory) -> bool:
        """Store a memory in the database"""
        try:
            data = memory.model_dump()
            result = self.client.table('pam_memory').insert(data).execute()
            return len(result.data) > 0
        except Exception as e:
            logger.error(f"Failed to store memory: {str(e)}")
            raise DatabaseError(f"Memory storage failed: {str(e)}")
    
    async def search_memories(self, user_id: str, query: str, 
                            intent_type: Optional[IntentType] = None,
                            limit: int = 5) -> List[PamMemory]:
        """Search for memories"""
        try:
            query_builder = self.client.table('pam_memory').select('*').eq('user_id', user_id)
            
            if intent_type:
                query_builder = query_builder.eq('intent', intent_type.value)
            
            # Simple text search - in production, use full-text search
            query_builder = query_builder.ilike('content', f'%{query}%')
            query_builder = query_builder.order('created_at', desc=True).limit(limit)
            
            result = query_builder.execute()
            return [PamMemory(**item) for item in result.data]
        except Exception as e:
            logger.error(f"Memory search failed: {str(e)}")
            return []
    
    async def get_user_memories(self, user_id: str, memory_type: Optional[MemoryType] = None,
                              limit: int = 10) -> List[PamMemory]:
        """Get recent memories for a user"""
        try:
            query_builder = self.client.table('pam_memory').select('*').eq('user_id', user_id)
            
            if memory_type:
                query_builder = query_builder.eq('memory_type', memory_type.value)
                
            query_builder = query_builder.order('created_at', desc=True).limit(limit)
            result = query_builder.execute()
            return [PamMemory(**item) for item in result.data]
        except Exception as e:
            logger.error(f"Failed to get user memories: {str(e)}")
            return []
    
    # User profile operations
    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get user profile"""
        try:
            result = self.client.table('profiles').select('*').eq('user_id', user_id).execute()
            if result.data:
                return UserProfile(**result.data[0])
            return None
        except Exception as e:
            logger.error(f"Failed to get user profile: {str(e)}")
            return None
    
    async def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user preferences"""
        try:
            result = self.client.table('user_settings').select('preferences').eq('user_id', user_id).execute()
            if result.data:
                return result.data[0].get('preferences', {})
            return {}
        except Exception as e:
            logger.error(f"Failed to get user preferences: {str(e)}")
            return {}
    
    async def get_onboarding_data(self, user_id: str) -> Optional[Any]:
        """Get user onboarding data"""
        try:
            result = self.client.table('onboarding_responses').select('*').eq('user_id', user_id).execute()
            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to get onboarding data: {str(e)}")
            return None
    
    # Financial operations
    async def get_budget_categories(self, user_id: str) -> List[BudgetCategory]:
        """Get budget categories for user"""
        try:
            result = self.client.table('budget_categories').select('*').eq('user_id', user_id).execute()
            return [BudgetCategory(**item) for item in result.data]
        except Exception as e:
            logger.error(f"Failed to get budget categories: {str(e)}")
            return []
    
    async def get_recent_expenses(self, user_id: str, limit: int = 5) -> List[Expense]:
        """Get recent expenses"""
        try:
            result = (self.client.table('expenses')
                     .select('*')
                     .eq('user_id', user_id)
                     .order('date', desc=True)
                     .limit(limit)
                     .execute())
            return [Expense(**item) for item in result.data]
        except Exception as e:
            logger.error(f"Failed to get recent expenses: {str(e)}")
            return []
    
    async def get_budget_summary(self, user_id: str) -> Dict[str, float]:
        """Get budget summary"""
        try:
            result = self.client.table('budget_summary').select('*').eq('user_id', user_id).execute()
            if result.data:
                return result.data[0]
            return {}
        except Exception as e:
            logger.error(f"Failed to get budget summary: {str(e)}")
            return {}
    
    async def get_monthly_spending(self, user_id: str) -> Dict[str, Any]:
        """Get monthly spending data"""
        try:
            # Get current month expenses
            result = (self.client.table('expenses')
                     .select('category, amount')
                     .eq('user_id', user_id)
                     .gte('date', datetime.now().replace(day=1).date())
                     .execute())
            
            spending_by_category = {}
            total_spent = 0
            
            for expense in result.data:
                category = expense['category']
                amount = float(expense['amount'])
                spending_by_category[category] = spending_by_category.get(category, 0) + amount
                total_spent += amount
            
            return {
                'total_spent': total_spent,
                'by_category': spending_by_category
            }
        except Exception as e:
            logger.error(f"Failed to get monthly spending: {str(e)}")
            return {}
    
    # Travel operations
    async def get_recent_trips(self, user_id: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Get recent trips"""
        try:
            # Note: Assuming we have a trips table structure
            result = (self.client.table('travel_plans')
                     .select('*')
                     .eq('user_id', user_id)
                     .order('created_at', desc=True)
                     .limit(limit)
                     .execute())
            return result.data
        except Exception as e:
            logger.error(f"Failed to get recent trips: {str(e)}")
            return []
    
    async def get_active_trips(self, user_id: str) -> List[Dict[str, Any]]:
        """Get active trips"""
        try:
            result = (self.client.table('travel_plans')
                     .select('*')
                     .eq('user_id', user_id)
                     .eq('is_active', True)
                     .execute())
            return result.data
        except Exception as e:
            logger.error(f"Failed to get active trips: {str(e)}")
            return []
    
    async def get_next_planned_trip(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get next planned trip"""
        try:
            result = (self.client.table('travel_plans')
                     .select('*')
                     .eq('user_id', user_id)
                     .gte('start_date', datetime.now().date())
                     .order('start_date')
                     .limit(1)
                     .execute())
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Failed to get next planned trip: {str(e)}")
            return None
    
    async def get_popular_camping_locations(self, limit: int = 4) -> List[Dict[str, Any]]:
        """Get popular camping locations"""
        try:
            result = (self.client.table('camping_locations')
                     .select('*')
                     .order('user_ratings', desc=True)
                     .limit(limit)
                     .execute())
            return result.data
        except Exception as e:
            logger.error(f"Failed to get popular camping locations: {str(e)}")
            return []
    
    async def get_recent_fuel_logs(self, user_id: str, limit: int = 3) -> List[FuelLog]:
        """Get recent fuel logs"""
        try:
            result = (self.client.table('fuel_log')
                     .select('*')
                     .eq('user_id', user_id)
                     .order('date', desc=True)
                     .limit(limit)
                     .execute())
            return [FuelLog(**item) for item in result.data]
        except Exception as e:
            logger.error(f"Failed to get recent fuel logs: {str(e)}")
            return []
    
    async def get_maintenance_due(self, user_id: str) -> List[MaintenanceItem]:
        """Get maintenance items that are due"""
        try:
            result = (self.client.table('maintenance_records')
                     .select('*')
                     .eq('user_id', user_id)
                     .in_('status', ['due', 'overdue'])
                     .order('next_due_date')
                     .execute())
            return [MaintenanceItem(**item) for item in result.data]
        except Exception as e:
            logger.error(f"Failed to get maintenance due: {str(e)}")
            return []
    
    # Social operations
    async def get_user_groups(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's social groups"""
        try:
            result = (self.client.table('group_memberships')
                     .select('*, social_groups(*)')
                     .eq('user_id', user_id)
                     .eq('is_active', True)
                     .execute())
            return [item['social_groups'] for item in result.data if item.get('social_groups')]
        except Exception as e:
            logger.error(f"Failed to get user groups: {str(e)}")
            return []
    
    async def get_user_recent_posts(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get user's recent posts"""
        try:
            result = (self.client.table('social_posts')
                     .select('*')
                     .eq('user_id', user_id)
                     .order('created_at', desc=True)
                     .limit(limit)
                     .execute())
            return result.data
        except Exception as e:
            logger.error(f"Failed to get user recent posts: {str(e)}")
            return []
    
    async def get_recommended_groups(self, user_id: str, limit: int = 4) -> List[Dict[str, Any]]:
        """Get recommended groups for user"""
        try:
            # Simple implementation - get popular groups user hasn't joined
            user_group_ids = [g.get('id') for g in await self.get_user_groups(user_id)]
            
            query_builder = self.client.table('social_groups').select('*')
            if user_group_ids:
                query_builder = query_builder.not_.in_('id', user_group_ids)
            
            result = (query_builder
                     .order('member_count', desc=True)
                     .limit(limit)
                     .execute())
            return result.data
        except Exception as e:
            logger.error(f"Failed to get recommended groups: {str(e)}")
            return []
    
    async def get_trending_topics(self, limit: int = 4) -> List[Dict[str, Any]]:
        """Get trending topics"""
        try:
            # Simple implementation - get most active categories
            result = (self.client.table('social_posts')
                     .select('category')
                     .gte('created_at', datetime.now().replace(hour=0, minute=0, second=0))
                     .execute())
            
            # Count categories
            category_counts = {}
            for post in result.data:
                category = post.get('category', 'general')
                category_counts[category] = category_counts.get(category, 0) + 1
            
            # Return top categories
            sorted_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
            return [{'name': cat, 'count': count} for cat, count in sorted_categories[:limit]]
        except Exception as e:
            logger.error(f"Failed to get trending topics: {str(e)}")
            return []
    
    async def get_upcoming_events(self, user_id: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Get upcoming events for user"""
        try:
            result = (self.client.table('local_events')
                     .select('*')
                     .gte('start_date', datetime.now().date())
                     .order('start_date')
                     .limit(limit)
                     .execute())
            return result.data
        except Exception as e:
            logger.error(f"Failed to get upcoming events: {str(e)}")
            return []
    
    # Utility methods
    async def get_memory_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get memory usage statistics"""
        try:
            result = (self.client.table('pam_memory')
                     .select('memory_type')
                     .eq('user_id', user_id)
                     .execute())
            
            total_memories = len(result.data)
            memory_types = {}
            
            for memory in result.data:
                mem_type = memory.get('memory_type', 'general')
                memory_types[mem_type] = memory_types.get(mem_type, 0) + 1
            
            return {
                'total_memories': total_memories,
                'by_type': memory_types,
                'last_updated': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get memory statistics: {str(e)}")
            return {}
    
    async def cleanup_old_memories(self, user_id: str, days_old: int = 90) -> int:
        """Clean up old memories"""
        try:
            cutoff_date = datetime.now().replace(hour=0, minute=0, second=0) - timedelta(days=days_old)
            
            result = (self.client.table('pam_memory')
                     .delete()
                     .eq('user_id', user_id)
                     .lt('created_at', cutoff_date.isoformat())
                     .execute())
            
            return len(result.data) if result.data else 0
        except Exception as e:
            logger.error(f"Failed to cleanup old memories: {str(e)}")
            return 0

# Create singleton instance
database_service = DatabaseService()
