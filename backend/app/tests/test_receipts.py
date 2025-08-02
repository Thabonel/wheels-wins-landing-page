import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO
from app.main import app
from app.dependencies import verify_supabase_jwt_token

client = TestClient(app)

# Mock user for authentication
mock_user = {
    "sub": "test-user-123",
    "email": "test@example.com",
    "role": "user"
}

# Override the JWT dependency for testing
app.dependency_overrides[verify_supabase_jwt_token] = lambda: mock_user


class TestReceiptUpload:
    """Test suite for receipt upload functionality"""

    @pytest.fixture
    def mock_supabase(self):
        """Mock Supabase client"""
        with patch('app.api.v1.receipts.get_supabase_client') as mock:
            supabase_mock = MagicMock()
            mock.return_value = supabase_mock
            yield supabase_mock

    @pytest.fixture
    def valid_image_file(self):
        """Create a valid test image file"""
        file_content = b"fake image content"
        return {
            "file": ("test_receipt.jpg", BytesIO(file_content), "image/jpeg")
        }

    @pytest.fixture
    def oversized_file(self):
        """Create an oversized test file"""
        # Create content larger than 5MB
        file_content = b"x" * (6 * 1024 * 1024)
        return {
            "file": ("large_receipt.jpg", BytesIO(file_content), "image/jpeg")
        }

    @pytest.fixture
    def invalid_file_type(self):
        """Create a file with invalid type"""
        file_content = b"not an image"
        return {
            "file": ("document.pdf", BytesIO(file_content), "application/pdf")
        }

    def test_upload_receipt_success(self, mock_supabase, valid_image_file):
        """Test successful receipt upload"""
        # Mock Supabase storage upload
        mock_supabase.storage.from_.return_value.upload.return_value = {
            "path": "receipts/test-user-123/test_receipt_12345.jpg"
        }
        
        # Mock getting public URL
        mock_supabase.storage.from_.return_value.get_public_url.return_value = (
            "https://example.supabase.co/storage/v1/receipts/test-user-123/test_receipt_12345.jpg"
        )

        response = client.post(
            "/api/receipts/upload",
            files=valid_image_file,
            data={"expense_id": "123"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert data["url"].startswith("https://")
        assert "test_receipt" in data["url"]

    def test_upload_receipt_no_file(self):
        """Test upload without file"""
        response = client.post("/api/receipts/upload")
        
        assert response.status_code == 422  # Validation error

    def test_upload_receipt_oversized(self, mock_supabase, oversized_file):
        """Test upload with oversized file"""
        response = client.post(
            "/api/receipts/upload",
            files=oversized_file
        )

        assert response.status_code == 400
        assert "File size must be less than 5MB" in response.json()["detail"]

    def test_upload_receipt_invalid_type(self, mock_supabase, invalid_file_type):
        """Test upload with invalid file type"""
        response = client.post(
            "/api/receipts/upload",
            files=invalid_file_type
        )

        assert response.status_code == 400
        assert "Only image files are allowed" in response.json()["detail"]

    def test_upload_receipt_with_expense_update(self, mock_supabase, valid_image_file):
        """Test receipt upload with expense update"""
        # Mock Supabase storage upload
        mock_supabase.storage.from_.return_value.upload.return_value = {
            "path": "receipts/test-user-123/test_receipt_12345.jpg"
        }
        
        mock_supabase.storage.from_.return_value.get_public_url.return_value = (
            "https://example.supabase.co/storage/v1/receipts/test-user-123/test_receipt_12345.jpg"
        )

        # Mock expense update
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = {
            "data": [{"id": 123, "receipt_url": "https://example.supabase.co/..."}],
            "error": None
        }

        response = client.post(
            "/api/receipts/upload",
            files=valid_image_file,
            data={"expense_id": "123"}
        )

        assert response.status_code == 200
        # Verify expense update was called
        mock_supabase.table.assert_called_with("expenses")

    def test_upload_receipt_storage_error(self, mock_supabase, valid_image_file):
        """Test handling of storage errors"""
        # Mock storage error
        mock_supabase.storage.from_.return_value.upload.side_effect = Exception("Storage error")

        response = client.post(
            "/api/receipts/upload",
            files=valid_image_file
        )

        assert response.status_code == 500
        assert "Failed to upload receipt" in response.json()["detail"]

    def test_upload_receipt_unique_filename(self, mock_supabase, valid_image_file):
        """Test that uploaded files get unique names"""
        import time
        
        # Mock successful uploads
        mock_supabase.storage.from_.return_value.upload.return_value = {
            "path": "receipts/test-user-123/test_receipt_12345.jpg"
        }
        
        mock_supabase.storage.from_.return_value.get_public_url.return_value = (
            "https://example.supabase.co/storage/v1/receipts/test-user-123/test_receipt_12345.jpg"
        )

        # Upload same file twice
        response1 = client.post(
            "/api/receipts/upload",
            files=valid_image_file
        )
        
        time.sleep(0.1)  # Ensure different timestamp
        
        # Reset file pointer
        valid_image_file["file"][1].seek(0)
        
        response2 = client.post(
            "/api/receipts/upload",
            files=valid_image_file
        )

        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # URLs should be different due to timestamp
        assert response1.json()["url"] != response2.json()["url"]

    def test_delete_receipt_success(self, mock_supabase):
        """Test successful receipt deletion"""
        receipt_path = "receipts/test-user-123/test_receipt_12345.jpg"
        
        # Mock successful deletion
        mock_supabase.storage.from_.return_value.remove.return_value = {
            "data": {"Key": receipt_path},
            "error": None
        }

        response = client.delete(f"/api/receipts/delete?path={receipt_path}")

        assert response.status_code == 200
        assert response.json()["message"] == "Receipt deleted successfully"

    def test_delete_receipt_unauthorized(self, mock_supabase):
        """Test deletion of receipt from different user"""
        # Try to delete receipt from another user
        receipt_path = "receipts/other-user-456/test_receipt_12345.jpg"

        response = client.delete(f"/api/receipts/delete?path={receipt_path}")

        assert response.status_code == 403
        assert "not authorized" in response.json()["detail"]

    def test_delete_receipt_not_found(self, mock_supabase):
        """Test deletion of non-existent receipt"""
        receipt_path = "receipts/test-user-123/nonexistent.jpg"
        
        # Mock storage error for not found
        mock_supabase.storage.from_.return_value.remove.side_effect = Exception("Not found")

        response = client.delete(f"/api/receipts/delete?path={receipt_path}")

        assert response.status_code == 500
        assert "Failed to delete receipt" in response.json()["detail"]

    @pytest.mark.parametrize("filename,expected_ext", [
        ("receipt.jpg", ".jpg"),
        ("receipt.jpeg", ".jpeg"),
        ("receipt.png", ".png"),
        ("receipt.gif", ".gif"),
        ("receipt.JPEG", ".jpeg"),  # Test case insensitive
        ("receipt", ""),  # No extension
    ])
    def test_file_extension_handling(self, mock_supabase, filename, expected_ext):
        """Test proper handling of different file extensions"""
        file_content = b"fake image content"
        test_file = {
            "file": (filename, BytesIO(file_content), "image/jpeg")
        }

        mock_supabase.storage.from_.return_value.upload.return_value = {
            "path": f"receipts/test-user-123/{filename}"
        }
        
        mock_supabase.storage.from_.return_value.get_public_url.return_value = (
            f"https://example.supabase.co/storage/v1/receipts/test-user-123/{filename}"
        )

        response = client.post(
            "/api/receipts/upload",
            files=test_file
        )

        assert response.status_code == 200
        # Verify the file extension is preserved
        assert expected_ext in response.json()["url"] or expected_ext == ""


# Clean up dependency overrides after tests
def teardown_module():
    app.dependency_overrides.clear()