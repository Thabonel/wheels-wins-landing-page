/**
 * Global Audio Manager to prevent WebMediaPlayer overflow
 * Chrome limits the number of concurrent audio/video elements
 * This manager ensures we properly clean up and reuse audio instances
 */

class AudioManager {
  private static instance: AudioManager;
  private audioPool: HTMLAudioElement[] = [];
  private activeAudio: Set<HTMLAudioElement> = new Set();
  private maxPoolSize = 5; // Chrome typically allows ~75, but we'll keep it small
  
  private constructor() {
    // Singleton pattern
    console.log('🎵 Audio Manager initialized');
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => this.cleanup());
  }
  
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }
  
  /**
   * Get an audio element from the pool or create a new one
   */
  getAudio(url: string): HTMLAudioElement {
    // Clean up any finished audio elements first
    this.cleanupFinished();
    
    // Try to get from pool
    let audio = this.audioPool.pop();
    
    if (!audio) {
      // Create new if pool is empty and we're under the limit
      if (this.activeAudio.size < this.maxPoolSize) {
        audio = new Audio();
        console.log(`🎵 Created new audio element (${this.activeAudio.size + 1}/${this.maxPoolSize})`);
      } else {
        // Force stop the oldest audio to make room
        const oldestAudio = this.activeAudio.values().next().value;
        if (oldestAudio) {
          console.log('⚠️ Audio pool full, stopping oldest audio');
          this.releaseAudio(oldestAudio);
          audio = oldestAudio;
        } else {
          // Fallback: create new audio anyway
          audio = new Audio();
          console.warn('⚠️ Creating audio beyond pool size limit');
        }
      }
    } else {
      console.log('♻️ Reusing audio element from pool');
    }
    
    // Reset and configure the audio element
    audio.pause();
    audio.currentTime = 0;
    audio.src = url;
    audio.load(); // Preload the audio
    
    // Track as active
    this.activeAudio.add(audio);
    
    // Auto-cleanup when audio ends or errors
    const cleanup = () => {
      this.releaseAudio(audio);
    };
    
    audio.addEventListener('ended', cleanup, { once: true });
    audio.addEventListener('error', cleanup, { once: true });
    
    return audio;
  }
  
  /**
   * Release an audio element back to the pool
   */
  releaseAudio(audio: HTMLAudioElement): void {
    if (!audio) return;
    
    // Stop and reset
    audio.pause();
    audio.currentTime = 0;
    
    // Clean up blob URLs
    if (audio.src && audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(audio.src);
    }
    
    // Remove all event listeners
    audio.removeEventListener('ended', () => {});
    audio.removeEventListener('error', () => {});
    
    // Clear source
    audio.src = '';
    
    // Remove from active set
    this.activeAudio.delete(audio);
    
    // Add back to pool if there's room
    if (this.audioPool.length < this.maxPoolSize) {
      this.audioPool.push(audio);
      console.log(`♻️ Audio element returned to pool (pool size: ${this.audioPool.length})`);
    } else {
      console.log('🗑️ Audio element discarded (pool full)');
    }
  }
  
  /**
   * Clean up any finished audio elements
   */
  private cleanupFinished(): void {
    const finished: HTMLAudioElement[] = [];
    
    this.activeAudio.forEach(audio => {
      if (audio.ended || audio.paused || audio.error) {
        finished.push(audio);
      }
    });
    
    finished.forEach(audio => this.releaseAudio(audio));
  }
  
  /**
   * Stop all active audio
   */
  stopAll(): void {
    console.log('🛑 Stopping all audio');
    this.activeAudio.forEach(audio => {
      audio.pause();
      this.releaseAudio(audio);
    });
  }
  
  /**
   * Clean up all resources
   */
  cleanup(): void {
    console.log('🧹 Cleaning up audio manager');
    
    // Stop all active audio
    this.stopAll();
    
    // Clear the pool
    this.audioPool = [];
    
    // Clear active set
    this.activeAudio.clear();
  }
  
  /**
   * Get current usage stats
   */
  getStats(): { active: number; pooled: number; total: number } {
    return {
      active: this.activeAudio.size,
      pooled: this.audioPool.length,
      total: this.activeAudio.size + this.audioPool.length
    };
  }
}

// Export singleton instance
export const audioManager = AudioManager.getInstance();