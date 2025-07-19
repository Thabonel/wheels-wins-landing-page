import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Directory for storing extracted trip data
DATA_DIR = Path(__file__).resolve().parent.parent / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)
