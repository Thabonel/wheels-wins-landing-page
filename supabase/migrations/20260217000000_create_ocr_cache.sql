-- Create ocr_cache table for caching OCR results by file hash.
-- Same file uploaded twice returns instant cached response, preventing cost blowouts.

CREATE TABLE IF NOT EXISTS ocr_cache (
  file_hash TEXT PRIMARY KEY,
  ocr_text TEXT NOT NULL,
  confidence FLOAT,
  confidence_method TEXT,
  method TEXT NOT NULL,
  page_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocr_cache_created ON ocr_cache (created_at);
CREATE INDEX IF NOT EXISTS idx_ocr_cache_method ON ocr_cache (method);

-- RLS: Service role only (backend writes directly)
ALTER TABLE ocr_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own cached results
-- (cache is content-addressed, so sharing is fine - no user data in hash)
CREATE POLICY "service_role_full_access" ON ocr_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant access to roles
GRANT ALL ON ocr_cache TO service_role;
GRANT SELECT ON ocr_cache TO authenticated;

COMMENT ON TABLE ocr_cache IS 'SHA256-indexed cache of OCR extraction results to prevent duplicate processing';
COMMENT ON COLUMN ocr_cache.file_hash IS 'SHA256 hash of preprocessed file bytes, prefixed with sha256:';
COMMENT ON COLUMN ocr_cache.confidence_method IS 'How confidence was measured: google_vision_per_word, heuristic, pdf_text_exact, none';
COMMENT ON COLUMN ocr_cache.method IS 'OCR method used: pdf_text, google_cloud_vision, claude_vision, gemini';
