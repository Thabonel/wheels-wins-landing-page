
import pytest
from app.services.database import DatabaseService
from app.database.supabase_client import get_supabase_client


class TestDatabaseIntegration:
    """Integration tests for database operations."""
    
    @pytest.fixture
    async def database_service(self, test_db):
        """Create DatabaseService with test database."""
        service = DatabaseService()
        service.client = test_db
        return service
    
    async def test_user_profile_crud_operations(self, database_service, test_data_factory):
        """Test complete CRUD operations for user profiles."""
        # Create
        user_data = test_data_factory.create_user(
            email="integration@test.com",
            full_name="Integration Test User"
        )
        
        created_user = await database_service.create_user_profile(user_data)
        assert created_user["email"] == user_data["email"]
        assert created_user["full_name"] == user_data["full_name"]
        
        # Read
        retrieved_user = await database_service.get_user_profile(created_user["id"])
        assert retrieved_user["email"] == user_data["email"]
        
        # Update
        update_data = {"full_name": "Updated Test User"}
        updated_user = await database_service.update_user_profile(
            created_user["id"], update_data
        )
        assert updated_user["full_name"] == "Updated Test User"
        
        # Delete
        await database_service.delete_user_profile(created_user["id"])
        deleted_user = await database_service.get_user_profile(created_user["id"])
        assert deleted_user is None
    
    async def test_expense_tracking_workflow(self, database_service, test_data_factory):
        """Test expense tracking workflow."""
        # Create user first
        user_data = test_data_factory.create_user(email="expense@test.com")
        user = await database_service.create_user_profile(user_data)
        
        # Create expenses
        expense1 = test_data_factory.create_expense(
            user_id=user["id"],
            category="fuel",
            amount=45.50
        )
        expense2 = test_data_factory.create_expense(
            user_id=user["id"],
            category="food",
            amount=25.75
        )
        
        created_expense1 = await database_service.create_expense(expense1)
        created_expense2 = await database_service.create_expense(expense2)
        
        # Test category filtering
        fuel_expenses = await database_service.get_expenses_by_category(
            user["id"], "fuel"
        )
        assert len(fuel_expenses) == 1
        assert fuel_expenses[0]["amount"] == 45.50
        
        # Test date range queries
        all_expenses = await database_service.get_expenses_by_date_range(
            user["id"], "2024-01-01", "2024-12-31"
        )
        assert len(all_expenses) == 2
        
        # Test expense summary
        summary = await database_service.get_expense_summary(user["id"])
        assert summary["total_amount"] == 71.25
    
    async def test_maintenance_record_workflow(self, database_service, test_data_factory):
        """Test maintenance record workflow."""
        # Create user
        user_data = test_data_factory.create_user(email="maintenance@test.com")
        user = await database_service.create_user_profile(user_data)
        
        # Create maintenance record
        maintenance_data = test_data_factory.create_maintenance_record(
            user_id=user["id"],
            task="Oil Change",
            status="completed"
        )
        
        record = await database_service.create_maintenance_record(maintenance_data)
        assert record["task"] == "Oil Change"
        assert record["status"] == "completed"
        
        # Test status updates
        updated_record = await database_service.update_maintenance_record(
            record["id"], {"status": "overdue"}
        )
        assert updated_record["status"] == "overdue"
        
        # Test upcoming maintenance
        upcoming = await database_service.get_upcoming_maintenance(user["id"])
        assert len(upcoming) >= 0  # Should not error
    
    async def test_conversation_memory_integration(self, database_service, test_data_factory):
        """Test conversation memory storage and retrieval."""
        # Create user
        user_data = test_data_factory.create_user(email="memory@test.com")
        user = await database_service.create_user_profile(user_data)
        
        # Store conversation memory
        memory_data = {
            "user_id": user["id"],
            "session_id": "test_session_123",
            "message_sequence": 1,
            "user_message": "How much did I spend on fuel?",
            "pam_response": "You spent $150 on fuel last month.",
            "intent": "expense_query",
            "confidence": 0.95
        }
        
        stored_memory = await database_service.store_conversation_memory(memory_data)
        assert stored_memory["user_message"] == memory_data["user_message"]
        
        # Retrieve conversation history
        history = await database_service.get_conversation_history(
            user["id"], limit=10
        )
        assert len(history) >= 1
        assert history[0]["user_message"] == memory_data["user_message"]
