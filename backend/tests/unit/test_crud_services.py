import pytest
from app.services.profiles_service import ProfilesService
from app.services.products_service import ProductsService
from app.services.orders_service import OrdersService
from app.services.maintenance_service import MaintenanceService
from app.services.custom_routes_service import CustomRoutesService


@pytest.fixture
def profiles_service(mock_supabase_client):
    service = ProfilesService()
    service.client = mock_supabase_client
    return service


@pytest.fixture
def products_service(mock_supabase_client):
    service = ProductsService()
    service.client = mock_supabase_client
    return service


@pytest.fixture
def orders_service(mock_supabase_client):
    service = OrdersService()
    service.client = mock_supabase_client
    return service


@pytest.fixture
def maintenance_service_fixture(mock_supabase_client):
    service = MaintenanceService()
    service.client = mock_supabase_client
    return service


@pytest.fixture
def custom_routes_service_fixture(mock_supabase_client):
    service = CustomRoutesService()
    service.client = mock_supabase_client
    return service


@pytest.mark.asyncio
async def test_create_profile(profiles_service, sample_user_data):
    profiles_service.client.table().insert().execute.return_value.data = [sample_user_data]
    result = await profiles_service.create_profile(sample_user_data)
    assert result == sample_user_data
    profiles_service.client.table.assert_called_with("profiles")


@pytest.mark.asyncio
async def test_update_product(products_service, sample_product_data):
    updated = {**sample_product_data, "price": 19.99}
    products_service.client.table().update().eq().execute.return_value.data = [updated]
    result = await products_service.update_product(sample_product_data["id"], {"price": 19.99})
    assert result == updated
    products_service.client.table.assert_called_with("shop_products")


@pytest.mark.asyncio
async def test_get_order(orders_service, sample_order_data):
    orders_service.client.table().select().eq().single().execute.return_value.data = sample_order_data
    result = await orders_service.get_order(sample_order_data["id"])
    assert result == sample_order_data
    orders_service.client.table.assert_called_with("shop_orders")


@pytest.mark.asyncio
async def test_delete_maintenance_record(maintenance_service_fixture):
    maintenance_service_fixture.client.table().delete().eq().execute.return_value.data = [True]
    success = await maintenance_service_fixture.delete_record(1)
    assert success
    maintenance_service_fixture.client.table.assert_called_with("maintenance_records")


@pytest.mark.asyncio
async def test_list_custom_routes(custom_routes_service_fixture, sample_custom_route_data):
    custom_routes_service_fixture.client.table().select().eq().execute.return_value.data = [sample_custom_route_data]
    result = await custom_routes_service_fixture.list_routes(sample_custom_route_data["user_id"])
    assert result == [sample_custom_route_data]
    custom_routes_service_fixture.client.table.assert_called_with("custom_routes")
