import { supabase } from '@/integrations/supabase/client';

/**
 * Get a signed URL to view/download a medical document from Supabase Storage
 * @param documentPath - The path stored in document_url field
 * @returns Signed URL valid for 1 hour, or null if error
 */
export async function getDocumentSignedUrl(documentPath: string): Promise<string | null> {
  if (!documentPath) return null;

  const { data, error } = await supabase.storage
    .from('medical-documents')
    .createSignedUrl(documentPath, 3600); // 1 hour expiry

  if (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }

  return data?.signedUrl || null;
}

/**
 * Download a medical document
 * @param documentPath - The path stored in document_url field
 * @param filename - Optional filename for download
 */
export async function downloadDocument(documentPath: string, filename?: string): Promise<void> {
  const signedUrl = await getDocumentSignedUrl(documentPath);
  if (!signedUrl) {
    throw new Error('Could not get download URL');
  }

  // Create a temporary link and click it to download
  const link = document.createElement('a');
  link.href = signedUrl;
  link.download = filename || documentPath.split('/').pop() || 'document';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface MedicalRecordInput {
  title: string;
  type: string;
  summary?: string | null;
  tags?: string[] | null;
  test_date?: string | null;
  document_url?: string | null;
  content_json?: any | null;
  ocr_text?: string | null;
}

export async function createMedicalRecord(
  userId: string,
  record: MedicalRecordInput
) {
  // date_recorded is NOT NULL in database - use test_date if available, otherwise today
  const dateRecorded = record.test_date || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('medical_records')
    .insert({
      user_id: userId,
      title: record.title,
      type: record.type,
      summary: record.summary,
      tags: record.tags,
      test_date: record.test_date,
      date_recorded: dateRecorded,  // Required NOT NULL column
      document_url: record.document_url,
      content_json: record.content_json,
      ocr_text: record.ocr_text
    })
    .select()
    .single();

  if (error) throw error;

  // Transform response with type assertions (like ExpensesService pattern)
  return {
    id: data!.id as string,
    user_id: data!.user_id as string,
    title: data!.title as string,
    type: data!.type as string,
    summary: data!.summary as string | null,
    tags: data!.tags as string[] | null,
    test_date: data!.test_date as string | null,
    document_url: data!.document_url as string | null,
    content_json: data!.content_json || null,
    ocr_text: data!.ocr_text as string | null,
    created_at: data!.created_at as string,
    updated_at: data!.updated_at as string
  };
}
