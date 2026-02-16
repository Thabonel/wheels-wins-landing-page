CREATE TABLE IF NOT EXISTS ocr_cache (
  file_hash TEXT PRIMARY KEY,
  ocr_text TEXT NOT NULL,
  confidence FLOAT,
  confidence_method TEXT,
  method TEXT NOT NULL,
  page_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocr_cache_created ON ocr_cache (created_at);
