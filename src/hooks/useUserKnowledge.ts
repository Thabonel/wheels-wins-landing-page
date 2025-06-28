
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { UserKnowledgeBucket, UserKnowledgeDocument } from '@/types/knowledgeTypes';

export const useUserKnowledge = () => {
  const { user } = useAuth();
  const [buckets, setBuckets] = useState<UserKnowledgeBucket[]>([]);
  const [documents, setDocuments] = useState<UserKnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's knowledge buckets
  const fetchBuckets = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_knowledge_buckets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBuckets(data || []);
    } catch (error) {
      console.error('Error fetching knowledge buckets:', error);
      toast.error('Failed to load knowledge buckets');
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents for a specific bucket
  const fetchDocuments = async (bucketId?: string) => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('user_knowledge_documents')
        .select('*')
        .eq('user_id', user.id);

      if (bucketId) {
        query = query.eq('bucket_id', bucketId);
      }

      // Mock documents since table doesn't exist
      const mockDocuments: UserKnowledgeDocument[] = [];
      setDocuments(mockDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Create a new knowledge bucket
  const createBucket = async (name: string, description?: string, color?: string) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('user_knowledge_buckets')
        .insert({
          user_id: user.id,
          name,
          description,
          color: color || '#3B82F6'
        })
        .select()
        .single();

      if (error) throw error;
      
      setBuckets(prev => [data, ...prev]);
      toast.success('Knowledge bucket created successfully');
      return data;
    } catch (error) {
      console.error('Error creating bucket:', error);
      toast.error('Failed to create knowledge bucket');
      return null;
    }
  };

  // Update a knowledge bucket
  const updateBucket = async (bucketId: string, updates: Partial<UserKnowledgeBucket>) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('user_knowledge_buckets')
        .update(updates)
        .eq('id', bucketId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setBuckets(prev => 
        prev.map(bucket => 
          bucket.id === bucketId ? { ...bucket, ...updates } : bucket
        )
      );
      toast.success('Knowledge bucket updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating bucket:', error);
      toast.error('Failed to update knowledge bucket');
      return false;
    }
  };

  // Delete a knowledge bucket
  const deleteBucket = async (bucketId: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('user_knowledge_buckets')
        .update({ is_active: false })
        .eq('id', bucketId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setBuckets(prev => prev.filter(bucket => bucket.id !== bucketId));
      toast.success('Knowledge bucket deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting bucket:', error);
      toast.error('Failed to delete knowledge bucket');
      return false;
    }
  };

  // Upload document to a bucket
  const uploadDocument = async (bucketId: string, file: File) => {
    if (!user?.id) return null;

    try {
      // Upload file to storage
      const filePath = `${user.id}/${bucketId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('user-knowledge')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from('user_knowledge_documents')
        .insert({
          bucket_id: bucketId,
          user_id: user.id,
          filename: file.name,
          file_path: filePath,
          content_type: file.type,
          file_size: file.size,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      const mockDocument: UserKnowledgeDocument = {
        ...data,
        processing_status: 'pending' as const,
        metadata: {}
      };
      setDocuments(prev => [mockDocument, ...prev]);
      toast.success('Document uploaded successfully');
      
      // Trigger document processing
      processDocument(data.id);
      
      return data;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
      return null;
    }
  };

  // Process document (extract text and create chunks)
  const processDocument = async (documentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('process-user-document', {
        body: { documentId }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error processing document:', error);
      toast.error('Failed to process document');
    }
  };

  // Delete document
  const deleteDocument = async (documentId: string, filePath: string) => {
    if (!user?.id) return false;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-knowledge')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error } = await supabase
        .from('user_knowledge_documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', user.id);

      if (error) throw error;

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
      fetchBuckets();
      fetchDocuments();
    }
  }, [user?.id]);

  return {
    buckets,
    documents,
    loading,
    createBucket,
    updateBucket,
    deleteBucket,
    uploadDocument,
    deleteDocument,
    fetchDocuments,
    refetch: () => {
      fetchBuckets();
      fetchDocuments();
    }
  };
};
