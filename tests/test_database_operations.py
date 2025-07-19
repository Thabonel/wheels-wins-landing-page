import sys
from pathlib import Path
from unittest.mock import patch

# Ensure src package is importable
repo_root = Path(__file__).resolve().parent.parent
src_path = repo_root / "src"
for p in (repo_root, src_path):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from src.database import SupabaseClient


def sample_trip():
    return {
        "name": "Test Trip",
        "start_location": "A",
        "end_location": "B",
        "duration_days": 3,
    }


@patch("src.database.create_client", side_effect=Exception("no supabase"))
def test_crud_operations(mock_create):
    client = SupabaseClient("u", "k")
    trip = client.create_trip(sample_trip())
    fetched = client.read_trip(trip.id)
    assert fetched == trip
    updated = client.update_trip(trip.id, name="New")
    assert updated.name == "New"
    assert client.delete_trip(trip.id)
