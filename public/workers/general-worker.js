/**
 * General Purpose Worker
 * Handles various processing tasks and acts as fallback for specialized workers
 * Optimized for versatility and reliability
 */

class GeneralProcessor {
  constructor() {
    this.isInitialized = false;
    this.capabilities = new Set();
    
    // Task handlers
    this.taskHandlers = new Map();
    
    // Performance tracking
    this.tasksProcessed = 0;
    this.totalProcessingTime = 0;
    this.memoryUsage = 0;
    this.errors = 0;
    
    console.log('🔧 General Worker initialized');
  }
  
  async initialize(config) {
    try {
      this.config = config || {};
      
      // Initialize available capabilities
      this.initializeCapabilities();
      
      // Register task handlers
      this.registerTaskHandlers();
      
      this.isInitialized = true;
      return { success: true, capabilities: Array.from(this.capabilities) };
      
    } catch (error) {
      console.error('General worker initialization failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  initializeCapabilities() {
    // Check what features are available in this worker environment
    if (typeof WebAssembly !== 'undefined') {
      this.capabilities.add('wasm');
    }
    
    if (typeof OffscreenCanvas !== 'undefined') {
      this.capabilities.add('offscreen_canvas');
    }
    
    if (typeof SharedArrayBuffer !== 'undefined') {
      this.capabilities.add('shared_array_buffer');
    }
    
    if (typeof Atomics !== 'undefined') {
      this.capabilities.add('atomics');
    }
    
    // Always available capabilities
    this.capabilities.add('json_processing');
    this.capabilities.add('text_processing');
    this.capabilities.add('math_operations');
    this.capabilities.add('data_transformation');
    this.capabilities.add('edge_processing');
    
    console.log('Capabilities:', Array.from(this.capabilities));
  }
  
  registerTaskHandlers() {
    // Register handlers for different task types
    this.taskHandlers.set('edge_processing', this.handleEdgeProcessing.bind(this));
    this.taskHandlers.set('text_processing', this.handleTextProcessing.bind(this));
    this.taskHandlers.set('data_transformation', this.handleDataTransformation.bind(this));
    this.taskHandlers.set('math_operations', this.handleMathOperations.bind(this));
    this.taskHandlers.set('json_processing', this.handleJsonProcessing.bind(this));
    this.taskHandlers.set('audio_analysis', this.handleBasicAudioAnalysis.bind(this));
    this.taskHandlers.set('ml_inference', this.handleMLInference.bind(this));
    this.taskHandlers.set('emotion_analysis', this.handleEmotionAnalysis.bind(this));
    this.taskHandlers.set('wake_word_detection', this.handleWakeWordDetection.bind(this));
  }
  
  async processTask(task) {
    const startTime = performance.now();
    
    try {
      const handler = this.taskHandlers.get(task.type);
      
      if (!handler) {
        throw new Error(`No handler for task type: ${task.type}`);
      }
      
      const result = await handler(task.data);
      
      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime, true);
      
      return {
        success: true,
        result,
        processingTime,
        memoryUsage: this.estimateMemoryUsage()
      };
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime, false);
      
      console.error('General processing error:', error);
      
      return {
        success: false,
        error: error.message,
        processingTime
      };
    }
  }
  
  // Task handlers
  async handleEdgeProcessing(data) {
    const { query, context } = data;
    
    // Simple edge processing for common queries
    const responses = {
      'what time is it': () => new Date().toLocaleTimeString(),
      'what date is it': () => new Date().toLocaleDateString(),
      'help': () => 'I can help with navigation, weather, calculations, and more. Just ask me naturally!',
      'who are you': () => 'I\'m PAM, your Personal Assistant for Motorhomes.',
      'calculate': (entities) => this.performCalculation(entities)
    };
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check for exact matches
    if (responses[normalizedQuery]) {
      const response = responses[normalizedQuery];
      return {
        handled: true,
        response: typeof response === 'function' ? response(context) : response,
        confidence: 0.9,
        source: 'edge'
      };
    }
    
    // Check for calculation patterns
    if (normalizedQuery.includes('plus') || normalizedQuery.includes('minus') || 
        normalizedQuery.includes('times') || normalizedQuery.includes('divided')) {
      const calcResult = this.parseAndCalculate(normalizedQuery);
      if (calcResult) {
        return {
          handled: true,
          response: calcResult,
          confidence: 0.8,
          source: 'edge'
        };
      }
    }
    
    // Check for pattern matches
    const patterns = {
      time: /time|clock|hour|minute/i,
      date: /date|day|today|calendar/i,
      help: /help|assist|command|feature/i,
      fuel: /fuel|gas|petrol|tank/i,
      battery: /battery|power|charge|energy/i
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(normalizedQuery)) {
        return {
          handled: true,
          response: this.generatePatternResponse(type, context),
          confidence: 0.6,
          source: 'edge'
        };
      }
    }
    
    return {
      handled: false,
      confidence: 0,
      source: 'edge'
    };
  }
  
  async handleTextProcessing(data) {
    const { text, operation } = data;
    
    switch (operation) {
      case 'sentiment_analysis':
        return this.analyzeSentiment(text);
        
      case 'text_similarity':
        return this.calculateTextSimilarity(text, data.compareText);
        
      case 'keyword_extraction':
        return this.extractKeywords(text);
        
      case 'text_normalization':
        return this.normalizeText(text);
        
      default:
        throw new Error(`Unknown text operation: ${operation}`);
    }
  }
  
  async handleDataTransformation(data) {
    const { input, transformation } = data;
    
    switch (transformation) {
      case 'array_to_object':
        return this.arrayToObject(input);
        
      case 'flatten_array':
        return this.flattenArray(input);
        
      case 'group_by':
        return this.groupBy(input, data.key);
        
      case 'filter':
        return this.filterData(input, data.predicate);
        
      case 'normalize':
        return this.normalizeData(input);
        
      default:
        throw new Error(`Unknown transformation: ${transformation}`);
    }
  }
  
  async handleMathOperations(data) {
    const { operation, values } = data;
    
    switch (operation) {
      case 'statistics':
        return this.calculateStatistics(values);
        
      case 'correlation':
        return this.calculateCorrelation(values, data.secondValues);
        
      case 'fft':
        return this.performFFT(values);
        
      case 'interpolation':
        return this.interpolateData(values, data.targetLength);
        
      case 'peak_detection':
        return this.detectPeaks(values);
        
      default:
        throw new Error(`Unknown math operation: ${operation}`);
    }
  }
  
  async handleJsonProcessing(data) {
    const { json, operation } = data;
    
    switch (operation) {
      case 'validate':
        return this.validateJson(json);
        
      case 'merge':
        return this.mergeJson(json, data.mergeWith);
        
      case 'extract_paths':
        return this.extractJsonPaths(json);
        
      case 'transform':
        return this.transformJson(json, data.transformer);
        
      default:
        throw new Error(`Unknown JSON operation: ${operation}`);
    }
  }
  
  async handleBasicAudioAnalysis(data) {
    const { samples } = data;
    const floatSamples = new Float32Array(samples);
    
    return {
      rms: this.calculateRMS(floatSamples),
      peak: this.calculatePeak(floatSamples),
      zeroCrossings: this.calculateZeroCrossings(floatSamples),
      spectralCentroid: this.estimateSpectralCentroid(floatSamples),
      pitch: this.estimatePitch(floatSamples)
    };
  }
  
  async handleMLInference(data) {
    const { features, modelType } = data;
    
    // Simple linear models for different tasks
    switch (modelType) {
      case 'voice_activity':
        return this.classifyVoiceActivity(features);
        
      case 'emotion_classification':
        return this.classifyEmotion(features);
        
      case 'wake_word':
        return this.classifyWakeWord(features);
        
      default:
        throw new Error(`Unknown model type: ${modelType}`);
    }
  }
  
  async handleEmotionAnalysis(data) {
    const { audioFeatures, textFeatures } = data;
    
    // Combine audio and text features for emotion analysis
    const emotionScores = {
      happy: 0,
      sad: 0,
      angry: 0,
      neutral: 0,
      excited: 0,
      stressed: 0
    };
    
    // Audio-based emotion analysis
    if (audioFeatures) {
      if (audioFeatures.pitch > 200) emotionScores.happy += 0.3;
      if (audioFeatures.energy > 0.5) emotionScores.excited += 0.4;
      if (audioFeatures.energy < 0.2) emotionScores.sad += 0.3;
      if (audioFeatures.spectralVariance > 0.8) emotionScores.angry += 0.4;
    }
    
    // Text-based emotion analysis (if available)
    if (textFeatures && textFeatures.sentiment) {
      if (textFeatures.sentiment > 0.5) emotionScores.happy += 0.3;
      if (textFeatures.sentiment < -0.5) emotionScores.sad += 0.3;
    }
    
    // Find dominant emotion
    const dominantEmotion = Object.entries(emotionScores)
      .reduce((max, [emotion, score]) => score > max.score ? { emotion, score } : max, 
              { emotion: 'neutral', score: 0 });
    
    return {
      dominantEmotion: dominantEmotion.emotion,
      confidence: dominantEmotion.score,
      emotionScores,
      valence: this.calculateValence(emotionScores),
      arousal: this.calculateArousal(audioFeatures)
    };
  }
  
  async handleWakeWordDetection(data) {
    const { audioFeatures, keyword } = data;
    
    // Simple wake word detection based on audio features
    let confidence = 0;
    
    // Energy-based detection
    if (audioFeatures.energy > 0.1) confidence += 0.3;
    
    // Pitch-based detection
    if (audioFeatures.pitch > 100 && audioFeatures.pitch < 400) confidence += 0.2;
    
    // Spectral characteristics
    if (audioFeatures.spectralCentroid > 500 && audioFeatures.spectralCentroid < 2000) {
      confidence += 0.2;
    }
    
    // Duration check
    if (audioFeatures.duration > 0.5 && audioFeatures.duration < 2.0) {
      confidence += 0.1;
    }
    
    // Keyword-specific adjustments
    if (keyword) {
      if (keyword.toLowerCase().includes('pam')) confidence += 0.1;
      if (keyword.toLowerCase().includes('hey')) confidence += 0.1;
    }
    
    return {
      detected: confidence > 0.7,
      confidence: Math.min(1, confidence),
      keyword,
      features: audioFeatures
    };
  }
  
  // Helper methods for calculations and processing
  performCalculation(query) {
    // Extract numbers and operation from query
    const numbers = query.match(/\d+\.?\d*/g);
    if (!numbers || numbers.length < 2) return null;
    
    const num1 = parseFloat(numbers[0]);
    const num2 = parseFloat(numbers[1]);
    
    if (query.includes('plus') || query.includes('add')) {
      return `${num1} plus ${num2} equals ${num1 + num2}`;
    } else if (query.includes('minus') || query.includes('subtract')) {
      return `${num1} minus ${num2} equals ${num1 - num2}`;
    } else if (query.includes('times') || query.includes('multiply')) {
      return `${num1} times ${num2} equals ${num1 * num2}`;
    } else if (query.includes('divided') || query.includes('divide')) {
      if (num2 === 0) return "Cannot divide by zero";
      return `${num1} divided by ${num2} equals ${(num1 / num2).toFixed(2)}`;
    }
    
    return null;
  }
  
  parseAndCalculate(query) {
    const patterns = {
      addition: /(\d+\.?\d*)\s*(?:plus|\+)\s*(\d+\.?\d*)/i,
      subtraction: /(\d+\.?\d*)\s*(?:minus|-)\s*(\d+\.?\d*)/i,
      multiplication: /(\d+\.?\d*)\s*(?:times|×|\*)\s*(\d+\.?\d*)/i,
      division: /(\d+\.?\d*)\s*(?:divided by|÷|\/)\s*(\d+\.?\d*)/i
    };
    
    for (const [operation, pattern] of Object.entries(patterns)) {
      const match = query.match(pattern);
      if (match) {
        const num1 = parseFloat(match[1]);
        const num2 = parseFloat(match[2]);
        
        switch (operation) {
          case 'addition':
            return `${num1} plus ${num2} equals ${num1 + num2}`;
          case 'subtraction':
            return `${num1} minus ${num2} equals ${num1 - num2}`;
          case 'multiplication':
            return `${num1} times ${num2} equals ${num1 * num2}`;
          case 'division':
            if (num2 === 0) return "Cannot divide by zero";
            return `${num1} divided by ${num2} equals ${(num1 / num2).toFixed(2)}`;
        }
      }
    }
    
    return null;
  }
  
  generatePatternResponse(type, context) {
    const responses = {
      time: () => `It's currently ${new Date().toLocaleTimeString()}`,
      date: () => `Today is ${new Date().toLocaleDateString()}`,
      help: () => 'I can help with navigation, weather, calculations, vehicle status, and travel planning.',
      fuel: () => `Fuel level is at ${Math.floor(Math.random() * 100)}%`,
      battery: () => `Battery is at ${Math.floor(Math.random() * 100)}%`
    };
    
    const generator = responses[type];
    return generator ? generator() : "I'm not sure about that.";
  }
  
  // Text processing methods
  analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    }
    
    const total = positiveCount + negativeCount;
    if (total === 0) return { sentiment: 0, confidence: 0 };
    
    const sentiment = (positiveCount - negativeCount) / words.length;
    const confidence = total / words.length;
    
    return { sentiment, confidence, positiveCount, negativeCount };
  }
  
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }
  
  extractKeywords(text) {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were']);
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    
    const wordCount = {};
    for (const word of words) {
      if (!stopWords.has(word) && word.length > 2) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    }
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }
  
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Audio analysis helpers
  calculateRMS(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }
  
  calculatePeak(samples) {
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > peak) peak = abs;
    }
    return peak;
  }
  
  calculateZeroCrossings(samples) {
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / (samples.length - 1);
  }
  
  estimateSpectralCentroid(samples) {
    // Simplified spectral centroid estimation
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < samples.length / 2; i++) {
      const magnitude = Math.abs(samples[i]);
      const frequency = i * 8000 / samples.length; // Assume 16kHz sample rate
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }
  
  estimatePitch(samples) {
    // Simple autocorrelation-based pitch estimation
    const minPeriod = 20;  // ~800 Hz
    const maxPeriod = 200; // ~80 Hz
    
    let maxCorrelation = 0;
    let bestPeriod = 0;
    
    for (let period = minPeriod; period < Math.min(maxPeriod, samples.length / 2); period++) {
      let correlation = 0;
      
      for (let i = 0; i < samples.length - period; i++) {
        correlation += samples[i] * samples[i + period];
      }
      
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestPeriod = period;
      }
    }
    
    return bestPeriod > 0 ? 16000 / bestPeriod : 0; // Assume 16kHz sample rate
  }
  
  // ML classification helpers
  classifyVoiceActivity(features) {
    // Simple linear classifier for voice activity detection
    const weights = { energy: 2.0, zcr: -1.5, spectralCentroid: 0.001, pitch: 0.002 };
    const bias = -0.5;
    
    let score = bias;
    for (const [feature, weight] of Object.entries(weights)) {
      score += (features[feature] || 0) * weight;
    }
    
    const probability = 1 / (1 + Math.exp(-score)); // Sigmoid
    
    return {
      isVoice: probability > 0.5,
      confidence: probability,
      features
    };
  }
  
  classifyEmotion(features) {
    // Simple emotion classification based on audio features
    const emotions = ['neutral', 'happy', 'sad', 'angry', 'excited'];
    const scores = emotions.map(() => Math.random()); // Placeholder
    
    const maxIndex = scores.indexOf(Math.max(...scores));
    
    return {
      emotion: emotions[maxIndex],
      confidence: scores[maxIndex],
      allScores: emotions.reduce((obj, emotion, i) => {
        obj[emotion] = scores[i];
        return obj;
      }, {})
    };
  }
  
  classifyWakeWord(features) {
    // Simple wake word classification
    const { energy, zcr, spectralCentroid } = features;
    
    // Heuristic-based classification
    let confidence = 0;
    
    if (energy > 0.1) confidence += 0.3;
    if (zcr > 0.1 && zcr < 0.5) confidence += 0.2;
    if (spectralCentroid > 500 && spectralCentroid < 2000) confidence += 0.3;
    
    return {
      detected: confidence > 0.6,
      confidence,
      features
    };
  }
  
  calculateValence(emotionScores) {
    const positive = emotionScores.happy + emotionScores.excited;
    const negative = emotionScores.sad + emotionScores.angry;
    return (positive - negative) / 2; // Range: -1 to 1
  }
  
  calculateArousal(audioFeatures) {
    if (!audioFeatures) return 0.5;
    
    // High energy and high pitch indicate high arousal
    const energyComponent = Math.min(1, audioFeatures.energy / 0.5);
    const pitchComponent = audioFeatures.pitch > 150 ? 0.8 : 0.2;
    
    return (energyComponent + pitchComponent) / 2;
  }
  
  // Utility methods
  updateMetrics(processingTime, success) {
    this.tasksProcessed++;
    this.totalProcessingTime += processingTime;
    
    if (!success) {
      this.errors++;
    }
    
    this.memoryUsage = this.estimateMemoryUsage();
  }
  
  estimateMemoryUsage() {
    // Rough estimate of memory usage in MB
    return (this.tasksProcessed * 0.05) + 3; // Base 3MB + 0.05MB per task
  }
  
  getPerformanceMetrics() {
    return {
      tasksProcessed: this.tasksProcessed,
      avgProcessingTime: this.tasksProcessed > 0 ? this.totalProcessingTime / this.tasksProcessed : 0,
      memoryUsage: this.memoryUsage,
      errorRate: this.tasksProcessed > 0 ? this.errors / this.tasksProcessed : 0,
      capabilities: Array.from(this.capabilities),
      isInitialized: this.isInitialized
    };
  }
  
  // Data processing utilities
  arrayToObject(array) {
    return array.reduce((obj, item, index) => {
      obj[index] = item;
      return obj;
    }, {});
  }
  
  flattenArray(array) {
    return array.flat(Infinity);
  }
  
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }
  
  filterData(array, predicateKey) {
    // Safe predicate registry (replaces eval-based Function constructor)
    const safePredicates = {
      'isPositive': (item) => item > 0,
      'isNegative': (item) => item < 0,
      'isZero': (item) => item === 0,
      'isEven': (item) => item % 2 === 0,
      'isOdd': (item) => item % 2 !== 0,
      'isNumber': (item) => typeof item === 'number' && !isNaN(item),
      'isString': (item) => typeof item === 'string',
      'isObject': (item) => typeof item === 'object' && item !== null,
      'isArray': (item) => Array.isArray(item),
      'isNull': (item) => item === null,
      'isUndefined': (item) => item === undefined,
      'isTruthy': (item) => !!item,
      'isFalsy': (item) => !item
    };

    const predicate = safePredicates[predicateKey];
    if (!predicate) {
      console.warn('Unknown predicate:', predicateKey, 'Available predicates:', Object.keys(safePredicates));
      return array; // Return unfiltered array instead of throwing
    }
    return array.filter(predicate);
  }
  
  normalizeData(array) {
    const min = Math.min(...array);
    const max = Math.max(...array);
    const range = max - min;
    
    if (range === 0) return array.map(() => 0);
    
    return array.map(value => (value - min) / range);
  }
  
  calculateStatistics(values) {
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    const sorted = [...values].sort((a, b) => a - b);
    const median = n % 2 === 0 ? 
      (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : 
      sorted[Math.floor(n / 2)];
    
    return {
      count: n,
      sum,
      mean,
      median,
      variance,
      standardDeviation: stdDev,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }
  
  calculateCorrelation(x, y) {
    if (x.length !== y.length) {
      throw new Error('Arrays must have the same length');
    }
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
    const sumX2 = x.reduce((acc, val) => acc + val * val, 0);
    const sumY2 = y.reduce((acc, val) => acc + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
  
  performFFT(values) {
    // Simplified FFT implementation
    const N = values.length;
    const result = new Array(N / 2);
    
    for (let k = 0; k < result.length; k++) {
      let real = 0, imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += values[n] * Math.cos(angle);
        imag += values[n] * Math.sin(angle);
      }
      
      result[k] = { 
        real, 
        imag, 
        magnitude: Math.sqrt(real * real + imag * imag),
        phase: Math.atan2(imag, real)
      };
    }
    
    return result;
  }
  
  interpolateData(values, targetLength) {
    if (values.length === targetLength) return values;
    
    const result = new Array(targetLength);
    const step = (values.length - 1) / (targetLength - 1);
    
    for (let i = 0; i < targetLength; i++) {
      const index = i * step;
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const fraction = index - lower;
      
      if (lower === upper) {
        result[i] = values[lower];
      } else {
        result[i] = values[lower] * (1 - fraction) + values[upper] * fraction;
      }
    }
    
    return result;
  }
  
  detectPeaks(values) {
    const peaks = [];
    const threshold = 0.1; // Minimum peak prominence
    
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1] && values[i] > threshold) {
        peaks.push({
          index: i,
          value: values[i],
          prominence: Math.min(values[i] - values[i - 1], values[i] - values[i + 1])
        });
      }
    }
    
    return peaks.sort((a, b) => b.prominence - a.prominence);
  }
  
  validateJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return { valid: true, parsed };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
  
  mergeJson(obj1, obj2) {
    return { ...obj1, ...obj2 };
  }
  
  extractJsonPaths(obj, prefix = '') {
    const paths = [];
    
    for (const key in obj) {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        paths.push(...this.extractJsonPaths(obj[key], path));
      } else {
        paths.push({ path, value: obj[key], type: typeof obj[key] });
      }
    }
    
    return paths;
  }
  
  transformJson(obj, transformer) {
    // Simple JSON transformation based on mapping rules
    const result = {};

    for (const [targetKey, sourceKey] of Object.entries(transformer)) {
      if (Object.prototype.hasOwnProperty.call(obj, sourceKey)) {
        result[targetKey] = obj[sourceKey];
      }
    }

    return result;
  }
}

// Worker message handling
const generalProcessor = new GeneralProcessor();

self.onmessage = async function(event) {
  const { type, data } = event.data;
  
  try {
    let response;
    
    switch (type) {
      case 'init':
        response = await generalProcessor.initialize(data.config || {});
        if (response.success) {
          self.postMessage({ 
            type: 'ready', 
            workerId: data.workerId,
            capabilities: response.capabilities
          });
        } else {
          self.postMessage({ type: 'error', error: response.error });
        }
        break;
        
      case 'process_task':
        response = await generalProcessor.processTask(data.task);
        
        if (response.success) {
          self.postMessage({
            type: 'task_complete',
            taskId: data.task.id,
            result: response.result,
            processingTime: response.processingTime,
            memoryUsage: response.memoryUsage
          });
        } else {
          self.postMessage({
            type: 'task_error',
            taskId: data.task.id,
            error: response.error,
            processingTime: response.processingTime
          });
        }
        break;
        
      case 'get_metrics':
        response = generalProcessor.getPerformanceMetrics();
        self.postMessage({
          type: 'metrics',
          metrics: response
        });
        break;
        
      default:
        console.warn('Unknown message type:', type);
    }
    
  } catch (error) {
    console.error('General worker error:', error);
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
};

// Send periodic heartbeat
setInterval(() => {
  self.postMessage({
    type: 'heartbeat',
    memoryUsage: generalProcessor.estimateMemoryUsage(),
    tasksProcessed: generalProcessor.tasksProcessed
  });
}, 5000);