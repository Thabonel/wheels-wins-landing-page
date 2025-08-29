import json
from pathlib import Path

with open(Path(__file__).with_suffix(".flow.json")) as f:
    flow = json.load(f)
