# Advanced PAM Context Management System

## 🎯 Overview

This advanced context management system provides sophisticated conversation handling for PAM with intelligent context windows, token management, summarization, branching, and persistence. Built specifically to handle Claude API's 200k token limit while maintaining conversation coherence and performance.

## ✨ Key Features

### 🖼️ Sliding Window Context Management
- **Intelligent Message Retention**: Keeps recent messages in full, summarizes older ones
- **Importance-Based Filtering**: Preserves high-importance messages during optimization
- **Token-Aware Operations**: Automatically manages context to stay within Claude's 200k token limit
- **Real-time Optimization**: Automatically optimizes context when limits are approached

### 🔢 Advanced Token Counting
- **Claude-Specific Estimation**: Accurate token counting for Claude's tokenizer
- **Multiple Estimation Methods**: Character-based, word-based, and enhanced algorithms
- **Cost Estimation**: Tracks API costs based on token usage
- **Performance Optimized**: Caching and batch operations for efficiency

### 📝 Intelligent Summarization
- **Multiple Strategies**: Extractive, abstractive, hybrid, and template-based
- **Context-Aware**: Preserves key topics, entities, and conversation flow
- **Quality Assessment**: Evaluates summary coherence, completeness, and accuracy
- **Iterative Processing**: Handles very long conversations with segmented summarization

### 🌳 Conversation Branching
- **Automatic Topic Detection**: Identifies topic shifts and creates branches
- **Tree Structure Management**: Maintains hierarchical conversation branches
- **Smart Merging**: Automatically merges related inactive branches
- **Navigation Support**: Provides intuitive branch navigation options

### 💾 Multi-Backend Persistence
- **Storage Options**: localStorage, IndexedDB, and Supabase support
- **Compression**: Automatic data compression for large contexts
- **Cross-Tab Sync**: Synchronizes context across browser tabs
- **Backup & Recovery**: Automatic backups with integrity verification

## 🚀 Quick Start

### Basic Integration

```typescript
import { createContextSystem, CONTEXT_CONFIGS } from '@/services/pam/context';

// Create a complete context system
const contextSystem = createContextSystem(
  'user-123',
  'conversation-456',
  CONTEXT_CONFIGS.standard
);

// Initialize the system
await contextSystem.initialize();

// Add messages
await contextSystem.addMessage({
  role: 'user',
  content: 'Hello, I need help with trip planning',
  timestamp: new Date()
});

// Get optimized context for Claude API
const context = contextSystem.getOptimizedContext();

// Send to Claude API
const response = await claudeService.chat(context);
```

### Advanced Usage

```typescript
import { 
  AdvancedContextManager,
  ClaudeTokenCounter,
  ContextSummarizer,
  ConversationBranchManager,
  ContextPersistenceManager
} from '@/services/pam/context';

// Create individual components for fine control
const contextManager = new AdvancedContextManager('user-123', 'conv-456', {
  maxWindowSize: 50,
  maxTokens: 180000,
  summarizationThreshold: 30,
  enableAutoBranching: true
});

const tokenCounter = new ClaudeTokenCounter();
const summarizer = new ContextSummarizer({ strategy: 'hybrid' });
const branchManager = new ConversationBranchManager('user-123', contextManager);
const persistence = new ContextPersistenceManager('user-123');

// Initialize and use
await contextManager.initializeContext();

// Add enhanced messages
const message = {
  id: 'msg-123',
  role: 'user',
  content: 'Plan a camping trip to Yellowstone',
  timestamp: new Date(),
  topics: ['travel', 'camping', 'national-parks'],
  entities: ['Yellowstone'],
  importance: 0.8
};

await contextManager.addMessage(message);
```

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                Context System Core                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Context Manager │  │ Token Counter   │              │
│  │                 │  │                 │              │
│  │ • Sliding Window│  │ • Claude Limits │              │
│  │ • Optimization  │  │ • Cost Tracking │              │
│  │ • Message Flow  │  │ • Performance   │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Summarizer      │  │ Branch Manager  │              │
│  │                 │  │                 │              │
│  │ • Multi-Strategy│  │ • Topic Shifts  │              │
│  │ • Quality Check │  │ • Tree Structure│              │
│  │ • Iterative     │  │ • Auto Merging  │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Persistence Layer                      │ │
│  │                                                     │ │
│  │ localStorage │ IndexedDB │ Supabase │ Compression   │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Configuration Options

### Context Manager Configuration

```typescript
{
  maxWindowSize: 50,           // Maximum messages in window
  maxTokens: 180000,           // Claude API token limit
  tokenBuffer: 20000,          // Reserve space for responses
  summarizationThreshold: 30,  // When to start summarizing
  importanceDecayFactor: 0.95, // How quickly importance decays
  enableAutoBranching: true,   // Automatic topic branching
  topicShiftThreshold: 0.6,    // Sensitivity for topic shifts
  enableSmartOptimization: true // AI-powered optimization
}
```

### Summarization Configuration

```typescript
{
  strategy: 'hybrid',          // extractive | abstractive | hybrid | template_based
  maxSummaryLength: 1000,      // Maximum summary length
  preserveImportantMessages: true,
  importanceThreshold: 0.8,    // Threshold for preservation
  includeTopics: true,         // Include topic information
  includeEntities: true,       // Include entity information
  compressionRatio: 0.3        // Target compression ratio
}
```

### Branching Configuration

```typescript
{
  enableAutoBranching: true,
  topicShiftThreshold: 0.6,    // Threshold for creating branches
  maxBranchDepth: 5,           // Maximum branch depth
  maxActiveBranches: 10,       // Maximum concurrent branches
  branchingCooldown: 5,        // Minutes between auto-branches
  enableSmartMerging: true,    // Automatic branch merging
  mergeInactiveAfter: 24       // Hours before considering merge
}
```

### Persistence Configuration

```typescript
{
  primaryStorage: 'indexedDB',  // localStorage | indexedDB | supabase
  backupStorage: 'localStorage', // Backup storage option
  enableCompression: true,      // Compress large contexts
  compressionThreshold: 50,     // KB threshold for compression
  enableCrossTabs: true,        // Cross-tab synchronization
  autoBackupInterval: 30,       // Minutes between backups
  enableVersioning: true,       // Version management
  maxVersions: 10              // Maximum versions to keep
}
```

## 📈 Performance Metrics

### Benchmarks (Tested)
- **Token Counting**: <1ms per message average
- **Context Optimization**: <10s for 100 messages
- **Memory Usage**: <100MB for 500 messages
- **Message Processing**: <3s full pipeline
- **Summarization**: <5s for 50 messages
- **Persistence**: <1s for typical context

### Scalability Limits
- **Max Messages**: 1000+ with optimization
- **Max Token Count**: 180k (Claude limit)
- **Max Branches**: 50 active branches
- **Storage Size**: 1GB+ depending on backend

## 🧪 Testing

The system includes comprehensive tests covering:

### Unit Tests
- Context initialization and management
- Token counting accuracy
- Summarization quality
- Branch management
- Persistence operations

### Integration Tests
- Full conversation flows
- Cross-component communication
- Error recovery scenarios
- Performance under load

### Performance Tests
- Token counting speed
- Memory usage optimization
- Context optimization timing
- Storage operation speed

### Run Tests

```bash
npm test src/services/pam/context/__tests__/
```

## 🔍 Monitoring & Analytics

### Context Statistics

```typescript
const stats = contextSystem.getSystemStats();

console.log({
  messageCount: stats.context.messageCount,
  tokenUsage: stats.tokenUsage,
  branchCount: stats.branches?.totalBranches,
  performance: stats.performance
});
```

### Performance Monitoring

```typescript
// Get detailed performance metrics
const contextStats = contextManager.getContextStats();
const tokenBudget = tokenCounter.calculateTokenBudget(contextStats.tokenCount);
const branchStats = branchManager?.getBranchStats();

// Monitor optimization frequency
const optimizationRate = contextStats.optimizationCount / contextStats.messageCount;
```

### Storage Monitoring

```typescript
// Check storage usage
const storageStats = await persistenceManager.getStorageStats();

console.log({
  primaryStorage: storageStats.primary,
  backupStorage: storageStats.backup,
  totalContexts: storageStats.totalContexts,
  recommendations: storageStats.primary.recommendations
});
```

## 🚨 Error Handling

### Common Issues & Solutions

#### Context Overflow
```typescript
// Automatically handled by optimization
const context = contextSystem.getOptimizedContext();
if (context.length === 0) {
  // Fallback to minimal context
  await contextManager.initializeContext();
}
```

#### Storage Quota Exceeded
```typescript
try {
  await persistenceManager.storeContext(context);
} catch (error) {
  if (error.message.includes('quota')) {
    // Enable compression or cleanup old data
    await persistenceManager.clearAllData();
    await persistenceManager.storeContext(context);
  }
}
```

#### Branch Tree Too Deep
```typescript
// Automatically handled by branch manager
const stats = branchManager.getBranchStats();
if (stats.maxDepth >= 5) {
  await branchManager.cleanupInactiveBranches();
}
```

## 🔮 Future Enhancements

### Planned Features
1. **WebRTC Integration**: Real-time voice context
2. **Multi-Language Support**: International conversation handling
3. **Advanced Analytics**: ML-powered conversation insights
4. **Custom Plugins**: Extensible context processors
5. **Real-time Collaboration**: Multi-user context sharing

### Optimization Opportunities
1. **WebAssembly Tokenizer**: Faster token counting
2. **Service Worker Persistence**: Offline-first storage
3. **Streaming Summarization**: Real-time summary updates
4. **Predictive Branching**: ML-based branch prediction
5. **Context Compression**: Advanced compression algorithms

## 📄 License

This advanced context management system is part of the Wheels & Wins PAM project and follows the same license terms.

## 🤝 Contributing

Please refer to the main project contribution guidelines for development standards and processes.

---

**Built with ❤️ for the Wheels & Wins PAM Project**