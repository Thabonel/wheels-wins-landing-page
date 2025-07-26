/**
 * Parallel Processing Engine
 * Multi-threaded voice processing with Web Workers and Shared Array Buffers
 * Inspired by Chrome's multi-process architecture and modern speech systems
 */

interface ProcessingTask {
  id: string;
  type: TaskType;
  data: any;
  priority: TaskPriority;
  timestamp: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

interface ProcessingResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  processingTime: number;
  workerId: string;
  memoryUsage?: number;
}

interface WorkerConfig {
  type: WorkerType;
  maxConcurrentTasks: number;
  memoryLimit: number;
  timeout: number;
  retryAttempts: number;
  warmupTasks?: boolean;
}

interface ProcessingMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgProcessingTime: number;
  throughput: number; // tasks per second
  memoryUsage: number;
  cpuUtilization: number;
  queueSize: number;
  activeWorkers: number;
}

enum TaskType {
  AUDIO_ANALYSIS = 'audio_analysis',
  STT_PROCESSING = 'stt_processing',
  TTS_SYNTHESIS = 'tts_synthesis',
  VOICE_ENHANCEMENT = 'voice_enhancement',
  EMOTION_ANALYSIS = 'emotion_analysis',
  WAKE_WORD_DETECTION = 'wake_word_detection',
  NOISE_REDUCTION = 'noise_reduction',
  SPECTRAL_ANALYSIS = 'spectral_analysis',
  ML_INFERENCE = 'ml_inference',
  EDGE_PROCESSING = 'edge_processing'
}

enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
  REALTIME = 4
}

enum WorkerType {
  AUDIO_WORKER = 'audio_worker',
  STT_WORKER = 'stt_worker',
  TTS_WORKER = 'tts_worker',
  ML_WORKER = 'ml_worker',
  ANALYSIS_WORKER = 'analysis_worker',
  GENERAL_WORKER = 'general_worker'
}

interface ProcessingCallbacks {
  onTaskComplete?: (result: ProcessingResult) => void;
  onTaskFailed?: (result: ProcessingResult) => void;
  onWorkerReady?: (workerId: string, workerType: WorkerType) => void;
  onWorkerError?: (workerId: string, error: Error) => void;
  onQueueSizeChange?: (queueSize: number) => void;
  onPerformanceUpdate?: (metrics: ProcessingMetrics) => void;
}

class WorkerInstance {
  public id: string;
  public type: WorkerType;
  public worker: Worker;
  public isReady = false;
  public isBusy = false;
  public currentTask: ProcessingTask | null = null;
  public tasksCompleted = 0;
  public totalProcessingTime = 0;
  public memoryUsage = 0;
  public lastHeartbeat = Date.now();
  
  constructor(id: string, type: WorkerType, workerScript: string) {
    this.id = id;
    this.type = type;
    this.worker = new Worker(workerScript);
    
    this.setupWorkerListeners();
    this.initializeWorker();
  }
  
  private setupWorkerListeners(): void {
    this.worker.onmessage = (event) => {
      this.handleWorkerMessage(event.data);
    };
    
    this.worker.onerror = (error) => {
      console.error(`❌ Worker ${this.id} error:`, error);
      this.isReady = false;
    };
    
    this.worker.onmessageerror = (error) => {
      console.error(`❌ Worker ${this.id} message error:`, error);
    };
  }
  
  private initializeWorker(): void {
    this.worker.postMessage({
      type: 'init',
      workerId: this.id,
      workerType: this.type,
      config: {
        sharedArrayBufferSupported: typeof SharedArrayBuffer !== 'undefined',
        webGLSupported: this.checkWebGLSupport(),
        wasmSupported: typeof WebAssembly !== 'undefined'
      }
    });
  }
  
  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }
  
  private handleWorkerMessage(data: any): void {
    switch (data.type) {
      case 'ready':
        this.isReady = true;
        this.isBusy = false;
        console.log(`✅ Worker ${this.id} (${this.type}) ready`);
        break;
        
      case 'task_complete':
        this.handleTaskComplete(data);
        break;
        
      case 'task_error':
        this.handleTaskError(data);
        break;
        
      case 'heartbeat':
        this.lastHeartbeat = Date.now();
        this.memoryUsage = data.memoryUsage || 0;
        break;
        
      case 'performance':
        this.updatePerformanceMetrics(data.metrics);
        break;
    }
  }
  
  private handleTaskComplete(data: any): void {
    if (this.currentTask && this.currentTask.id === data.taskId) {
      this.tasksCompleted++;
      this.totalProcessingTime += data.processingTime;
      this.isBusy = false;
      this.currentTask = null;
    }
  }
  
  private handleTaskError(data: any): void {
    if (this.currentTask && this.currentTask.id === data.taskId) {
      this.isBusy = false;
      this.currentTask = null;
    }
  }
  
  private updatePerformanceMetrics(metrics: any): void {
    this.memoryUsage = metrics.memoryUsage || this.memoryUsage;
  }
  
  public assignTask(task: ProcessingTask): boolean {
    if (!this.isReady || this.isBusy) {
      return false;
    }
    
    this.isBusy = true;
    this.currentTask = task;
    
    this.worker.postMessage({
      type: 'process_task',
      task: task
    });
    
    return true;
  }
  
  public getAverageProcessingTime(): number {
    return this.tasksCompleted > 0 ? this.totalProcessingTime / this.tasksCompleted : 0;
  }
  
  public isHealthy(): boolean {
    const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;
    return this.isReady && timeSinceHeartbeat < 10000; // 10 second timeout
  }
  
  public terminate(): void {
    this.worker.terminate();
    this.isReady = false;
    this.isBusy = false;
  }
}

export class ParallelProcessingEngine {
  private workers: Map<string, WorkerInstance> = new Map();
  private taskQueue: ProcessingTask[] = [];
  private completedTasks: Map<string, ProcessingResult> = new Map();
  private callbacks: ProcessingCallbacks;
  
  // Configuration
  private config = {
    maxWorkers: navigator.hardwareConcurrency || 4,
    workerTypes: {
      [WorkerType.AUDIO_WORKER]: 2,
      [WorkerType.STT_WORKER]: 1,
      [WorkerType.TTS_WORKER]: 1,
      [WorkerType.ML_WORKER]: 1,
      [WorkerType.ANALYSIS_WORKER]: 1,
      [WorkerType.GENERAL_WORKER]: 2
    },
    queueSizeLimit: 1000,
    taskTimeout: 30000,
    enableLoadBalancing: true,
    enableFailover: true,
    heartbeatInterval: 5000,
    metricsInterval: 1000
  };
  
  // State
  private isInitialized = false;
  private isRunning = false;
  private taskCounter = 0;
  private startTime = Date.now();
  
  // Performance tracking
  private metrics: ProcessingMetrics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    avgProcessingTime: 0,
    throughput: 0,
    memoryUsage: 0,
    cpuUtilization: 0,
    queueSize: 0,
    activeWorkers: 0
  };
  
  // Intervals
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private queueProcessingInterval: NodeJS.Timeout | null = null;

  constructor(callbacks: ProcessingCallbacks = {}) {
    this.callbacks = callbacks;
    console.log('🔧 Parallel Processing Engine created');
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    console.log('🚀 Initializing Parallel Processing Engine...');

    try {
      // Check for required features
      if (!this.checkRequiredFeatures()) {
        throw new Error('Required features not available');
      }

      // Create worker instances
      await this.createWorkers();

      // Start monitoring and queue processing
      this.startMonitoring();
      this.startQueueProcessing();

      this.isInitialized = true;
      this.isRunning = true;

      console.log(`✅ Parallel Processing Engine ready with ${this.workers.size} workers`);
      return true;

    } catch (error) {
      console.error('❌ Parallel Processing Engine initialization failed:', error);
      return false;
    }
  }

  private checkRequiredFeatures(): boolean {
    const features = {
      webWorkers: typeof Worker !== 'undefined',
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      atomics: typeof Atomics !== 'undefined',
      webAssembly: typeof WebAssembly !== 'undefined'
    };

    console.log('🔍 Feature check:', features);

    return features.webWorkers; // Minimum requirement
  }

  private async createWorkers(): Promise<void> {
    const workerScripts = {
      [WorkerType.AUDIO_WORKER]: '/workers/audio-worker.js',
      [WorkerType.STT_WORKER]: '/workers/stt-worker.js',
      [WorkerType.TTS_WORKER]: '/workers/tts-worker.js',
      [WorkerType.ML_WORKER]: '/workers/ml-worker.js',
      [WorkerType.ANALYSIS_WORKER]: '/workers/analysis-worker.js',
      [WorkerType.GENERAL_WORKER]: '/workers/general-worker.js'
    };

    const workerPromises: Promise<void>[] = [];

    for (const [workerType, count] of Object.entries(this.config.workerTypes)) {
      const type = workerType as WorkerType;
      const script = workerScripts[type];

      for (let i = 0; i < count; i++) {
        const workerId = `${type}_${i}`;
        
        workerPromises.push(
          this.createWorker(workerId, type, script)
        );
      }
    }

    await Promise.all(workerPromises);
    console.log(`👥 Created ${this.workers.size} workers`);
  }

  private async createWorker(id: string, type: WorkerType, script: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new WorkerInstance(id, type, script);
        
        // Wait for worker to be ready
        const checkReady = () => {
          if (worker.isReady) {
            this.workers.set(id, worker);
            this.callbacks.onWorkerReady?.(id, type);
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        
        // Set timeout for worker initialization
        setTimeout(() => {
          if (!worker.isReady) {
            worker.terminate();
            reject(new Error(`Worker ${id} initialization timeout`));
          }
        }, 10000);
        
        checkReady();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private startMonitoring(): void {
    // Heartbeat monitoring
    this.heartbeatInterval = setInterval(() => {
      this.checkWorkerHealth();
    }, this.config.heartbeatInterval);

    // Metrics collection
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, this.config.metricsInterval);
  }

  private startQueueProcessing(): void {
    this.queueProcessingInterval = setInterval(() => {
      this.processQueue();
    }, 10); // High frequency queue processing
  }

  private checkWorkerHealth(): void {
    for (const [workerId, worker] of this.workers) {
      if (!worker.isHealthy()) {
        console.warn(`⚠️ Worker ${workerId} appears unhealthy, restarting...`);
        this.restartWorker(workerId);
      }
    }
  }

  private async restartWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    // Terminate old worker
    worker.terminate();
    this.workers.delete(workerId);

    // Create new worker
    try {
      const workerScripts = {
        [WorkerType.AUDIO_WORKER]: '/workers/audio-worker.js',
        [WorkerType.STT_WORKER]: '/workers/stt-worker.js',
        [WorkerType.TTS_WORKER]: '/workers/tts-worker.js',
        [WorkerType.ML_WORKER]: '/workers/ml-worker.js',
        [WorkerType.ANALYSIS_WORKER]: '/workers/analysis-worker.js',
        [WorkerType.GENERAL_WORKER]: '/workers/general-worker.js'
      };

      await this.createWorker(workerId, worker.type, workerScripts[worker.type]);
      console.log(`🔄 Worker ${workerId} restarted successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to restart worker ${workerId}:`, error);
      this.callbacks.onWorkerError?.(workerId, error as Error);
    }
  }

  private updateMetrics(): void {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // Calculate throughput
    this.metrics.throughput = this.metrics.completedTasks / (uptime / 1000);
    
    // Update queue size
    this.metrics.queueSize = this.taskQueue.length;
    
    // Update active workers
    this.metrics.activeWorkers = Array.from(this.workers.values())
      .filter(w => w.isReady).length;
    
    // Calculate average processing time
    const totalProcessingTime = Array.from(this.workers.values())
      .reduce((sum, w) => sum + w.totalProcessingTime, 0);
    const totalCompletedTasks = Array.from(this.workers.values())
      .reduce((sum, w) => sum + w.tasksCompleted, 0);
    
    this.metrics.avgProcessingTime = totalCompletedTasks > 0 ? 
      totalProcessingTime / totalCompletedTasks : 0;
    
    // Calculate memory usage
    this.metrics.memoryUsage = Array.from(this.workers.values())
      .reduce((sum, w) => sum + w.memoryUsage, 0) / this.workers.size;
    
    // CPU utilization estimate
    const busyWorkers = Array.from(this.workers.values())
      .filter(w => w.isBusy).length;
    this.metrics.cpuUtilization = this.workers.size > 0 ? 
      busyWorkers / this.workers.size : 0;
    
    // Trigger callback
    this.callbacks.onPerformanceUpdate?.(this.metrics);
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    // Sort queue by priority and timestamp
    this.taskQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp - b.timestamp; // Earlier timestamp first
    });

    // Process tasks
    const tasksToProcess = this.taskQueue.splice(0, this.getAvailableWorkerCount());
    
    for (const task of tasksToProcess) {
      const worker = this.findBestWorker(task);
      
      if (worker && worker.assignTask(task)) {
        console.log(`🔄 Assigned task ${task.id} to worker ${worker.id}`);
      } else {
        // Return task to queue if no worker available
        this.taskQueue.unshift(task);
        break;
      }
    }

    // Update queue size callback
    if (this.taskQueue.length !== this.metrics.queueSize) {
      this.callbacks.onQueueSizeChange?.(this.taskQueue.length);
    }
  }

  private getAvailableWorkerCount(): number {
    return Array.from(this.workers.values())
      .filter(w => w.isReady && !w.isBusy).length;
  }

  private findBestWorker(task: ProcessingTask): WorkerInstance | null {
    // Filter workers by type compatibility
    const compatibleWorkers = Array.from(this.workers.values())
      .filter(w => w.isReady && !w.isBusy && this.isWorkerCompatible(w, task));

    if (compatibleWorkers.length === 0) {
      return null;
    }

    if (!this.config.enableLoadBalancing) {
      return compatibleWorkers[0];
    }

    // Load balancing: choose worker with lowest load
    return compatibleWorkers.reduce((best, current) => {
      const bestLoad = best.getAverageProcessingTime() * (best.tasksCompleted + 1);
      const currentLoad = current.getAverageProcessingTime() * (current.tasksCompleted + 1);
      return currentLoad < bestLoad ? current : best;
    });
  }

  private isWorkerCompatible(worker: WorkerInstance, task: ProcessingTask): boolean {
    // Define task-worker compatibility
    const compatibility = {
      [TaskType.AUDIO_ANALYSIS]: [WorkerType.AUDIO_WORKER, WorkerType.ANALYSIS_WORKER, WorkerType.GENERAL_WORKER],
      [TaskType.STT_PROCESSING]: [WorkerType.STT_WORKER, WorkerType.GENERAL_WORKER],
      [TaskType.TTS_SYNTHESIS]: [WorkerType.TTS_WORKER, WorkerType.GENERAL_WORKER],
      [TaskType.VOICE_ENHANCEMENT]: [WorkerType.AUDIO_WORKER, WorkerType.GENERAL_WORKER],
      [TaskType.EMOTION_ANALYSIS]: [WorkerType.ML_WORKER, WorkerType.ANALYSIS_WORKER, WorkerType.GENERAL_WORKER],
      [TaskType.WAKE_WORD_DETECTION]: [WorkerType.AUDIO_WORKER, WorkerType.ML_WORKER, WorkerType.GENERAL_WORKER],
      [TaskType.NOISE_REDUCTION]: [WorkerType.AUDIO_WORKER, WorkerType.GENERAL_WORKER],
      [TaskType.SPECTRAL_ANALYSIS]: [WorkerType.ANALYSIS_WORKER, WorkerType.GENERAL_WORKER],
      [TaskType.ML_INFERENCE]: [WorkerType.ML_WORKER, WorkerType.GENERAL_WORKER],
      [TaskType.EDGE_PROCESSING]: [WorkerType.GENERAL_WORKER]
    };

    const compatibleTypes = compatibility[task.type] || [WorkerType.GENERAL_WORKER];
    return compatibleTypes.includes(worker.type);
  }

  // Public API methods
  async processTask(
    type: TaskType,
    data: any,
    priority: TaskPriority = TaskPriority.NORMAL,
    timeout?: number
  ): Promise<ProcessingResult> {
    if (!this.isRunning) {
      throw new Error('Processing engine not running');
    }

    if (this.taskQueue.length >= this.config.queueSizeLimit) {
      throw new Error('Task queue full');
    }

    const taskId = `task_${this.taskCounter++}_${Date.now()}`;
    const task: ProcessingTask = {
      id: taskId,
      type,
      data,
      priority,
      timestamp: Date.now(),
      timeout: timeout || this.config.taskTimeout
    };

    return new Promise((resolve, reject) => {
      // Add task to queue
      this.taskQueue.push(task);
      this.metrics.totalTasks++;

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        // Remove from queue if still there
        const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
        if (queueIndex !== -1) {
          this.taskQueue.splice(queueIndex, 1);
        }
        
        this.metrics.failedTasks++;
        reject(new Error(`Task ${taskId} timed out`));
      }, task.timeout);

      // Wait for completion
      const checkCompletion = () => {
        const result = this.completedTasks.get(taskId);
        if (result) {
          clearTimeout(timeoutHandle);
          this.completedTasks.delete(taskId);
          
          if (result.success) {
            this.metrics.completedTasks++;
            this.callbacks.onTaskComplete?.(result);
            resolve(result);
          } else {
            this.metrics.failedTasks++;
            this.callbacks.onTaskFailed?.(result);
            reject(new Error(result.error || 'Task failed'));
          }
        } else {
          setTimeout(checkCompletion, 10);
        }
      };

      checkCompletion();
    });
  }

  getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }

  getWorkerStatus(): Array<{
    id: string;
    type: WorkerType;
    isReady: boolean;
    isBusy: boolean;
    tasksCompleted: number;
    avgProcessingTime: number;
    memoryUsage: number;
  }> {
    return Array.from(this.workers.values()).map(worker => ({
      id: worker.id,
      type: worker.type,
      isReady: worker.isReady,
      isBusy: worker.isBusy,
      tasksCompleted: worker.tasksCompleted,
      avgProcessingTime: worker.getAverageProcessingTime(),
      memoryUsage: worker.memoryUsage
    }));
  }

  getQueueSize(): number {
    return this.taskQueue.length;
  }

  clearQueue(): void {
    this.taskQueue = [];
    console.log('🧹 Task queue cleared');
  }

  // Resource management
  pauseProcessing(): void {
    this.isRunning = false;
    console.log('⏸️ Processing paused');
  }

  resumeProcessing(): void {
    this.isRunning = true;
    console.log('▶️ Processing resumed');
  }

  // Cleanup
  destroy(): void {
    console.log('🛑 Destroying Parallel Processing Engine...');

    this.isRunning = false;

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = null;
    }

    // Terminate all workers
    for (const worker of this.workers.values()) {
      worker.terminate();
    }
    this.workers.clear();

    // Clear queues
    this.taskQueue = [];
    this.completedTasks.clear();

    this.isInitialized = false;
    console.log('✅ Parallel Processing Engine destroyed');
  }
}

// Export types for use in other modules
export {
  TaskType,
  TaskPriority,
  WorkerType,
  ProcessingTask,
  ProcessingResult,
  ProcessingMetrics,
  ProcessingCallbacks
};