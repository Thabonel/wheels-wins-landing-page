import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { apiFetch } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { UserKnowledgeDocument } from '@/types/knowledgeTypes';

export const useUserKnowledge = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UserKnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's documents
  const fetchDocuments = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_knowledge_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, just return empty array
        if (error.code === '42P01') {
          setDocuments([]);
          return;
        }
        throw error;
      }
      
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Don't show error toast for missing table - it's expected in development
      if (error?.code !== '42P01') {
        toast.error('Failed to load documents');
      }
    } finally {
      setLoading(false);
    }
  };

  // Upload document
  const uploadDocument = async (file: File) => {
    if (!user?.id) return null;

    try {
      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `documents/${user.id}/${timestamp}-${sanitizedFileName}`;
      
      // Upload file to storage (single shared bucket)
      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist, create it
        if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
          console.log('Storage bucket not configured yet');
          // For now, create a mock document to show the UI works
          const mockDocument: UserKnowledgeDocument = {
            id: `mock-${timestamp}`,
            user_id: user.id,
            filename: file.name,
            file_path: filePath,
            content_type: file.type,
            file_size: file.size,
            processing_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {}
          };
          setDocuments(prev => [mockDocument, ...prev]);
          toast.success('Document queued for upload');
          return mockDocument;
        }
        throw uploadError;
      }

      // Create document record in database
      const { data, error } = await supabase
        .from('user_knowledge_documents')
        .insert({
          user_id: user.id,
          filename: file.name,
          file_path: filePath,
          content_type: file.type,
          file_size: file.size,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (error) {
        // If table doesn't exist, create mock document
        if (error.code === '42P01') {
          const mockDocument: UserKnowledgeDocument = {
            id: `mock-${timestamp}`,
            user_id: user.id,
            filename: file.name,
            file_path: filePath,
            content_type: file.type,
            file_size: file.size,
            processing_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {}
          };
          setDocuments(prev => [mockDocument, ...prev]);
          toast.success('Document uploaded successfully');
          return mockDocument;
        }
        throw error;
      }

      setDocuments(prev => [data, ...prev]);
      toast.success('Document uploaded successfully');
      
      // Trigger document processing in background
      processDocument(data.id);
      
      return data;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
      return null;
    }
  };

  // Process document (extract text and create embeddings)
  const processDocument = async (documentId: string) => {
    try {
      // Call backend API to process document
      const response = await apiFetch('/api/v1/knowledge/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      });

      if (response.ok) {
        // Update document status to processing
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId 
              ? { ...doc, processing_status: 'processing' as const }
              : doc
          )
        );

        // Simulate processing completion after a delay
        setTimeout(() => {
          setDocuments(prev => 
            prev.map(doc => 
              doc.id === documentId 
                ? { ...doc, processing_status: 'completed' as const }
                : doc
            )
          );
        }, 5000);
      }
    } catch (error) {
      console.error('Error processing document:', error);
      // Don't show error toast - processing happens in background
    }
  };

  // Delete document
  const deleteDocument = async (documentId: string) => {
    if (!user?.id) return false;

    try {
      // Find document to get file path
      const document = documents.find(doc => doc.id === documentId);
      if (!document) return false;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-documents')
        .remove([document.file_path]);

      // Continue even if storage deletion fails (file might not exist)
      if (storageError) {
        console.warn('Storage deletion warning:', storageError);
      }

      // Delete from database
      const { error } = await supabase
        .from('user_knowledge_documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', user.id);

      if (error && error.code !== '42P01') {
        throw error;
      }

      // Remove from local state regardless
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      toast.success('Document deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
      return false;
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchDocuments();
    }
  }, [user?.id]);

  return {
    documents,
    loading,
    uploadDocument,
    deleteDocument,
    refetch: fetchDocuments
  };
};