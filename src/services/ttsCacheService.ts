/**
 * TTS Cache Service
 * Persistent caching for Text-to-Speech audio using IndexedDB
 */

interface TTSCacheEntry {
  id: string;
  text: string;
  voice: string;
  audioBlob: Blob;
  mimeType: string;
  duration?: number;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  metadata?: {
    engine?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  };
}

interface TTSCacheStats {
  totalEntries: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
  mostAccessed: string;
  cacheHitRate: number;
}

class TTSCacheService {
  private dbName = 'WheelsWinsTTSCache';
  private dbVersion = 1;
  private storeName = 'ttsAudio';
  private db: IDBDatabase | null = null;
  private maxCacheSize = 50 * 1024 * 1024; // 50MB max cache
  private maxEntries = 100;
  private cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // Statistics tracking
  private cacheHits = 0;
  private cacheMisses = 0;
  private totalRequests = 0;

  constructor() {
    this.initDB();
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        console.error('IndexedDB not supported');
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ TTS cache database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // Create indexes for efficient queries
          store.createIndex('text', 'text', { unique: false });
          store.createIndex('voice', 'voice', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          store.createIndex('accessCount', 'accessCount', { unique: false });
          
          console.log('✅ TTS cache store created');
        }
      };
    });
  }

  /**
   * Generate cache key for TTS request
   */
  private generateCacheKey(text: string, voice: string, options?: any): string {
    const normalizedText = text.trim().toLowerCase();
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${voice}_${normalizedText}_${optionsStr}`;
  }

  /**
   * Get cached audio for text
   */
  async getCachedAudio(text: string, voice: string, options?: any): Promise<Blob | null> {
    if (!this.db) await this.initDB();
    
    this.totalRequests++;
    const cacheKey = this.generateCacheKey(text, voice, options);
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(cacheKey);

        request.onsuccess = () => {
          const entry = request.result as TTSCacheEntry | undefined;
          
          if (entry) {
            const now = Date.now();
            const age = now - entry.timestamp;
            
            // Check if cache entry is expired
            if (age > this.cacheExpiry) {
              console.log('🗑️ Cache entry expired, removing:', cacheKey);
              this.removeCacheEntry(cacheKey);
              this.cacheMisses++;
              resolve(null);
              return;
            }
            
            // Update access statistics
            entry.accessCount++;
            entry.lastAccessed = now;
            store.put(entry);
            
            this.cacheHits++;
            console.log(`✅ TTS cache hit (${this.getCacheHitRate().toFixed(1)}% hit rate):`, text.substring(0, 50));
            resolve(entry.audioBlob);
          } else {
            this.cacheMisses++;
            console.log(`❌ TTS cache miss (${this.getCacheHitRate().toFixed(1)}% hit rate):`, text.substring(0, 50));
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('Error retrieving from cache:', request.error);
          this.cacheMisses++;
          resolve(null);
        };
      } catch (error) {
        console.error('Cache retrieval error:', error);
        this.cacheMisses++;
        resolve(null);
      }
    });
  }

  /**
   * Store audio in cache
   */
  async cacheAudio(
    text: string, 
    voice: string, 
    audioBlob: Blob, 
    options?: any,
    metadata?: any
  ): Promise<void> {
    if (!this.db) await this.initDB();
    
    const cacheKey = this.generateCacheKey(text, voice, options);
    const now = Date.now();
    
    // Check cache size before adding
    await this.enforceCacheLimits();
    
    return new Promise((resolve, reject) => {
      try {
        const entry: TTSCacheEntry = {
          id: cacheKey,
          text: text.substring(0, 500), // Limit stored text length
          voice,
          audioBlob,
          mimeType: audioBlob.type,
          duration: metadata?.duration,
          timestamp: now,
          accessCount: 0,
          lastAccessed: now,
          metadata: {
            engine: metadata?.engine,
            rate: options?.rate,
            pitch: options?.pitch,
            volume: options?.volume
          }
        };

        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(entry);

        request.onsuccess = () => {
          console.log('✅ Audio cached successfully:', text.substring(0, 50));
          resolve();
        };

        request.onerror = () => {
          console.error('Error caching audio:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('Cache storage error:', error);
        reject(error);
      }
    });
  }

  /**
   * Remove a specific cache entry
   */
  private async removeCacheEntry(cacheKey: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(cacheKey);

      request.onsuccess = () => {
        console.log('🗑️ Cache entry removed:', cacheKey);
        resolve();
      };

      request.onerror = () => {
        console.error('Error removing cache entry:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Enforce cache size and entry limits
   */
  private async enforceCacheLimits(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();

      countRequest.onsuccess = async () => {
        const count = countRequest.result;
        
        if (count >= this.maxEntries) {
          // Remove least recently used entries
          const index = store.index('lastAccessed');
          const cursor = index.openCursor();
          let entriesToDelete = count - this.maxEntries + 10; // Remove 10 extra for buffer
          
          cursor.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor && entriesToDelete > 0) {
              store.delete(cursor.primaryKey);
              entriesToDelete--;
              cursor.continue();
            }
          };
        }
        
        resolve();
      };

      countRequest.onerror = () => {
        console.error('Error counting cache entries:', countRequest.error);
        resolve(); // Don't fail the operation
      };
    });
  }

  /**
   * Clear all cache entries
   */
  async clearCache(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.totalRequests = 0;
        console.log('🗑️ TTS cache cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('Error clearing cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<TTSCacheStats> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = async () => {
        const entries = request.result as TTSCacheEntry[];
        
        if (entries.length === 0) {
          resolve({
            totalEntries: 0,
            totalSize: 0,
            oldestEntry: 0,
            newestEntry: 0,
            mostAccessed: '',
            cacheHitRate: this.getCacheHitRate()
          });
          return;
        }
        
        // Calculate total size
        let totalSize = 0;
        for (const entry of entries) {
          totalSize += entry.audioBlob.size;
        }
        
        // Find most accessed entry
        const mostAccessed = entries.reduce((prev, current) => 
          current.accessCount > prev.accessCount ? current : prev
        );
        
        // Find oldest and newest
        const timestamps = entries.map(e => e.timestamp);
        
        resolve({
          totalEntries: entries.length,
          totalSize,
          oldestEntry: Math.min(...timestamps),
          newestEntry: Math.max(...timestamps),
          mostAccessed: mostAccessed.text.substring(0, 50),
          cacheHitRate: this.getCacheHitRate()
        });
      };

      request.onerror = () => {
        console.error('Error getting cache stats:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get cache hit rate percentage
   */
  private getCacheHitRate(): number {
    if (this.totalRequests === 0) return 0;
    return (this.cacheHits / this.totalRequests) * 100;
  }

  /**
   * Preload frequently used phrases
   */
  async preloadCommonPhrases(phrases: string[], voice: string, generateAudio: (text: string) => Promise<Blob>): Promise<void> {
    console.log(`📦 Preloading ${phrases.length} common phrases...`);
    
    for (const phrase of phrases) {
      const cached = await this.getCachedAudio(phrase, voice);
      if (!cached) {
        try {
          const audioBlob = await generateAudio(phrase);
          await this.cacheAudio(phrase, voice, audioBlob);
        } catch (error) {
          console.error(`Failed to preload phrase: ${phrase}`, error);
        }
      }
    }
    
    console.log('✅ Common phrases preloaded');
  }
}

// Export singleton instance
export const ttsCacheService = new TTSCacheService();

// Common phrases to preload
export const COMMON_TTS_PHRASES = [
  "Hello! How can I help you today?",
  "I'm processing your request...",
  "Let me check that for you.",
  "Here's what I found:",
  "Is there anything else you need?",
  "I understand. Let me help you with that.",
  "Thank you for using Wheels & Wins!",
  "I'm here to assist you.",
  "Would you like me to help you with anything else?",
  "Great! I've updated that for you."
];

export default ttsCacheService;