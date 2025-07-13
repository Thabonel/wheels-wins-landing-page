// Data Encryption Service for Enhanced Security
export class DataEncryption {
  private static instance: DataEncryption;
  private encryptionKey: CryptoKey | null = null;

  static getInstance(): DataEncryption {
    if (!DataEncryption.instance) {
      DataEncryption.instance = new DataEncryption();
    }
    return DataEncryption.instance;
  }

  constructor() {
    this.initializeEncryption();
  }

  private async initializeEncryption(): Promise<void> {
    try {
      // Generate or retrieve encryption key
      const storedKey = localStorage.getItem('pam_encryption_key');
      if (storedKey) {
        this.encryptionKey = await this.importKey(storedKey);
      } else {
        this.encryptionKey = await this.generateKey();
        localStorage.setItem('pam_encryption_key', await this.exportKey(this.encryptionKey));
      }
    } catch (error) {
      console.error('Encryption initialization failed:', error);
    }
  }

  private async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  private async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('jwk', key);
    return JSON.stringify(exported);
  }

  private async importKey(keyData: string): Promise<CryptoKey> {
    const keyObject = JSON.parse(keyData);
    return await crypto.subtle.importKey(
      'jwk',
      keyObject,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async encryptData(data: string): Promise<{ encrypted: string; iv: string } | null> {
    if (!this.encryptionKey) {
      await this.initializeEncryption();
      if (!this.encryptionKey) return null;
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        this.encryptionKey,
        dataBuffer
      );

      return {
        encrypted: this.arrayBufferToBase64(encrypted),
        iv: this.arrayBufferToBase64(iv)
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  }

  async decryptData(encrypted: string, iv: string): Promise<string | null> {
    if (!this.encryptionKey) {
      await this.initializeEncryption();
      if (!this.encryptionKey) return null;
    }

    try {
      const encryptedBuffer = this.base64ToArrayBuffer(encrypted);
      const ivBuffer = this.base64ToArrayBuffer(iv);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer
        },
        this.encryptionKey,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  // Hash sensitive data for secure comparison
  async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.arrayBufferToBase64(hashBuffer);
  }

  // Generate secure random tokens
  generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Encrypt object data
  async encryptObject(obj: any): Promise<{ encrypted: string; iv: string } | null> {
    try {
      const jsonString = JSON.stringify(obj);
      return await this.encryptData(jsonString);
    } catch (error) {
      console.error('Object encryption failed:', error);
      return null;
    }
  }

  // Decrypt object data
  async decryptObject<T>(encrypted: string, iv: string): Promise<T | null> {
    try {
      const decryptedString = await this.decryptData(encrypted, iv);
      if (!decryptedString) return null;
      
      return JSON.parse(decryptedString) as T;
    } catch (error) {
      console.error('Object decryption failed:', error);
      return null;
    }
  }

  // Secure field encryption for forms
  async encryptFormField(fieldName: string, value: string): Promise<string> {
    const timestamp = Date.now().toString();
    const combined = `${fieldName}:${value}:${timestamp}`;
    
    const result = await this.encryptData(combined);
    if (!result) return value; // Fallback to plain text if encryption fails
    
    return `encrypted:${result.encrypted}:${result.iv}`;
  }

  async decryptFormField(encryptedValue: string): Promise<string> {
    if (!encryptedValue.startsWith('encrypted:')) {
      return encryptedValue; // Not encrypted
    }

    const parts = encryptedValue.split(':');
    if (parts.length !== 3) return encryptedValue;

    const [, encrypted, iv] = parts;
    const decrypted = await this.decryptData(encrypted, iv);
    
    if (!decrypted) return encryptedValue;
    
    // Extract original value (format: fieldName:value:timestamp)
    const decryptedParts = decrypted.split(':');
    return decryptedParts.slice(1, -1).join(':'); // Remove fieldName and timestamp
  }

  // Utility methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Key management
  async rotateEncryptionKey(): Promise<void> {
    try {
      const newKey = await this.generateKey();
      const newKeyData = await this.exportKey(newKey);
      
      // In a real implementation, you would:
      // 1. Re-encrypt all existing data with the new key
      // 2. Update the key in secure storage
      // 3. Revoke the old key
      
      this.encryptionKey = newKey;
      localStorage.setItem('pam_encryption_key', newKeyData);
      
      console.log('Encryption key rotated successfully');
    } catch (error) {
      console.error('Key rotation failed:', error);
    }
  }

  // Check if data is encrypted
  isEncrypted(data: string): boolean {
    return data.startsWith('encrypted:') && data.split(':').length === 3;
  }

  // Secure memory cleanup
  clearSensitiveData(): void {
    // Clear encryption key from memory
    this.encryptionKey = null;
    
    // Clear sensitive data from localStorage
    localStorage.removeItem('pam_encryption_key');
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }
}

export const dataEncryption = DataEncryption.getInstance();