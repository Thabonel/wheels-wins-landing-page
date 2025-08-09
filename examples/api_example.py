import os
import requests

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api")
TOKEN = os.getenv("API_TOKEN")

headers = {
    "Authorization": f"Bearer {TOKEN}" if TOKEN else "",
    "Content-Type": "application/json",
}

# Example: fetch budgets for current user
resp = requests.get(f"{BASE_URL}/budgets", headers=headers)
print("Status:", resp.status_code)
print(resp.json())
