import { supabase } from '@/integrations/supabase/client';

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
  const { data, error } = await supabase
    .from('medical_records')
    .insert({
      user_id: userId,
      title: record.title,
      type: record.type,
      summary: record.summary,
      tags: record.tags,
      test_date: record.test_date,
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
