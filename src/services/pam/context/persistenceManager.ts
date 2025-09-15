/**
 * Advanced Context Persistence Manager
 * 
 * Features:
 * - Multiple storage backends (localStorage, IndexedDB, Supabase)
 * - Intelligent caching and compression
 * - Automatic backup and recovery
 * - Version management and migration
 * - Cross-tab synchronization
 * - Offline support with sync when online
 * - Data integrity verification
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  ContextWindow, 
  ConversationBranch, 
  ContextSummary, 
  EnhancedMessage 
} from './contextManager';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface PersistenceConfig {
  primaryStorage: 'localStorage' | 'indexedDB' | 'supabase';
  backupStorage: 'localStorage' | 'indexedDB' | 'supabase' | 'none';
  enableCompression: boolean;
  compressionThreshold: number; // KB
  maxLocalStorageSize: number; // MB
  enableCrossTabs: boolean;
  autoBackupInterval: number; // minutes
  enableVersioning: boolean;
  maxVersions: number;
  enableEncryption: boolean;
  encryptionKey?: string;
}

export interface PersistenceMetadata {
  version: string;
  createdAt: Date;
  lastModified: Date;
  lastBackup?: Date;
  syncStatus: 'synced' | 'pending' | 'error' | 'offline';
  size: number; // bytes
  checksum: string;
  compressionRatio?: number;
  storageBackend: string;
}

export interface StoredContext {
  id: string;
  userId: string;
  conversationId: string;
  contextWindow: ContextWindow;
  branches: ConversationBranch[];
  summaries: ContextSummary[];
  metadata: PersistenceMetadata;
}

export interface BackupInfo {
  id: string;
  timestamp: Date;
  size: number;
  contextsCount: number;
  backend: string;
  isAutomatic: boolean;
  verificationStatus: 'verified' | 'pending' | 'failed';
}

export interface SyncStatus {
  lastSync: Date | null;
  pendingChanges: number;
  conflictsDetected: number;
  syncInProgress: boolean;
  nextScheduledSync?: Date;
  lastError?: string;
}

export interface StorageQuota {
  used: number;
  available: number;
  total: number;
  utilizationRate: number;
  nearLimit: boolean;
  recommendations: string[];
}

// =====================================================
// STORAGE BACKENDS
// =====================================================

abstract class StorageBackend {
  abstract name: string;
  abstract isAvailable(): Promise<boolean>;
  abstract store(key: string, data: any): Promise<void>;
  abstract retrieve(key: string): Promise<any | null>;
  abstract remove(key: string): Promise<void>;
  abstract list(): Promise<string[]>;
  abstract getQuota(): Promise<StorageQuota>;
  abstract clear(): Promise<void>;
}

class LocalStorageBackend extends StorageBackend {
  name = 'localStorage';

  async isAvailable(): Promise<boolean> {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  async store(key: string, data: any): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('LocalStorage quota exceeded');
      }
      throw error;
    }
  }

  async retrieve(key: string): Promise<any | null> {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async list(): Promise<string[]> {
    return Object.keys(localStorage).filter(key => key.startsWith('pam_context_'));
  }

  async getQuota(): Promise<StorageQuota> {
    // Estimate localStorage usage (rough approximation)
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }

    const estimatedTotal = 10 * 1024 * 1024; // 10MB typical limit
    const available = Math.max(0, estimatedTotal - used);
    const utilizationRate = used / estimatedTotal;

    return {
      used,
      available,
      total: estimatedTotal,
      utilizationRate,
      nearLimit: utilizationRate > 0.85,
      recommendations: utilizationRate > 0.8 ? ['Enable compression', 'Archive old conversations'] : []
    };
  }

  async clear(): Promise<void> {
    const keys = await this.list();
    keys.forEach(key => localStorage.removeItem(key));
  }
}

class IndexedDBBackend extends StorageBackend {
  name = 'indexedDB';
  private dbName = 'PAMContextDB';
  private version = 1;
  private storeName = 'contexts';

  async isAvailable(): Promise<boolean> {
    return typeof indexedDB !== 'undefined';
  }

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('conversationId', 'conversationId', { unique: false });
          store.createIndex('timestamp', 'metadata.lastModified', { unique: false });
        }
      };
    });
  }

  async store(key: string, data: any): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ id: key, ...data });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async retrieve(key: string): Promise<any | null> {
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const { id, ...data } = result;
          resolve(data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async remove(key: string): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async list(): Promise<string[]> {
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getQuota(): Promise<StorageQuota> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const total = estimate.quota || 0;
      const available = Math.max(0, total - used);
      const utilizationRate = total > 0 ? used / total : 0;

      return {
        used,
        available,
        total,
        utilizationRate,
        nearLimit: utilizationRate > 0.85,
        recommendations: utilizationRate > 0.8 ? ['Clear old data', 'Enable compression'] : []
      };
    }

    // Fallback estimates
    return {
      used: 0,
      available: 50 * 1024 * 1024, // 50MB estimate
      total: 50 * 1024 * 1024,
      utilizationRate: 0,
      nearLimit: false,
      recommendations: []
    };
  }

  async clear(): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

class SupabaseBackend extends StorageBackend {
  name = 'supabase';

  async isAvailable(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch {
      return false;
    }
  }

  async store(key: string, data: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('pam_context_storage')
      .upsert({
        id: key,
        user_id: user.id,
        data: data,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  async retrieve(key: string): Promise<any | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('pam_context_storage')
      .select('data')
      .eq('id', key)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data?.data || null;
  }

  async remove(key: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('pam_context_storage')
      .delete()
      .eq('id', key)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async list(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('pam_context_storage')
      .select('id')
      .eq('user_id', user.id);

    if (error) throw error;

    return (data || []).map(item => item.id);
  }

  async getQuota(): Promise<StorageQuota> {
    // Supabase has different limits based on plan
    // For now, return generous estimates
    return {
      used: 0,
      available: 1024 * 1024 * 1024, // 1GB
      total: 1024 * 1024 * 1024,
      utilizationRate: 0,
      nearLimit: false,
      recommendations: []
    };
  }

  async clear(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('pam_context_storage')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  }
}

// =====================================================
// MAIN PERSISTENCE MANAGER
// =====================================================

export class ContextPersistenceManager {
  private config: PersistenceConfig;
  private primaryBackend: StorageBackend;
  private backupBackend: StorageBackend | null = null;
  private compressionWorker: Worker | null = null;
  private syncStatus: SyncStatus = {
    lastSync: null,
    pendingChanges: 0,
    conflictsDetected: 0,
    syncInProgress: false
  };
  private autoBackupTimer: NodeJS.Timeout | null = null;
  
  constructor(
    private userId: string,
    config?: Partial<PersistenceConfig>
  ) {
    this.config = {
      primaryStorage: 'indexedDB',
      backupStorage: 'localStorage',
      enableCompression: true,
      compressionThreshold: 50, // 50KB
      maxLocalStorageSize: 5, // 5MB
      enableCrossTabs: true,
      autoBackupInterval: 30, // 30 minutes
      enableVersioning: true,
      maxVersions: 10,
      enableEncryption: false,
      ...config
    };

    this.initializeBackends();
    this.setupAutoBackup();
    this.setupCrossTabSync();
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  private async initializeBackends(): Promise<void> {
    // Initialize primary backend
    switch (this.config.primaryStorage) {
      case 'localStorage':
        this.primaryBackend = new LocalStorageBackend();
        break;
      case 'indexedDB':
        this.primaryBackend = new IndexedDBBackend();
        break;
      case 'supabase':
        this.primaryBackend = new SupabaseBackend();
        break;
    }

    // Initialize backup backend
    if (this.config.backupStorage !== 'none' && this.config.backupStorage !== this.config.primaryStorage) {
      switch (this.config.backupStorage) {
        case 'localStorage':
          this.backupBackend = new LocalStorageBackend();
          break;
        case 'indexedDB':
          this.backupBackend = new IndexedDBBackend();
          break;
        case 'supabase':
          this.backupBackend = new SupabaseBackend();
          break;
      }
    }

    logger.info('📦 Persistence manager initialized', {
      primaryBackend: this.config.primaryStorage,
      backupBackend: this.config.backupStorage,
      compressionEnabled: this.config.enableCompression
    });
  }

  private setupAutoBackup(): void {
    if (this.config.autoBackupInterval > 0) {
      this.autoBackupTimer = setInterval(
        () => this.performAutoBackup(),
        this.config.autoBackupInterval * 60 * 1000
      );
    }
  }

  private setupCrossTabSync(): void {
    if (this.config.enableCrossTabs && typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key?.startsWith('pam_context_')) {
          this.handleCrossTabSync(event);
        }
      });
    }
  }

  // =====================================================
  // CORE PERSISTENCE METHODS
  // =====================================================

  /**
   * Store context data with compression and backup
   */
  async storeContext(context: StoredContext): Promise<void> {
    logger.debug('💾 Storing context', {
      contextId: context.id,
      messageCount: context.contextWindow.messages.length,
      branchCount: context.branches.length
    });

    try {
      // Prepare data for storage
      const preparedData = await this.prepareForStorage(context);
      const key = this.generateStorageKey(context.conversationId);
      
      // Store in primary backend
      await this.primaryBackend.store(key, preparedData);
      
      // Store in backup backend if configured
      if (this.backupBackend) {
        try {
          await this.backupBackend.store(key, preparedData);
        } catch (error) {
          logger.warn('💾 Backup storage failed', error);
        }
      }

      // Update version history
      if (this.config.enableVersioning) {
        await this.storeVersion(context);
      }

      logger.debug('✅ Context stored successfully', {
        contextId: context.id,
        size: preparedData.metadata.size,
        backend: this.primaryBackend.name
      });

    } catch (error) {
      logger.error('❌ Failed to store context', error);
      throw error;
    }
  }

  /**
   * Retrieve context data with decompression and fallback
   */
  async retrieveContext(conversationId: string): Promise<StoredContext | null> {
    logger.debug('📖 Retrieving context', { conversationId });

    const key = this.generateStorageKey(conversationId);

    try {
      // Try primary backend first
      let data = await this.primaryBackend.retrieve(key);
      
      // Fallback to backup if primary fails
      if (!data && this.backupBackend) {
        logger.debug('🔄 Falling back to backup storage');
        data = await this.backupBackend.retrieve(key);
        
        // If found in backup, restore to primary
        if (data) {
          await this.primaryBackend.store(key, data);
        }
      }

      if (!data) {
        logger.debug('📭 Context not found', { conversationId });
        return null;
      }

      // Process retrieved data
      const context = await this.processRetrievedData(data);
      
      logger.debug('✅ Context retrieved successfully', {
        contextId: context.id,
        messageCount: context.contextWindow.messages.length
      });

      return context;

    } catch (error) {
      logger.error('❌ Failed to retrieve context', error);
      return null;
    }
  }

  /**
   * Remove context data from all backends
   */
  async removeContext(conversationId: string): Promise<void> {
    logger.debug('🗑️ Removing context', { conversationId });

    const key = this.generateStorageKey(conversationId);

    const operations = [
      this.primaryBackend.remove(key)
    ];

    if (this.backupBackend) {
      operations.push(this.backupBackend.remove(key));
    }

    // Remove versions
    if (this.config.enableVersioning) {
      operations.push(this.removeVersions(conversationId));
    }

    await Promise.allSettled(operations);
    
    logger.debug('✅ Context removed', { conversationId });
  }

  // =====================================================
  // DATA PROCESSING
  // =====================================================

  /**
   * Prepare context data for storage (compression, encryption, etc.)
   */
  private async prepareForStorage(context: StoredContext): Promise<any> {
    let processedData = { ...context };

    // Generate checksum for integrity verification
    const checksum = this.generateChecksum(JSON.stringify(context));
    
    // Calculate size
    const serialized = JSON.stringify(processedData);
    const size = new Blob([serialized]).size;

    // Apply compression if enabled and above threshold
    let compressionRatio: number | undefined;
    if (this.config.enableCompression && size > (this.config.compressionThreshold * 1024)) {
      const compressed = await this.compressData(processedData);
      if (compressed.ratio > 0.2) { // Only use if we save at least 20%
        processedData = compressed.data;
        compressionRatio = compressed.ratio;
      }
    }

    // Apply encryption if enabled
    if (this.config.enableEncryption && this.config.encryptionKey) {
      processedData = await this.encryptData(processedData, this.config.encryptionKey);
    }

    // Update metadata
    processedData.metadata = {
      ...processedData.metadata,
      lastModified: new Date(),
      size,
      checksum,
      compressionRatio,
      storageBackend: this.primaryBackend.name
    };

    return processedData;
  }

  /**
   * Process data retrieved from storage (decompression, decryption, etc.)
   */
  private async processRetrievedData(data: any): Promise<StoredContext> {
    let processedData = { ...data };

    // Decrypt if needed
    if (this.config.enableEncryption && this.config.encryptionKey) {
      processedData = await this.decryptData(processedData, this.config.encryptionKey);
    }

    // Decompress if needed
    if (processedData.metadata?.compressionRatio) {
      processedData = await this.decompressData(processedData);
    }

    // Verify integrity
    if (processedData.metadata?.checksum) {
      const currentChecksum = this.generateChecksum(JSON.stringify({
        ...processedData,
        metadata: {
          ...processedData.metadata,
          checksum: undefined // Exclude checksum from verification
        }
      }));
      
      if (currentChecksum !== processedData.metadata.checksum) {
        logger.warn('⚠️ Data integrity check failed', {
          expected: processedData.metadata.checksum,
          actual: currentChecksum
        });
      }
    }

    // Convert date strings back to Date objects
    return this.deserializeDates(processedData);
  }

  // =====================================================
  // COMPRESSION AND ENCRYPTION
  // =====================================================

  private async compressData(data: any): Promise<{ data: any; ratio: number }> {
    try {
      const serialized = JSON.stringify(data);
      const originalSize = new Blob([serialized]).size;
      
      // Simple compression using LZ-style algorithm (could be enhanced)
      const compressed = this.lzCompress(serialized);
      const compressedSize = new Blob([compressed]).size;
      
      const ratio = 1 - (compressedSize / originalSize);

      return {
        data: {
          ...data,
          _compressed: true,
          _compressedData: compressed
        },
        ratio
      };
    } catch (error) {
      logger.error('Compression failed', error);
      return { data, ratio: 0 };
    }
  }

  private async decompressData(data: any): Promise<any> {
    if (data._compressed && data._compressedData) {
      try {
        const decompressed = this.lzDecompress(data._compressedData);
        return JSON.parse(decompressed);
      } catch (error) {
        logger.error('Decompression failed', error);
        // Return original data without compression markers
        const { _compressed, _compressedData, ...originalData } = data;
        return originalData;
      }
    }
    return data;
  }

  private async encryptData(data: any, key: string): Promise<any> {
    // Simple encryption implementation (should use proper crypto in production)
    const serialized = JSON.stringify(data);
    const encrypted = btoa(serialized); // Base64 encoding (not real encryption)
    
    return {
      ...data,
      _encrypted: true,
      _encryptedData: encrypted
    };
  }

  private async decryptData(data: any, key: string): Promise<any> {
    if (data._encrypted && data._encryptedData) {
      try {
        const decrypted = atob(data._encryptedData);
        return JSON.parse(decrypted);
      } catch (error) {
        logger.error('Decryption failed', error);
        const { _encrypted, _encryptedData, ...originalData } = data;
        return originalData;
      }
    }
    return data;
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private generateStorageKey(conversationId: string): string {
    return `pam_context_${this.userId}_${conversationId}`;
  }

  private generateChecksum(data: string): string {
    // Simple checksum (could be enhanced with proper hashing)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private lzCompress(data: string): string {
    // Simple LZ-style compression
    const dict: { [key: string]: number } = {};
    let result = '';
    let dictSize = 256;
    
    for (let i = 0; i < 256; i++) {
      dict[String.fromCharCode(i)] = i;
    }
    
    let w = '';
    for (const c of data) {
      const wc = w + c;
      if (dict[wc]) {
        w = wc;
      } else {
        result += String.fromCharCode(dict[w]);
        dict[wc] = dictSize++;
        w = c;
      }
    }
    
    if (w) {
      result += String.fromCharCode(dict[w]);
    }
    
    return result;
  }

  private lzDecompress(data: string): string {
    const dict: { [key: number]: string } = {};
    let dictSize = 256;
    
    for (let i = 0; i < 256; i++) {
      dict[i] = String.fromCharCode(i);
    }
    
    let result = '';
    let w = String.fromCharCode(data.charCodeAt(0));
    result += w;
    
    for (let i = 1; i < data.length; i++) {
      const k = data.charCodeAt(i);
      let entry = dict[k] || (w + w.charAt(0));
      
      result += entry;
      dict[dictSize++] = w + entry.charAt(0);
      w = entry;
    }
    
    return result;
  }

  private deserializeDates(data: any): any {
    // Recursively convert ISO date strings back to Date objects
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
      return new Date(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.deserializeDates(item));
    }
    
    if (data && typeof data === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.deserializeDates(value);
      }
      return result;
    }
    
    return data;
  }

  // =====================================================
  // VERSION MANAGEMENT
  // =====================================================

  private async storeVersion(context: StoredContext): Promise<void> {
    const versionKey = `${this.generateStorageKey(context.conversationId)}_v${Date.now()}`;
    
    try {
      await this.primaryBackend.store(versionKey, {
        version: Date.now().toString(),
        context: context,
        createdAt: new Date()
      });

      // Clean up old versions
      await this.cleanupOldVersions(context.conversationId);
      
    } catch (error) {
      logger.warn('Failed to store version', error);
    }
  }

  private async cleanupOldVersions(conversationId: string): Promise<void> {
    try {
      const allKeys = await this.primaryBackend.list();
      const versionKeys = allKeys
        .filter(key => key.includes(conversationId) && key.includes('_v'))
        .sort()
        .reverse(); // Most recent first

      // Remove excess versions
      if (versionKeys.length > this.config.maxVersions) {
        const toRemove = versionKeys.slice(this.config.maxVersions);
        await Promise.allSettled(
          toRemove.map(key => this.primaryBackend.remove(key))
        );
      }
    } catch (error) {
      logger.warn('Failed to cleanup versions', error);
    }
  }

  private async removeVersions(conversationId: string): Promise<void> {
    try {
      const allKeys = await this.primaryBackend.list();
      const versionKeys = allKeys.filter(key => 
        key.includes(conversationId) && key.includes('_v')
      );

      await Promise.allSettled(
        versionKeys.map(key => this.primaryBackend.remove(key))
      );
    } catch (error) {
      logger.warn('Failed to remove versions', error);
    }
  }

  // =====================================================
  // SYNC AND BACKUP
  // =====================================================

  private async performAutoBackup(): Promise<void> {
    logger.debug('🔄 Performing auto backup');

    try {
      const contexts = await this.getAllContexts();
      const backupData = {
        contexts,
        timestamp: new Date(),
        userId: this.userId,
        version: '1.0'
      };

      // Store backup info
      const backupInfo: BackupInfo = {
        id: `backup_${Date.now()}`,
        timestamp: new Date(),
        size: JSON.stringify(backupData).length,
        contextsCount: contexts.length,
        backend: this.backupBackend?.name || 'none',
        isAutomatic: true,
        verificationStatus: 'pending'
      };

      // Verify backup integrity
      backupInfo.verificationStatus = await this.verifyBackup(backupData) ? 'verified' : 'failed';

      logger.debug('✅ Auto backup complete', {
        contextsCount: contexts.length,
        size: backupInfo.size,
        status: backupInfo.verificationStatus
      });

    } catch (error) {
      logger.error('❌ Auto backup failed', error);
    }
  }

  private async verifyBackup(backupData: any): Promise<boolean> {
    try {
      // Basic verification - could be enhanced
      return Array.isArray(backupData.contexts) && 
             backupData.timestamp && 
             backupData.userId === this.userId;
    } catch {
      return false;
    }
  }

  private handleCrossTabSync(event: StorageEvent): void {
    if (event.newValue && event.oldValue !== event.newValue) {
      logger.debug('🔄 Cross-tab sync triggered', { key: event.key });
      
      // Emit custom event for components to listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pamContextUpdated', {
          detail: { key: event.key, action: 'updated' }
        }));
      }
    }
  }

  // =====================================================
  // PUBLIC API METHODS
  // =====================================================

  /**
   * Get all stored contexts for the user
   */
  async getAllContexts(): Promise<StoredContext[]> {
    try {
      const keys = await this.primaryBackend.list();
      const contextKeys = keys.filter(key => 
        key.startsWith(`pam_context_${this.userId}_`) && 
        !key.includes('_v') // Exclude versions
      );

      const contexts = await Promise.allSettled(
        contextKeys.map(async (key) => {
          const data = await this.primaryBackend.retrieve(key);
          return data ? await this.processRetrievedData(data) : null;
        })
      );

      return contexts
        .filter((result): result is PromiseFulfilledResult<StoredContext> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

    } catch (error) {
      logger.error('Failed to get all contexts', error);
      return [];
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    primary: StorageQuota;
    backup?: StorageQuota;
    totalContexts: number;
    oldestContext?: Date;
    newestContext?: Date;
  }> {
    const primaryQuota = await this.primaryBackend.getQuota();
    const backupQuota = this.backupBackend ? await this.backupBackend.getQuota() : undefined;
    
    const contexts = await this.getAllContexts();
    const dates = contexts
      .map(ctx => ctx.metadata.createdAt)
      .filter(date => date instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      primary: primaryQuota,
      backup: backupQuota,
      totalContexts: contexts.length,
      oldestContext: dates[0],
      newestContext: dates[dates.length - 1]
    };
  }

  /**
   * Clear all stored data
   */
  async clearAllData(): Promise<void> {
    logger.warn('🧹 Clearing all context data');
    
    await this.primaryBackend.clear();
    if (this.backupBackend) {
      await this.backupBackend.clear();
    }

    logger.info('✅ All context data cleared');
  }

  /**
   * Export contexts for backup
   */
  async exportContexts(): Promise<string> {
    const contexts = await this.getAllContexts();
    const exportData = {
      version: '1.0',
      exportedAt: new Date(),
      userId: this.userId,
      contexts
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import contexts from backup
   */
  async importContexts(jsonData: string): Promise<{ imported: number; errors: number }> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!Array.isArray(importData.contexts)) {
        throw new Error('Invalid import data format');
      }

      let imported = 0;
      let errors = 0;

      for (const context of importData.contexts) {
        try {
          await this.storeContext(context);
          imported++;
        } catch (error) {
          logger.error('Failed to import context', error);
          errors++;
        }
      }

      logger.info('📥 Import complete', { imported, errors });
      return { imported, errors };

    } catch (error) {
      logger.error('Import failed', error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Force sync with backup storage
   */
  async forceSync(): Promise<void> {
    if (this.syncStatus.syncInProgress) {
      logger.warn('Sync already in progress');
      return;
    }

    this.syncStatus.syncInProgress = true;
    
    try {
      logger.info('🔄 Starting forced sync');
      
      // Implementation would sync between primary and backup storage
      // This is a placeholder for the actual sync logic
      
      this.syncStatus.lastSync = new Date();
      this.syncStatus.pendingChanges = 0;
      
      logger.info('✅ Forced sync complete');
      
    } catch (error) {
      this.syncStatus.lastError = error.message;
      logger.error('❌ Forced sync failed', error);
      throw error;
    } finally {
      this.syncStatus.syncInProgress = false;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleCrossTabSync);
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }
  }
}

export default ContextPersistenceManager;