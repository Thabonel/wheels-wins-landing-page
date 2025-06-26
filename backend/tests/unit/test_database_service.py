
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.database import DatabaseService


class TestDatabaseService:
    """Unit tests for DatabaseService."""
    
    @pytest.fixture
    def database_service(self, mock_supabase_client):
        """Create DatabaseService instance with mocked client."""
        service = DatabaseService()
        service.client = mock_supabase_client
        return service
    
    async def test_get_user_profile_success(self, database_service, sample_user_data):
        """Test successful user profile retrieval."""
        # Arrange
        user_id = sample_user_data["id"]
        database_service.client.table().select().eq().execute.return_value.data = [sample_user_data]
        
        # Act
        result = await database_service.get_user_profile(user_id)
        
        # Assert
        assert result == sample_user_data
        database_service.client.table.assert_called_with("profiles")
    
    async def test_get_user_profile_not_found(self, database_service):
        """Test user profile not found."""
        # Arrange
        user_id = "non-existent-user"
        database_service.client.table().select().eq().execute.return_value.data = []
        
        # Act
        result = await database_service.get_user_profile(user_id)
        
        # Assert
        assert result is None
    
    async def test_create_expense_success(self, database_service, sample_expense_data):
        """Test successful expense creation."""
        # Arrange
        database_service.client.table().insert().execute.return_value.data = [sample_expense_data]
        
        # Act
        result = await database_service.create_expense(sample_expense_data)
        
        # Assert
        assert result == sample_expense_data
        database_service.client.table.assert_called_with("expenses")
    
    async def test_get_expenses_by_category(self, database_service, sample_expense_data):
        """Test retrieving expenses by category."""
        # Arrange
        user_id = sample_expense_data["user_id"]
        category = "fuel"
        expenses = [sample_expense_data]
        database_service.client.table().select().eq().eq().execute.return_value.data = expenses
        
        # Act
        result = await database_service.get_expenses_by_category(user_id, category)
        
        # Assert
        assert result == expenses
    
    async def test_update_maintenance_record(self, database_service, sample_maintenance_data):
        """Test updating maintenance record."""
        # Arrange
        record_id = sample_maintenance_data["id"]
        update_data = {"status": "overdue"}
        updated_record = {**sample_maintenance_data, **update_data}
        database_service.client.table().update().eq().execute.return_value.data = [updated_record]
        
        # Act
        result = await database_service.update_maintenance_record(record_id, update_data)
        
        # Assert
        assert result == updated_record
        database_service.client.table.assert_called_with("maintenance_records")
