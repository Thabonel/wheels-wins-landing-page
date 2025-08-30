/**
 * Medical Module Type Definitions
 * Adapted from Doctor Dok for Wheels & Wins
 */

import { z } from 'zod';

// ============= Core Medical Types =============

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

export enum MedicationFrequency {
  ONCE_DAILY = 'once_daily',
  TWICE_DAILY = 'twice_daily',
  THREE_TIMES_DAILY = 'three_times_daily',
  FOUR_TIMES_DAILY = 'four_times_daily',
  AS_NEEDED = 'as_needed',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

// ============= Zod Schemas =============

export const medicalFindingSchema = z.object({
  name: z.string().optional(),
  value: z.string().optional(),
  unit: z.string().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
  interpretation: z.string().optional(),
  notes: z.string().optional(),
});

export const medicalRecordSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  type: z.nativeEnum(MedicalRecordType),
  title: z.string().min(1),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  testDate: z.date().optional(),
  findings: z.array(medicalFindingSchema).optional(),
  conclusion: z.string().optional(),
  documentUrl: z.string().optional(),
  contentJson: z.any().optional(), // Flexible JSON storage
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const medicationSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  dosage: z.string(),
  frequency: z.nativeEnum(MedicationFrequency),
  refillDate: z.date().optional(),
  prescribedBy: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const emergencyContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  relationship: z.string(),
  isPrimary: z.boolean().default(false),
});

export const emergencyInfoSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  bloodType: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  emergencyContacts: z.array(emergencyContactSchema),
  primaryDoctor: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    practice: z.string().optional(),
  }).optional(),
  insuranceInfo: z.object({
    provider: z.string().optional(),
    policyNumber: z.string().optional(),
    groupNumber: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  updatedAt: z.date().optional(),
});

// ============= Type Exports =============

export type MedicalFinding = z.infer<typeof medicalFindingSchema>;
export type MedicalRecord = z.infer<typeof medicalRecordSchema>;
export type Medication = z.infer<typeof medicationSchema>;
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type EmergencyInfo = z.infer<typeof emergencyInfoSchema>;

// ============= UI Helper Types =============

export interface MedicalDocument {
  id: string;
  file: File;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
  uploadProgress?: number;
  url?: string;
  thumbnailUrl?: string;
  ocrText?: string;
}

export interface MedicalTimelineEntry {
  id: string;
  date: Date;
  type: 'record' | 'medication' | 'appointment' | 'note';
  title: string;
  description?: string;
  icon?: string;
  data?: any;
}

export interface MedicationReminder {
  medicationId: string;
  medicationName: string;
  time: Date;
  dosage: string;
  taken: boolean;
  notes?: string;
}

// ============= Feature Flags =============

export interface MedicalFeatureFlags {
  enabled: boolean;
  ocrEnabled: boolean;
  aiConsultationEnabled: boolean;
  remindersEnabled: boolean;
  sharingEnabled: boolean;
}

// ============= Context Types =============

export interface MedicalContextState {
  records: MedicalRecord[];
  medications: Medication[];
  emergencyInfo: EmergencyInfo | null;
  isLoading: boolean;
  error: string | null;
  featureFlags: MedicalFeatureFlags;
}

export interface MedicalContextActions {
  // Records
  fetchRecords: () => Promise<void>;
  addRecord: (record: Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateRecord: (id: string, updates: Partial<MedicalRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  
  // Medications
  fetchMedications: () => Promise<void>;
  addMedication: (medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMedication: (id: string, updates: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  toggleMedicationActive: (id: string) => Promise<void>;
  
  // Emergency Info
  fetchEmergencyInfo: () => Promise<void>;
  updateEmergencyInfo: (info: Partial<EmergencyInfo>) => Promise<void>;
  
  // Documents
  uploadDocument: (file: File, type: MedicalRecordType) => Promise<void>;
  deleteDocument: (recordId: string) => Promise<void>;
}

// ============= API Response Types =============

export interface MedicalApiResponse<T> {
  data?: T;
  error?: string;
  status: 'success' | 'error';
}

// ============= Constants =============

export const MEDICAL_ROUTES = {
  BASE: '/you/medical',
  DOCUMENTS: '/you/medical/documents',
  MEDICATIONS: '/you/medical/medications',
  EMERGENCY: '/you/medical/emergency',
  TIMELINE: '/you/medical/timeline',
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

// ============= Validation Helpers =============

export const validateMedicalRecord = (record: unknown): MedicalRecord => {
  return medicalRecordSchema.parse(record);
};

export const validateMedication = (medication: unknown): Medication => {
  return medicationSchema.parse(medication);
};

export const validateEmergencyInfo = (info: unknown): EmergencyInfo => {
  return emergencyInfoSchema.parse(info);
};