/**
 * Edge Computing Query Processor
 * Inspired by clevaway/J.A.R.V.I.S offline capabilities
 * Processes common queries locally without cloud API calls for ultra-low latency
 */

interface EdgeQuery {
  id: string;
  patterns: string[];
  response: string | (() => string);
  category: QueryCategory;
  confidence_threshold: number;
  context_required?: string[];
  dynamic_data?: boolean;
}

interface QueryMatch {
  query: EdgeQuery;
  confidence: number;
  matched_pattern: string;
  extracted_entities?: Record<string, any>;
}

interface EdgeQueryConfig {
  enabled: boolean;
  confidence_threshold: number;
  max_processing_time_ms: number;
  cache_enabled: boolean;
  fuzzy_matching: boolean;
  context_awareness: boolean;
  learning_enabled: boolean;
}

interface ProcessingResult {
  handled: boolean;
  response?: string;
  confidence: number;
  processing_time_ms: number;
  source: 'edge' | 'cache' | 'fallback';
  metadata?: Record<string, any>;
}

enum QueryCategory {
  TIME_DATE = 'time_date',
  WEATHER = 'weather',
  NAVIGATION = 'navigation',
  VEHICLE_STATUS = 'vehicle_status',
  QUICK_FACTS = 'quick_facts',
  CALCULATIONS = 'calculations',
  CONTROLS = 'controls',
  STATUS_CHECK = 'status_check',
  COMMON_QUESTIONS = 'common_questions',
  TRAVEL_INFO = 'travel_info'
}

interface LearningData {
  pattern: string;
  frequency: number;
  last_used: number;
  success_rate: number;
  avg_confidence: number;
}

export class EdgeQueryProcessor {
  private config: EdgeQueryConfig;
  private queries: Map<string, EdgeQuery> = new Map();
  private queryCache: Map<string, { response: string; timestamp: number; ttl: number }> = new Map();
  private learningData: Map<string, LearningData> = new Map();
  private contextData: Map<string, any> = new Map();
  
  // Pattern matching
  private stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'what', 'how', 'when', 'where', 'why', 'is', 'are', 'can', 'could', 'would', 'should']);
  private synonyms: Map<string, string[]> = new Map();
  
  // Performance tracking
  private metrics = {
    total_queries: 0,
    edge_handled: 0,
    cache_hits: 0,
    fallback_needed: 0,
    avg_processing_time: 0,
    total_processing_time: 0
  };

  constructor(config: Partial<EdgeQueryConfig> = {}) {
    this.config = {
      enabled: true,
      confidence_threshold: 0.7,
      max_processing_time_ms: 100, // Ultra-fast processing
      cache_enabled: true,
      fuzzy_matching: true,
      context_awareness: true,
      learning_enabled: true,
      ...config
    };
    
    this.initializeSynonyms();
    this.initializeCommonQueries();
    this.loadLearningData();
  }

  private initializeSynonyms(): void {
    this.synonyms.set('time', ['clock', 'hour', 'minute']);
    this.synonyms.set('weather', ['temperature', 'climate', 'forecast', 'rain', 'sun', 'wind']);
    this.synonyms.set('location', ['place', 'position', 'where', 'address']);
    this.synonyms.set('navigation', ['directions', 'route', 'way', 'path', 'navigate']);
    this.synonyms.set('fuel', ['gas', 'diesel', 'petrol', 'energy']);
    this.synonyms.set('battery', ['power', 'charge', 'energy']);
    this.synonyms.set('calculate', ['compute', 'figure', 'work out', 'determine']);
    this.synonyms.set('play', ['start', 'begin', 'turn on']);
    this.synonyms.set('stop', ['pause', 'halt', 'end', 'turn off']);
  }

  private initializeCommonQueries(): void {
    // Time and Date queries
    this.addQuery({
      id: 'current_time',
      patterns: [
        'what time is it',
        'current time',
        'what is the time',
        'tell me the time',
        'time please'
      ],
      response: () => new Date().toLocaleTimeString(),
      category: QueryCategory.TIME_DATE,
      confidence_threshold: 0.8
    });

    this.addQuery({
      id: 'current_date',
      patterns: [
        'what date is it',
        'what is today',
        'current date',
        'today\'s date',
        'what day is it'
      ],
      response: () => new Date().toLocaleDateString(),
      category: QueryCategory.TIME_DATE,
      confidence_threshold: 0.8
    });

    // Quick calculations
    this.addQuery({
      id: 'simple_math',
      patterns: [
        'calculate * plus *',
        'what is * plus *',
        '* plus *',
        '* add *',
        '* minus *',
        '* times *',
        '* divided by *'
      ],
      response: (entities) => this.performCalculation(entities),
      category: QueryCategory.CALCULATIONS,
      confidence_threshold: 0.7,
      dynamic_data: true
    });

    // Vehicle status (mock data for demonstration)
    this.addQuery({
      id: 'fuel_level',
      patterns: [
        'how much fuel',
        'fuel level',
        'gas level',
        'fuel remaining',
        'how much gas'
      ],
      response: () => `Fuel level is at ${Math.floor(Math.random() * 100)}%`,
      category: QueryCategory.VEHICLE_STATUS,
      confidence_threshold: 0.8
    });

    this.addQuery({
      id: 'battery_status',
      patterns: [
        'battery level',
        'battery status',
        'how much battery',
        'power level',
        'charge level'
      ],
      response: () => `Battery is at ${Math.floor(Math.random() * 100)}%`,
      category: QueryCategory.VEHICLE_STATUS,
      confidence_threshold: 0.8
    });

    // PAM controls
    this.addQuery({
      id: 'volume_up',
      patterns: [
        'volume up',
        'louder',
        'increase volume',
        'turn up volume',
        'make it louder'
      ],
      response: () => {
        // This would integrate with actual volume control
        return 'Volume increased';
      },
      category: QueryCategory.CONTROLS,
      confidence_threshold: 0.9
    });

    this.addQuery({
      id: 'volume_down',
      patterns: [
        'volume down',
        'quieter',
        'decrease volume',
        'turn down volume',
        'make it quieter'
      ],
      response: () => {
        // This would integrate with actual volume control
        return 'Volume decreased';
      },
      category: QueryCategory.CONTROLS,
      confidence_threshold: 0.9
    });

    // Common travel questions
    this.addQuery({
      id: 'trip_distance',
      patterns: [
        'how far',
        'distance to destination',
        'miles to go',
        'how many miles',
        'remaining distance'
      ],
      response: () => `Approximately ${Math.floor(Math.random() * 500)} miles remaining`,
      category: QueryCategory.TRAVEL_INFO,
      confidence_threshold: 0.7
    });

    this.addQuery({
      id: 'arrival_time',
      patterns: [
        'when will we arrive',
        'arrival time',
        'eta',
        'estimated arrival',
        'when do we get there'
      ],
      response: () => {
        const eta = new Date(Date.now() + Math.random() * 4 * 60 * 60 * 1000);
        return `Estimated arrival: ${eta.toLocaleTimeString()}`;
      },
      category: QueryCategory.TRAVEL_INFO,
      confidence_threshold: 0.8
    });

    // Quick facts and help
    this.addQuery({
      id: 'pam_help',
      patterns: [
        'help',
        'what can you do',
        'commands',
        'how to use',
        'what are your features'
      ],
      response: 'I can help with navigation, weather, vehicle status, calculations, and travel planning. Just ask me naturally!',
      category: QueryCategory.COMMON_QUESTIONS,
      confidence_threshold: 0.8
    });

    this.addQuery({
      id: 'pam_intro',
      patterns: [
        'who are you',
        'what are you',
        'introduce yourself',
        'tell me about yourself'
      ],
      response: 'I\'m PAM, your Personal Assistant for Motorhomes. I\'m here to help with your travel planning, navigation, and RV management needs.',
      category: QueryCategory.COMMON_QUESTIONS,
      confidence_threshold: 0.8
    });
  }

  async processQuery(query: string, context?: Record<string, any>): Promise<ProcessingResult> {
    if (!this.config.enabled) {
      return {
        handled: false,
        confidence: 0,
        processing_time_ms: 0,
        source: 'fallback'
      };
    }

    const startTime = performance.now();
    this.metrics.total_queries++;

    try {
      // Normalize query
      const normalizedQuery = this.normalizeQuery(query);
      
      // Check cache first
      if (this.config.cache_enabled) {
        const cachedResult = this.checkCache(normalizedQuery);
        if (cachedResult) {
          const processingTime = performance.now() - startTime;
          this.updateMetrics(processingTime, 'cache');
          
          return {
            handled: true,
            response: cachedResult.response,
            confidence: 0.95, // High confidence for cached results
            processing_time_ms: processingTime,
            source: 'cache'
          };
        }
      }

      // Find best matching query
      const match = this.findBestMatch(normalizedQuery, context);
      
      if (match && match.confidence >= this.config.confidence_threshold) {
        // Generate response
        const response = await this.generateResponse(match, context);
        const processingTime = performance.now() - startTime;

        // Check processing time limit
        if (processingTime > this.config.max_processing_time_ms) {
          console.warn(`⚠️ Edge processing exceeded time limit: ${processingTime.toFixed(2)}ms`);
          return {
            handled: false,
            confidence: match.confidence,
            processing_time_ms: processingTime,
            source: 'fallback'
          };
        }

        // Cache successful result
        if (this.config.cache_enabled && response) {
          this.cacheResult(normalizedQuery, response, this.getCacheTTL(match.query.category));
        }

        // Update learning data
        if (this.config.learning_enabled) {
          this.updateLearningData(match.matched_pattern, match.confidence);
        }

        this.updateMetrics(processingTime, 'edge');

        return {
          handled: true,
          response,
          confidence: match.confidence,
          processing_time_ms: processingTime,
          source: 'edge',
          metadata: {
            category: match.query.category,
            pattern: match.matched_pattern,
            entities: match.extracted_entities
          }
        };
      }

      // No match found
      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime, 'fallback');

      return {
        handled: false,
        confidence: match?.confidence || 0,
        processing_time_ms: processingTime,
        source: 'fallback'
      };

    } catch (error) {
      console.error('❌ Edge query processing error:', error);
      const processingTime = performance.now() - startTime;
      
      return {
        handled: false,
        confidence: 0,
        processing_time_ms: processingTime,
        source: 'fallback'
      };
    }
  }

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findBestMatch(query: string, context?: Record<string, any>): QueryMatch | null {
    let bestMatch: QueryMatch | null = null;
    let highestConfidence = 0;

    for (const [id, edgeQuery] of this.queries) {
      for (const pattern of edgeQuery.patterns) {
        const confidence = this.calculatePatternConfidence(query, pattern);
        
        if (confidence > highestConfidence && confidence >= edgeQuery.confidence_threshold) {
          // Check context requirements
          if (this.config.context_awareness && edgeQuery.context_required) {
            if (!this.hasRequiredContext(edgeQuery.context_required, context)) {
              continue;
            }
          }

          bestMatch = {
            query: edgeQuery,
            confidence,
            matched_pattern: pattern,
            extracted_entities: this.extractEntities(query, pattern)
          };
          highestConfidence = confidence;
        }
      }
    }

    return bestMatch;
  }

  private calculatePatternConfidence(query: string, pattern: string): number {
    const queryTokens = this.tokenize(query);
    const patternTokens = this.tokenize(pattern);

    // Exact match
    if (query === pattern) {
      return 1.0;
    }

    // Handle wildcard patterns
    if (pattern.includes('*')) {
      return this.matchWildcardPattern(queryTokens, patternTokens);
    }

    // Calculate token overlap
    const overlap = this.calculateTokenOverlap(queryTokens, patternTokens);
    let confidence = overlap;

    // Apply fuzzy matching if enabled
    if (this.config.fuzzy_matching) {
      confidence = Math.max(confidence, this.fuzzyMatch(queryTokens, patternTokens));
    }

    // Boost confidence for synonym matches
    confidence = Math.max(confidence, this.synonymMatch(queryTokens, patternTokens));

    return confidence;
  }

  private tokenize(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(token => token.length > 0 && !this.stopWords.has(token));
  }

  private calculateTokenOverlap(tokens1: string[], tokens2: string[]): number {
    if (tokens1.length === 0 || tokens2.length === 0) {
      return 0;
    }

    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    return intersection.size / Math.max(set1.size, set2.size);
  }

  private matchWildcardPattern(queryTokens: string[], patternTokens: string[]): number {
    // Simple wildcard matching for patterns like "* plus *"
    let queryIndex = 0;
    let patternIndex = 0;
    let matches = 0;

    while (queryIndex < queryTokens.length && patternIndex < patternTokens.length) {
      if (patternTokens[patternIndex] === '*') {
        matches++;
        patternIndex++;
        // Skip until next non-wildcard token
        continue;
      }

      if (queryTokens[queryIndex] === patternTokens[patternIndex]) {
        matches++;
        queryIndex++;
        patternIndex++;
      } else {
        queryIndex++;
      }
    }

    return matches / Math.max(queryTokens.length, patternTokens.length);
  }

  private fuzzyMatch(tokens1: string[], tokens2: string[]): number {
    let maxSimilarity = 0;

    for (const token1 of tokens1) {
      for (const token2 of tokens2) {
        const similarity = this.levenshteinSimilarity(token1, token2);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }

    return maxSimilarity * 0.8; // Reduce confidence for fuzzy matches
  }

  private synonymMatch(tokens1: string[], tokens2: string[]): number {
    let matches = 0;
    let total = 0;

    for (const token1 of tokens1) {
      total++;
      for (const token2 of tokens2) {
        if (this.areSynonyms(token1, token2)) {
          matches++;
          break;
        }
      }
    }

    return total > 0 ? matches / total : 0;
  }

  private areSynonyms(word1: string, word2: string): boolean {
    if (word1 === word2) return true;

    for (const [base, synonyms] of this.synonyms) {
      if ((word1 === base && synonyms.includes(word2)) ||
          (word2 === base && synonyms.includes(word1)) ||
          (synonyms.includes(word1) && synonyms.includes(word2))) {
        return true;
      }
    }

    return false;
  }

  private levenshteinSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return maxLength > 0 ? 1 - matrix[str2.length][str1.length] / maxLength : 0;
  }

  private extractEntities(query: string, pattern: string): Record<string, any> {
    const entities: Record<string, any> = {};

    if (pattern.includes('*')) {
      const queryTokens = query.split(/\s+/);
      const patternTokens = pattern.split(/\s+/);
      
      let queryIndex = 0;
      let wildcardIndex = 0;

      for (let i = 0; i < patternTokens.length; i++) {
        if (patternTokens[i] === '*') {
          // Extract entity value
          const entityStart = queryIndex;
          
          // Find next non-wildcard token to determine entity end
          let entityEnd = queryTokens.length;
          if (i + 1 < patternTokens.length) {
            const nextToken = patternTokens[i + 1];
            for (let j = queryIndex; j < queryTokens.length; j++) {
              if (queryTokens[j] === nextToken) {
                entityEnd = j;
                break;
              }
            }
          }

          if (entityStart < entityEnd) {
            const entityValue = queryTokens.slice(entityStart, entityEnd).join(' ');
            entities[`entity_${wildcardIndex}`] = entityValue;
            wildcardIndex++;
          }
          
          queryIndex = entityEnd;
        } else {
          // Skip matching tokens
          while (queryIndex < queryTokens.length && queryTokens[queryIndex] !== patternTokens[i]) {
            queryIndex++;
          }
          queryIndex++;
        }
      }
    }

    return entities;
  }

  private async generateResponse(match: QueryMatch, context?: Record<string, any>): Promise<string | null> {
    try {
      if (typeof match.query.response === 'function') {
        if (match.query.dynamic_data && match.extracted_entities) {
          return match.query.response(match.extracted_entities);
        } else {
          return match.query.response();
        }
      } else {
        return match.query.response;
      }
    } catch (error) {
      console.error('❌ Error generating response:', error);
      return null;
    }
  }

  private performCalculation(entities: Record<string, any>): string {
    try {
      const entity0 = entities.entity_0;
      const entity1 = entities.entity_1;
      
      if (!entity0 || !entity1) {
        return "I need two numbers to calculate.";
      }

      const num1 = parseFloat(entity0);
      const num2 = parseFloat(entity1);

      if (isNaN(num1) || isNaN(num2)) {
        return "Please provide valid numbers for calculation.";
      }

      // Simple operation detection based on common patterns
      const query = `${entity0} ${entity1}`.toLowerCase();
      
      if (query.includes('plus') || query.includes('add')) {
        return `${num1} plus ${num2} equals ${num1 + num2}`;
      } else if (query.includes('minus') || query.includes('subtract')) {
        return `${num1} minus ${num2} equals ${num1 - num2}`;
      } else if (query.includes('times') || query.includes('multiply')) {
        return `${num1} times ${num2} equals ${num1 * num2}`;
      } else if (query.includes('divided') || query.includes('divide')) {
        if (num2 === 0) {
          return "Cannot divide by zero.";
        }
        return `${num1} divided by ${num2} equals ${(num1 / num2).toFixed(2)}`;
      }

      return `${num1} plus ${num2} equals ${num1 + num2}`;
    } catch (error) {
      return "Sorry, I couldn't perform that calculation.";
    }
  }

  private hasRequiredContext(required: string[], context?: Record<string, any>): boolean {
    if (!context) return false;
    
    return required.every(key => context.hasOwnProperty(key));
  }

  private checkCache(query: string): { response: string; timestamp: number; ttl: number } | null {
    const cached = this.queryCache.get(query);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.metrics.cache_hits++;
      return cached;
    }

    if (cached) {
      this.queryCache.delete(query);
    }

    return null;
  }

  private cacheResult(query: string, response: string, ttl: number): void {
    this.queryCache.set(query, {
      response,
      timestamp: Date.now(),
      ttl
    });

    // Limit cache size
    if (this.queryCache.size > 100) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }
  }

  private getCacheTTL(category: QueryCategory): number {
    switch (category) {
      case QueryCategory.TIME_DATE:
        return 60000; // 1 minute
      case QueryCategory.WEATHER:
        return 600000; // 10 minutes
      case QueryCategory.VEHICLE_STATUS:
        return 30000; // 30 seconds
      case QueryCategory.CALCULATIONS:
        return 3600000; // 1 hour
      case QueryCategory.COMMON_QUESTIONS:
        return 86400000; // 24 hours
      default:
        return 300000; // 5 minutes
    }
  }

  private updateLearningData(pattern: string, confidence: number): void {
    const existing = this.learningData.get(pattern);
    
    if (existing) {
      existing.frequency++;
      existing.last_used = Date.now();
      existing.avg_confidence = (existing.avg_confidence + confidence) / 2;
      existing.success_rate = Math.min(1, existing.success_rate + 0.1);
    } else {
      this.learningData.set(pattern, {
        pattern,
        frequency: 1,
        last_used: Date.now(),
        success_rate: 0.5,
        avg_confidence: confidence
      });
    }
  }

  private updateMetrics(processingTime: number, source: 'edge' | 'cache' | 'fallback'): void {
    this.metrics.total_processing_time += processingTime;
    this.metrics.avg_processing_time = this.metrics.total_processing_time / this.metrics.total_queries;

    switch (source) {
      case 'edge':
        this.metrics.edge_handled++;
        break;
      case 'cache':
        this.metrics.cache_hits++;
        break;
      case 'fallback':
        this.metrics.fallback_needed++;
        break;
    }
  }

  private loadLearningData(): void {
    try {
      const stored = localStorage.getItem('pam_edge_learning_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.learningData = new Map(data);
      }
    } catch (error) {
      console.warn('⚠️ Could not load learning data:', error);
    }
  }

  private saveLearningData(): void {
    try {
      const data = Array.from(this.learningData.entries());
      localStorage.setItem('pam_edge_learning_data', JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Could not save learning data:', error);
    }
  }

  // Public API methods
  addQuery(query: EdgeQuery): void {
    this.queries.set(query.id, query);
  }

  removeQuery(id: string): void {
    this.queries.delete(id);
  }

  updateContext(key: string, value: any): void {
    this.contextData.set(key, value);
  }

  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  getConfig(): EdgeQueryConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<EdgeQueryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  clearCache(): void {
    this.queryCache.clear();
  }

  exportLearningData(): any {
    return Object.fromEntries(this.learningData);
  }

  importLearningData(data: any): void {
    this.learningData = new Map(Object.entries(data));
  }

  destroy(): void {
    this.saveLearningData();
    this.queryCache.clear();
    this.queries.clear();
    this.learningData.clear();
    this.contextData.clear();
  }
}