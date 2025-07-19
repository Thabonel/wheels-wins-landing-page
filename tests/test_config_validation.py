import sys
from pathlib import Path
import os
import pytest

# Ensure src package is importable
repo_root = Path(__file__).resolve().parent.parent
src_path = repo_root / "src"
for p in (repo_root, src_path):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))



def test_settings_load(monkeypatch):
    monkeypatch.setenv("YOUTUBE_API_KEY", "k")
    monkeypatch.setenv("OPENAI_API_KEY", "x")
    monkeypatch.setenv("SUPABASE_URL", "http://x")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "a")
    import importlib
    Settings = importlib.import_module("config.settings").Settings
    cfg = Settings.load()
    assert cfg.youtube.API_KEY == "k"
