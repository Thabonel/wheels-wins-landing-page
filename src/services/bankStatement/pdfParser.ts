import { parseDocument, parseTextWithDocumentParser } from './documentParser';
import { supabase } from '@/integrations/supabase/client';

const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname.includes("staging") ||
    window.location.hostname.includes("wheels-wins-staging"))
    ? "https://wheels-wins-backend-staging.onrender.com"
    : "https://pam-backend.onrender.com");

interface ParsedTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  originalData?: Record<string, any>;
}

async function extractTextViaBackendOCR(file: File): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const formData = new FormData();
    formData.append('file', file);

    const resp = await fetch(`${BACKEND_URL}/api/v1/ocr/extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    if (!resp.ok) return null;

    const result = await resp.json();
    return result.text || null;
  } catch {
    return null;
  }
}

export const parsePdfFile = async (file: File, sessionId: string): Promise<ParsedTransaction[]> => {
  // Try backend OCR first for better text extraction
  const ocrText = await extractTextViaBackendOCR(file);

  if (ocrText && ocrText.trim().length > 50) {
    // Got good text from backend OCR - parse it for transactions
    return parseTextWithDocumentParser(ocrText, file.name);
  }

  // Fall back to client-side document parser
  return parseDocument(file, sessionId);
};
