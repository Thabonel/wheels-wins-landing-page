import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_BACKEND_URL || 
  'https://wheels-wins-backend-staging.onrender.com';

interface UploadReceiptResponse {
  success: boolean;
  receipt_url: string;
  filename: string;
  size: number;
  content_type: string;
}

export const receiptService = {
  /**
   * Upload a receipt image to Supabase storage
   * @param file - The image file to upload
   * @param expenseId - Optional expense ID to link the receipt to
   * @returns The upload response with the receipt URL
   */
  async uploadReceipt(file: File, expenseId?: number): Promise<UploadReceiptResponse> {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    if (expenseId) {
      formData.append('expense_id', expenseId.toString());
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/receipts/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload receipt');
      }

      const data: UploadReceiptResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Receipt upload error:', error);
      throw error;
    }
  },

  /**
   * Delete a receipt from storage
   * @param filename - The filename/path of the receipt to delete
   */
  async deleteReceipt(filename: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/receipts/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete receipt');
      }
    } catch (error) {
      console.error('Receipt deletion error:', error);
      throw error;
    }
  },

  /**
   * Upload receipt using Supabase client directly (alternative method)
   * This can be used as a fallback if the API endpoint is not available
   */
  async uploadReceiptDirect(file: File, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${userId}/receipts/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(fileName, file);

    if (error) {
      console.error('Supabase storage error:', error);
      throw new Error('Failed to upload receipt');
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);

    return publicUrl;
  }
};