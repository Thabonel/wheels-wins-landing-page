# RV Trip Extractor

`rv-trip-extractor` is a simple Python project intended to collect and organize RV trip information from various sources. The project includes basic configuration management and a placeholder directory for storing extracted data.

## Setup

1. Clone the repository and navigate to the `rv-trip-extractor` directory.
2. Create a virtual environment and activate it:

```bash
python3 -m venv venv
source venv/bin/activate
```

3. Install the required dependencies:

```bash
pip install -r requirements.txt
```

4. Copy `.env` to a new file and fill in your credentials:

```bash
cp .env .env.local
```

Edit `.env.local` to provide values for:
- `YOUTUBE_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`

## Project Structure

```
rv-trip-extractor/
├── config/
│   └── settings.py
├── data/
├── src/
│   └── __init__.py
├── tests/
│   └── __init__.py
├── .env
├── .gitignore
├── README.md
└── requirements.txt
```

The `data/` directory is where extracted trip information can be stored. The `config/settings.py` module handles environment variable loading and ensures the `data/` directory exists.

Feel free to extend the project with additional modules or scripts for extracting and processing RV trip data.
