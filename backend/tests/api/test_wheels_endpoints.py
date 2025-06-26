
import pytest
from httpx import AsyncClient


class TestWheelsEndpoints:
    """API tests for Wheels (travel) endpoints."""
    
    async def test_get_maintenance_records(self, test_client: AsyncClient, sample_user_data):
        """Test retrieving maintenance records."""
        # Act
        response = await test_client.get(
            f"/api/v1/wheels/maintenance/{sample_user_data['id']}"
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "maintenance_records" in data
        assert isinstance(data["maintenance_records"], list)
    
    async def test_create_maintenance_record(self, test_client: AsyncClient, sample_maintenance_data):
        """Test creating a maintenance record."""
        # Arrange
        maintenance_request = {
            "user_id": sample_maintenance_data["user_id"],
            "task": sample_maintenance_data["task"],
            "date": sample_maintenance_data["date"],
            "mileage": sample_maintenance_data["mileage"],
            "cost": sample_maintenance_data["cost"]
        }
        
        # Act
        response = await test_client.post("/api/v1/wheels/maintenance", json=maintenance_request)
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["task"] == maintenance_request["task"]
        assert data["cost"] == maintenance_request["cost"]
    
    async def test_get_fuel_logs(self, test_client: AsyncClient, sample_user_data):
        """Test retrieving fuel logs."""
        # Act
        response = await test_client.get(
            f"/api/v1/wheels/fuel/{sample_user_data['id']}"
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "fuel_logs" in data
        assert isinstance(data["fuel_logs"], list)
    
    async def test_create_fuel_log(self, test_client: AsyncClient, sample_user_data):
        """Test creating a fuel log entry."""
        # Arrange
        fuel_request = {
            "user_id": sample_user_data["id"],
            "date": "2024-01-15",
            "location": "Shell Station",
            "volume": 50.0,
            "price": 1.65,
            "total": 82.50,
            "odometer": 75000
        }
        
        # Act
        response = await test_client.post("/api/v1/wheels/fuel", json=fuel_request)
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["location"] == fuel_request["location"]
        assert data["total"] == fuel_request["total"]
    
    async def test_get_camping_locations(self, test_client: AsyncClient):
        """Test retrieving camping locations."""
        # Act
        response = await test_client.get("/api/v1/wheels/camping")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "locations" in data
        assert isinstance(data["locations"], list)
    
    async def test_search_camping_locations(self, test_client: AsyncClient):
        """Test searching camping locations."""
        # Arrange
        search_params = {
            "latitude": -33.8688,
            "longitude": 151.2093,
            "radius": 50,
            "limit": 10
        }
        
        # Act
        response = await test_client.get("/api/v1/wheels/camping/search", params=search_params)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "locations" in data
        assert len(data["locations"]) <= search_params["limit"]
