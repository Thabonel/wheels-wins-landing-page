/**
 * Supabase Database Types for Medical Module
 * Auto-generated types that match our medical schema
 */

export interface MedicalDatabase {
  public: {
    Tables: {
      medical_records: {
        Row: {
          id: string;
          user_id: string;
          type: 'document' | 'lab_result' | 'prescription' | 'insurance_card' | 
                'doctor_note' | 'vaccination' | 'imaging' | 'other';
          title: string;
          summary: string | null;
          tags: string[] | null;
          test_date: string | null;
          document_url: string | null;
          content_json: any | null;
          ocr_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'document' | 'lab_result' | 'prescription' | 'insurance_card' | 
                'doctor_note' | 'vaccination' | 'imaging' | 'other';
          title: string;
          summary?: string | null;
          tags?: string[] | null;
          test_date?: string | null;
          document_url?: string | null;
          content_json?: any | null;
          ocr_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'document' | 'lab_result' | 'prescription' | 'insurance_card' | 
                 'doctor_note' | 'vaccination' | 'imaging' | 'other';
          title?: string;
          summary?: string | null;
          tags?: string[] | null;
          test_date?: string | null;
          document_url?: string | null;
          content_json?: any | null;
          ocr_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      medical_medications: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          dosage: string | null;
          frequency: 'once_daily' | 'twice_daily' | 'three_times_daily' | 
                     'four_times_daily' | 'as_needed' | 'weekly' | 'monthly' | null;
          refill_date: string | null;
          prescribed_by: string | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          dosage?: string | null;
          frequency?: 'once_daily' | 'twice_daily' | 'three_times_daily' | 
                      'four_times_daily' | 'as_needed' | 'weekly' | 'monthly' | null;
          refill_date?: string | null;
          prescribed_by?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          dosage?: string | null;
          frequency?: 'once_daily' | 'twice_daily' | 'three_times_daily' | 
                      'four_times_daily' | 'as_needed' | 'weekly' | 'monthly' | null;
          refill_date?: string | null;
          prescribed_by?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      medical_emergency_info: {
        Row: {
          id: string;
          user_id: string;
          blood_type: string | null;
          allergies: string[] | null;
          medical_conditions: string[] | null;
          emergency_contacts: {
            name: string;
            phone: string;
            relationship: string;
            isPrimary: boolean;
          }[] | null;
          primary_doctor: {
            name?: string;
            phone?: string;
            practice?: string;
          } | null;
          insurance_info: {
            provider?: string;
            policyNumber?: string;
            groupNumber?: string;
            phone?: string;
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          blood_type?: string | null;
          allergies?: string[] | null;
          medical_conditions?: string[] | null;
          emergency_contacts?: {
            name: string;
            phone: string;
            relationship: string;
            isPrimary: boolean;
          }[] | null;
          primary_doctor?: {
            name?: string;
            phone?: string;
            practice?: string;
          } | null;
          insurance_info?: {
            provider?: string;
            policyNumber?: string;
            groupNumber?: string;
            phone?: string;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          blood_type?: string | null;
          allergies?: string[] | null;
          medical_conditions?: string[] | null;
          emergency_contacts?: {
            name: string;
            phone: string;
            relationship: string;
            isPrimary: boolean;
          }[] | null;
          primary_doctor?: {
            name?: string;
            phone?: string;
            practice?: string;
          } | null;
          insurance_info?: {
            provider?: string;
            policyNumber?: string;
            groupNumber?: string;
            phone?: string;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Helper types for easier use
export type MedicalRecord = MedicalDatabase['public']['Tables']['medical_records']['Row'];
export type MedicalRecordInsert = MedicalDatabase['public']['Tables']['medical_records']['Insert'];
export type MedicalRecordUpdate = MedicalDatabase['public']['Tables']['medical_records']['Update'];

export type MedicalMedication = MedicalDatabase['public']['Tables']['medical_medications']['Row'];
export type MedicalMedicationInsert = MedicalDatabase['public']['Tables']['medical_medications']['Insert'];
export type MedicalMedicationUpdate = MedicalDatabase['public']['Tables']['medical_medications']['Update'];

export type MedicalEmergencyInfo = MedicalDatabase['public']['Tables']['medical_emergency_info']['Row'];
export type MedicalEmergencyInfoInsert = MedicalDatabase['public']['Tables']['medical_emergency_info']['Insert'];
export type MedicalEmergencyInfoUpdate = MedicalDatabase['public']['Tables']['medical_emergency_info']['Update'];

// Record type enum for type safety
export enum MedicalRecordType {
  DOCUMENT = 'document',
  LAB_RESULT = 'lab_result',
  PRESCRIPTION = 'prescription',
  INSURANCE_CARD = 'insurance_card',
  DOCTOR_NOTE = 'doctor_note',
  VACCINATION = 'vaccination',
  IMAGING = 'imaging',
  OTHER = 'other'
}

// Medication frequency enum
export enum MedicationFrequency {
  ONCE_DAILY = 'once_daily',
  TWICE_DAILY = 'twice_daily',
  THREE_TIMES_DAILY = 'three_times_daily',
  FOUR_TIMES_DAILY = 'four_times_daily',
  AS_NEEDED = 'as_needed',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}