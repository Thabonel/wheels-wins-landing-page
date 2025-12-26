import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { createMedicalRecord, type MedicalRecordInput } from '@/services/MedicalService';
import type {
  MedicalRecord,
  MedicalMedication,
  MedicalEmergencyInfo,
  MedicalContextState,
  MedicalContextActions
} from '@/types/medical';

interface MedicalContextValue extends MedicalContextState, MedicalContextActions {}

const MedicalContext = createContext<MedicalContextValue | undefined>(undefined);

export const useMedical = () => {
  const context = useContext(MedicalContext);
  if (!context) {
    throw new Error('useMedical must be used within a MedicalProvider');
  }
  return context;
};

interface MedicalProviderProps {
  children: ReactNode;
}

export const MedicalProvider: React.FC<MedicalProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<MedicalMedication[]>([]);
  const [emergencyInfo, setEmergencyInfo] = useState<MedicalEmergencyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch medical records
  const fetchRecords = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching medical records:', err);
      setError('Failed to load medical records');
    }
  };

  // Fetch medications
  const fetchMedications = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('medical_medications')
        .select('*')
        .eq('user_id', user.id)
        .order('active', { ascending: false })
        .order('name');

      if (error) throw error;
      setMedications(data || []);
    } catch (err) {
      console.error('Error fetching medications:', err);
      setError('Failed to load medications');
    }
  };

  // Fetch emergency info
  const fetchEmergencyInfo = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('medical_emergency_info')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 or 1 rows gracefully

      // Handle 406 (Not Acceptable) and other common errors gracefully
      if (error) {
        // Check if this is a 406 or "no rows" scenario - treat as "not configured yet"
        const is406or404 = error.code === 'PGRST116' || // No rows returned
                          error.code === 'PGRST301' || // 406 Not Acceptable
                          error.message?.includes('406') ||
                          error.message?.toLowerCase().includes('not acceptable');

        if (is406or404) {
          // Not an error - just no emergency info configured yet
          console.log('⚠️ No emergency info configured (406/404) - showing empty state');
          setEmergencyInfo(null);
          return;
        }

        // For other errors, log but don't break the UI
        console.error('Error fetching emergency info:', error);
        setEmergencyInfo(null);
        // Don't set global error state - let the UI show empty state
        return;
      }

      setEmergencyInfo(data);
    } catch (err) {
      console.error('Unexpected error fetching emergency info:', err);
      // Set to null to show empty state instead of crashing
      setEmergencyInfo(null);
      // Don't set error state to avoid breaking the dashboard
    }
  };

  // Load all medical data
  const loadMedicalData = async () => {
    setIsLoading(true);
    setError(null);
    
    await Promise.all([
      fetchRecords(),
      fetchMedications(),
      fetchEmergencyInfo()
    ]);
    
    setIsLoading(false);
  };

  // Add medical record
  const addRecord = async (record: MedicalRecordInput) => {
    if (!user?.id) return;

    try {
      const newRecord = await createMedicalRecord(user.id, record);
      setRecords(prev => [newRecord as any, ...prev]);
      toast.success('Medical record added successfully');
      return newRecord;
    } catch (err) {
      console.error('Error adding medical record:', err);
      toast.error('Failed to add medical record');
      throw err;
    }
  };

  // Update medical record
  const updateRecord = async (id: string, updates: Partial<MedicalRecord>) => {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setRecords(prev => prev.map(r => r.id === id ? data : r));
      toast.success('Medical record updated');
      return data;
    } catch (err) {
      console.error('Error updating medical record:', err);
      toast.error('Failed to update medical record');
      throw err;
    }
  };

  // Delete medical record
  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setRecords(prev => prev.filter(r => r.id !== id));
      toast.success('Medical record deleted');
    } catch (err) {
      console.error('Error deleting medical record:', err);
      toast.error('Failed to delete medical record');
      throw err;
    }
  };

  // Add medication
  const addMedication = async (medication: Omit<MedicalMedication, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('medical_medications')
        .insert({ ...medication, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      setMedications(prev => [...prev, data]);
      toast.success('Medication added successfully');
      return data;
    } catch (err) {
      console.error('Error adding medication:', err);
      toast.error('Failed to add medication');
      throw err;
    }
  };

  // Update medication
  const updateMedication = async (id: string, updates: Partial<MedicalMedication>) => {
    try {
      const { data, error } = await supabase
        .from('medical_medications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setMedications(prev => prev.map(m => m.id === id ? data : m));
      toast.success('Medication updated');
      return data;
    } catch (err) {
      console.error('Error updating medication:', err);
      toast.error('Failed to update medication');
      throw err;
    }
  };

  // Delete medication
  const deleteMedication = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medical_medications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setMedications(prev => prev.filter(m => m.id !== id));
      toast.success('Medication deleted');
    } catch (err) {
      console.error('Error deleting medication:', err);
      toast.error('Failed to delete medication');
      throw err;
    }
  };

  // Update emergency info
  const updateEmergencyInfo = async (info: Partial<MedicalEmergencyInfo>) => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('medical_emergency_info')
        .upsert({ ...info, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      setEmergencyInfo(data);
      toast.success('Emergency information updated');
      return data;
    } catch (err) {
      console.error('Error updating emergency info:', err);
      toast.error('Failed to update emergency information');
      throw err;
    }
  };

  // Load data when user changes
  useEffect(() => {
    if (user?.id) {
      loadMedicalData();
    } else {
      setRecords([]);
      setMedications([]);
      setEmergencyInfo(null);
      setIsLoading(false);
    }
  }, [user?.id]);

  const value: MedicalContextValue = {
    // State
    records,
    medications,
    emergencyInfo,
    isLoading,
    error,
    
    // Actions
    fetchRecords,
    fetchMedications,
    fetchEmergencyInfo,
    addRecord,
    updateRecord,
    deleteRecord,
    addMedication,
    updateMedication,
    deleteMedication,
    updateEmergencyInfo,
    refreshData: loadMedicalData
  };

  return (
    <MedicalContext.Provider value={value}>
      {children}
    </MedicalContext.Provider>
  );
};