
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    print("Attempting to import app.services.pam.tools.budget.track_savings...")
    from app.services.pam.tools.budget import track_savings
    print("✅ Success!")
except Exception as e:
    print(f"❌ Failed: {e}")
    import traceback
    traceback.print_exc()
