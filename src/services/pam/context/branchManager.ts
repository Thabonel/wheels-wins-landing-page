/**
 * Conversation Branch Manager
 * 
 * Features:
 * - Intelligent topic shift detection
 * - Automatic conversation branching
 * - Branch navigation and management
 * - Context preservation across branches
 * - Branch merging and consolidation
 * - Visual branch tree representation
 */

import type { EnhancedMessage, ConversationBranch, ContextWindow } from './contextManager';
import { AdvancedContextManager } from './contextManager';
import { ClaudeTokenCounter } from './tokenCounter';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface BranchTreeNode {
  id: string;
  branch: ConversationBranch;
  parent?: BranchTreeNode;
  children: BranchTreeNode[];
  depth: number;
  isActive: boolean;
  metadata: BranchNodeMetadata;
}

export interface BranchNodeMetadata {
  messageCount: number;
  tokenCount: number;
  lastActivity: Date;
  topicSimilarity: number; // To parent branch
  importance: number;
  userEngagement: number;
  branchQuality: number;
}

export interface TopicShiftAnalysis {
  shiftDetected: boolean;
  confidence: number;
  oldTopics: string[];
  newTopics: string[];
  shiftType: 'gradual' | 'sudden' | 'return' | 'tangent';
  shiftTrigger?: EnhancedMessage;
  recommendedAction: 'branch' | 'continue' | 'merge' | 'archive';
  reason: string;
}

export interface BranchMergeCandidate {
  sourceBranch: ConversationBranch;
  targetBranch: ConversationBranch;
  mergeQuality: number;
  topicOverlap: number;
  timeProximity: number;
  recommendedStrategy: 'full_merge' | 'selective_merge' | 'summary_merge';
  potentialLoss: number; // Information that might be lost
}

export interface BranchNavigationPath {
  currentBranch: string;
  pathToRoot: string[];
  availableBranches: string[];
  suggestedNext?: string;
  navigationOptions: BranchNavigationOption[];
}

export interface BranchNavigationOption {
  branchId: string;
  displayName: string;
  description: string;
  distance: number; // Steps to reach
  relevance: number; // To current context
  actionType: 'switch' | 'merge' | 'continue' | 'create';
}

export interface BranchingConfig {
  enableAutoBranching: boolean;
  topicShiftThreshold: number;
  maxBranchDepth: number;
  maxActiveBranches: number;
  branchingCooldown: number; // Minutes between auto-branches
  importanceThreshold: number;
  enableSmartMerging: boolean;
  mergeInactiveAfter: number; // Hours of inactivity
  enableBranchSuggestions: boolean;
}

// =====================================================
// MAIN BRANCH MANAGER CLASS
// =====================================================

export class ConversationBranchManager {
  private config: BranchingConfig;
  private branchTree: Map<string, BranchTreeNode> = new Map();
  private rootBranch: BranchTreeNode | null = null;
  private activeBranch: BranchTreeNode | null = null;
  private contextManager: AdvancedContextManager;
  private tokenCounter: ClaudeTokenCounter;
  private lastBranchTime: Date = new Date(0);

  constructor(
    private userId: string,
    contextManager: AdvancedContextManager,
    config?: Partial<BranchingConfig>
  ) {
    this.config = {
      enableAutoBranching: true,
      topicShiftThreshold: 0.6,
      maxBranchDepth: 5,
      maxActiveBranches: 10,
      branchingCooldown: 5,
      importanceThreshold: 0.7,
      enableSmartMerging: true,
      mergeInactiveAfter: 24,
      enableBranchSuggestions: true,
      ...config
    };

    this.contextManager = contextManager;
    this.tokenCounter = new ClaudeTokenCounter();

    logger.debug('🌳 Branch Manager initialized', {
      userId,
      config: this.config
    });
  }

  // =====================================================
  // TOPIC SHIFT DETECTION
  // =====================================================

  /**
   * Analyze message for topic shifts that warrant branching
   */
  async analyzeTopicShift(
    newMessage: EnhancedMessage,
    recentMessages: EnhancedMessage[],
    conversationContext: any
  ): Promise<TopicShiftAnalysis> {
    logger.debug('🔍 Analyzing topic shift', {
      messageId: newMessage.id,
      recentCount: recentMessages.length
    });

    if (recentMessages.length < 3) {
      return this.createNullAnalysis('Insufficient conversation history');
    }

    // Extract topic vectors for analysis
    const currentTopics = new Set(newMessage.topics);
    const recentTopicSets = recentMessages.slice(-5).map(msg => new Set(msg.topics));
    
    // Calculate topic evolution
    const topicEvolution = this.analyzeTopicEvolution(currentTopics, recentTopicSets);
    
    // Detect shift type and confidence
    const shiftAnalysis = this.classifyTopicShift(
      currentTopics,
      recentTopicSets,
      topicEvolution
    );

    // Check cooldown period
    const timeSinceLastBranch = Date.now() - this.lastBranchTime.getTime();
    const cooldownActive = timeSinceLastBranch < (this.config.branchingCooldown * 60 * 1000);

    let recommendedAction: TopicShiftAnalysis['recommendedAction'] = 'continue';
    let reason = 'No significant topic shift detected';

    if (shiftAnalysis.confidence > this.config.topicShiftThreshold) {
      if (cooldownActive) {
        recommendedAction = 'continue';
        reason = `Topic shift detected but cooldown active (${Math.round(timeSinceLastBranch / 60000)}min ago)`;
      } else if (this.branchTree.size >= this.config.maxActiveBranches) {
        recommendedAction = 'merge';
        reason = 'Topic shift detected but max branches reached, consider merging';
      } else if (this.getActiveBranchDepth() >= this.config.maxBranchDepth) {
        recommendedAction = 'archive';
        reason = 'Topic shift detected but max depth reached';
      } else {
        recommendedAction = 'branch';
        reason = `Significant topic shift detected: ${shiftAnalysis.shiftType}`;
      }
    }

    const result: TopicShiftAnalysis = {
      shiftDetected: shiftAnalysis.confidence > this.config.topicShiftThreshold,
      confidence: shiftAnalysis.confidence,
      oldTopics: Array.from(recentTopicSets[recentTopicSets.length - 1] || []),
      newTopics: Array.from(currentTopics),
      shiftType: shiftAnalysis.type,
      shiftTrigger: newMessage,
      recommendedAction,
      reason
    };

    logger.debug('📊 Topic shift analysis complete', {
      shiftDetected: result.shiftDetected,
      confidence: Math.round(result.confidence * 100),
      shiftType: result.shiftType,
      action: recommendedAction
    });

    return result;
  }

  /**
   * Analyze topic evolution patterns
   */
  private analyzeTopicEvolution(
    currentTopics: Set<string>,
    recentTopicSets: Set<string>[]
  ): {
    continuity: number;
    divergence: number;
    novelty: number;
    return: number;
  } {
    if (recentTopicSets.length === 0) {
      return { continuity: 0, divergence: 1, novelty: 1, return: 0 };
    }

    // Calculate continuity with immediate previous message
    const lastTopics = recentTopicSets[recentTopicSets.length - 1];
    const continuity = this.calculateTopicSimilarity(currentTopics, lastTopics);

    // Calculate divergence from conversation trend
    const allRecentTopics = new Set<string>();
    recentTopicSets.forEach(topicSet => {
      topicSet.forEach(topic => allRecentTopics.add(topic));
    });
    const divergence = 1 - this.calculateTopicSimilarity(currentTopics, allRecentTopics);

    // Calculate novelty (completely new topics)
    const novelTopics = Array.from(currentTopics).filter(topic => !allRecentTopics.has(topic));
    const novelty = novelTopics.length / Math.max(currentTopics.size, 1);

    // Calculate return to earlier topics
    const earlierTopics = new Set<string>();
    recentTopicSets.slice(0, -2).forEach(topicSet => {
      topicSet.forEach(topic => earlierTopics.add(topic));
    });
    const returnTopics = Array.from(currentTopics).filter(topic => 
      earlierTopics.has(topic) && !lastTopics.has(topic)
    );
    const returnScore = returnTopics.length / Math.max(currentTopics.size, 1);

    return {
      continuity,
      divergence,
      novelty,
      return: returnScore
    };
  }

  /**
   * Classify the type of topic shift
   */
  private classifyTopicShift(
    currentTopics: Set<string>,
    recentTopicSets: Set<string>[],
    evolution: { continuity: number; divergence: number; novelty: number; return: number }
  ): { confidence: number; type: TopicShiftAnalysis['shiftType'] } {
    let confidence = 0;
    let type: TopicShiftAnalysis['shiftType'] = 'gradual';

    // Sudden shift: high divergence, low continuity
    if (evolution.divergence > 0.8 && evolution.continuity < 0.2) {
      confidence = evolution.divergence;
      type = 'sudden';
    }
    // Return to previous topic: high return score
    else if (evolution.return > 0.6) {
      confidence = evolution.return;
      type = 'return';
    }
    // Tangent: high novelty, moderate divergence
    else if (evolution.novelty > 0.5 && evolution.divergence > 0.5) {
      confidence = (evolution.novelty + evolution.divergence) / 2;
      type = 'tangent';
    }
    // Gradual shift: moderate divergence, some continuity
    else if (evolution.divergence > 0.4 && evolution.continuity > 0.2) {
      confidence = evolution.divergence * 0.7; // Lower confidence for gradual
      type = 'gradual';
    }
    else {
      confidence = Math.max(evolution.divergence, evolution.novelty) * 0.5;
      type = 'gradual';
    }

    return { confidence, type };
  }

  // =====================================================
  // BRANCH CREATION AND MANAGEMENT
  // =====================================================

  /**
   * Create a new conversation branch
   */
  async createBranch(
    topic: string,
    reason: ConversationBranch['reason'],
    branchPoint: string,
    parentBranchId?: string
  ): Promise<BranchTreeNode> {
    logger.info('🌿 Creating conversation branch', {
      topic,
      reason,
      branchPoint,
      parentBranchId
    });

    // Create the branch through context manager
    const branch = await this.contextManager.createConversationBranch(topic, reason, branchPoint);
    
    // Determine parent
    const parent = parentBranchId ? this.branchTree.get(parentBranchId) : this.activeBranch;
    const depth = parent ? parent.depth + 1 : 0;

    // Create tree node
    const node: BranchTreeNode = {
      id: branch.id,
      branch,
      parent,
      children: [],
      depth,
      isActive: false,
      metadata: {
        messageCount: branch.contextWindow.messages.length,
        tokenCount: branch.contextWindow.tokenCount,
        lastActivity: new Date(),
        topicSimilarity: parent ? await this.calculateBranchSimilarity(branch, parent.branch) : 1.0,
        importance: 0.5, // Will be updated based on usage
        userEngagement: 0.5,
        branchQuality: 0.7
      }
    };

    // Add to tree structure
    this.branchTree.set(branch.id, node);
    if (parent) {
      parent.children.push(node);
    } else {
      this.rootBranch = node;
    }

    this.lastBranchTime = new Date();

    logger.info('✅ Branch created successfully', {
      branchId: branch.id,
      depth,
      totalBranches: this.branchTree.size
    });

    return node;
  }

  /**
   * Switch to a different branch
   */
  async switchBranch(branchId: string): Promise<void> {
    const targetNode = this.branchTree.get(branchId);
    if (!targetNode) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    logger.info('🔄 Switching to branch', {
      from: this.activeBranch?.id || 'none',
      to: branchId,
      topic: targetNode.branch.topic
    });

    // Update active states
    if (this.activeBranch) {
      this.activeBranch.isActive = false;
    }

    targetNode.isActive = true;
    this.activeBranch = targetNode;

    // Update metadata
    targetNode.metadata.lastActivity = new Date();
    targetNode.metadata.userEngagement += 0.1;

    // Switch context through context manager
    await this.contextManager.switchToBranch(branchId);

    logger.info('✅ Branch switch complete', {
      branchId,
      messageCount: targetNode.metadata.messageCount
    });
  }

  /**
   * Archive an inactive branch
   */
  async archiveBranch(branchId: string): Promise<void> {
    const node = this.branchTree.get(branchId);
    if (!node) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    if (node.isActive) {
      throw new Error('Cannot archive active branch');
    }

    logger.info('📁 Archiving branch', {
      branchId,
      topic: node.branch.topic,
      messageCount: node.metadata.messageCount
    });

    // Remove from parent's children
    if (node.parent) {
      node.parent.children = node.parent.children.filter(child => child.id !== branchId);
    }

    // Archive children recursively
    for (const child of node.children) {
      await this.archiveBranch(child.id);
    }

    // Remove from tree
    this.branchTree.delete(branchId);

    logger.info('✅ Branch archived successfully', { branchId });
  }

  // =====================================================
  // BRANCH MERGING
  // =====================================================

  /**
   * Find candidates for branch merging
   */
  async findMergeCandidates(): Promise<BranchMergeCandidate[]> {
    if (!this.config.enableSmartMerging) return [];

    logger.debug('🔍 Finding merge candidates');

    const candidates: BranchMergeCandidate[] = [];
    const branches = Array.from(this.branchTree.values());

    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const branch1 = branches[i];
        const branch2 = branches[j];

        // Skip if either is active
        if (branch1.isActive || branch2.isActive) continue;

        // Check if branches are related (same parent or child-parent)
        const areRelated = this.areBranchesRelated(branch1, branch2);
        if (!areRelated) continue;

        const candidate = await this.evaluateMergeCandidate(branch1.branch, branch2.branch);
        if (candidate.mergeQuality > 0.6) {
          candidates.push(candidate);
        }
      }
    }

    // Sort by merge quality
    candidates.sort((a, b) => b.mergeQuality - a.mergeQuality);

    logger.debug('📊 Found merge candidates', {
      candidateCount: candidates.length,
      topQuality: candidates[0]?.mergeQuality || 0
    });

    return candidates.slice(0, 5); // Return top 5 candidates
  }

  /**
   * Evaluate a potential merge between two branches
   */
  private async evaluateMergeCandidate(
    sourceBranch: ConversationBranch,
    targetBranch: ConversationBranch
  ): Promise<BranchMergeCandidate> {
    // Calculate topic overlap
    const sourceTopics = new Set<string>();
    const targetTopics = new Set<string>();
    
    sourceBranch.contextWindow.messages.forEach(msg => {
      msg.topics.forEach(topic => sourceTopics.add(topic));
    });
    
    targetBranch.contextWindow.messages.forEach(msg => {
      msg.topics.forEach(topic => targetTopics.add(topic));
    });

    const topicOverlap = this.calculateTopicSimilarity(sourceTopics, targetTopics);

    // Calculate time proximity
    const sourceLastActivity = sourceBranch.contextWindow.lastUpdated;
    const targetLastActivity = targetBranch.contextWindow.lastUpdated;
    const timeDiff = Math.abs(sourceLastActivity.getTime() - targetLastActivity.getTime());
    const timeProximity = Math.max(0, 1 - (timeDiff / (24 * 60 * 60 * 1000))); // 1 day = 0 proximity

    // Calculate merge quality
    const mergeQuality = (topicOverlap * 0.7) + (timeProximity * 0.3);

    // Determine merge strategy
    let recommendedStrategy: BranchMergeCandidate['recommendedStrategy'] = 'full_merge';
    if (topicOverlap < 0.5) {
      recommendedStrategy = 'summary_merge';
    } else if (sourceBranch.contextWindow.messages.length > 20) {
      recommendedStrategy = 'selective_merge';
    }

    // Estimate potential information loss
    const potentialLoss = this.estimateInformationLoss(sourceBranch, targetBranch, recommendedStrategy);

    return {
      sourceBranch,
      targetBranch,
      mergeQuality,
      topicOverlap,
      timeProximity,
      recommendedStrategy,
      potentialLoss
    };
  }

  /**
   * Execute branch merge
   */
  async mergeBranches(candidate: BranchMergeCandidate): Promise<void> {
    logger.info('🔀 Merging branches', {
      source: candidate.sourceBranch.id,
      target: candidate.targetBranch.id,
      strategy: candidate.recommendedStrategy
    });

    const sourceNode = this.branchTree.get(candidate.sourceBranch.id);
    const targetNode = this.branchTree.get(candidate.targetBranch.id);

    if (!sourceNode || !targetNode) {
      throw new Error('Branch nodes not found for merging');
    }

    switch (candidate.recommendedStrategy) {
      case 'full_merge':
        await this.performFullMerge(sourceNode, targetNode);
        break;
      case 'selective_merge':
        await this.performSelectiveMerge(sourceNode, targetNode);
        break;
      case 'summary_merge':
        await this.performSummaryMerge(sourceNode, targetNode);
        break;
    }

    // Archive source branch
    await this.archiveBranch(candidate.sourceBranch.id);

    logger.info('✅ Branch merge complete', {
      strategy: candidate.recommendedStrategy,
      targetMessageCount: targetNode.metadata.messageCount
    });
  }

  // =====================================================
  // BRANCH NAVIGATION
  // =====================================================

  /**
   * Get current branch navigation context
   */
  getCurrentBranchNavigation(): BranchNavigationPath {
    if (!this.activeBranch) {
      return {
        currentBranch: 'none',
        pathToRoot: [],
        availableBranches: [],
        navigationOptions: []
      };
    }

    const pathToRoot = this.getPathToRoot(this.activeBranch);
    const availableBranches = Array.from(this.branchTree.keys());
    const navigationOptions = this.generateNavigationOptions();

    return {
      currentBranch: this.activeBranch.id,
      pathToRoot: pathToRoot.map(node => node.id),
      availableBranches,
      suggestedNext: this.suggestNextBranch(),
      navigationOptions
    };
  }

  /**
   * Generate navigation options for user
   */
  private generateNavigationOptions(): BranchNavigationOption[] {
    const options: BranchNavigationOption[] = [];
    
    if (!this.activeBranch) return options;

    // Parent branch option
    if (this.activeBranch.parent) {
      options.push({
        branchId: this.activeBranch.parent.id,
        displayName: `← ${this.activeBranch.parent.branch.topic}`,
        description: 'Return to parent conversation',
        distance: 1,
        relevance: 0.8,
        actionType: 'switch'
      });
    }

    // Child branch options
    this.activeBranch.children.forEach((child, index) => {
      options.push({
        branchId: child.id,
        displayName: `${child.branch.topic} →`,
        description: `Continue with ${child.branch.topic} discussion`,
        distance: 1,
        relevance: child.metadata.topicSimilarity,
        actionType: 'switch'
      });
    });

    // Sibling branch options
    if (this.activeBranch.parent) {
      this.activeBranch.parent.children
        .filter(sibling => sibling.id !== this.activeBranch!.id)
        .forEach(sibling => {
          options.push({
            branchId: sibling.id,
            displayName: `↔ ${sibling.branch.topic}`,
            description: `Switch to parallel ${sibling.branch.topic} discussion`,
            distance: 2,
            relevance: sibling.metadata.topicSimilarity,
            actionType: 'switch'
          });
        });
    }

    // Sort by relevance and distance
    options.sort((a, b) => {
      const scoreA = a.relevance - (a.distance * 0.1);
      const scoreB = b.relevance - (b.distance * 0.1);
      return scoreB - scoreA;
    });

    return options.slice(0, 8); // Return top 8 options
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private calculateTopicSimilarity(topics1: Set<string>, topics2: Set<string>): number {
    if (topics1.size === 0 && topics2.size === 0) return 1.0;
    if (topics1.size === 0 || topics2.size === 0) return 0.0;

    const intersection = new Set([...topics1].filter(topic => topics2.has(topic)));
    const union = new Set([...topics1, ...topics2]);

    return intersection.size / union.size;
  }

  private async calculateBranchSimilarity(
    branch1: ConversationBranch,
    branch2: ConversationBranch
  ): Promise<number> {
    const topics1 = new Set(branch1.contextWindow.messages.flatMap(msg => msg.topics));
    const topics2 = new Set(branch2.contextWindow.messages.flatMap(msg => msg.topics));
    
    return this.calculateTopicSimilarity(topics1, topics2);
  }

  private createNullAnalysis(reason: string): TopicShiftAnalysis {
    return {
      shiftDetected: false,
      confidence: 0,
      oldTopics: [],
      newTopics: [],
      shiftType: 'gradual',
      recommendedAction: 'continue',
      reason
    };
  }

  private getActiveBranchDepth(): number {
    return this.activeBranch ? this.activeBranch.depth : 0;
  }

  private areBranchesRelated(node1: BranchTreeNode, node2: BranchTreeNode): boolean {
    // Same parent
    if (node1.parent === node2.parent && node1.parent !== undefined) return true;
    
    // Parent-child relationship
    if (node1.parent === node2 || node2.parent === node1) return true;
    
    // Same level and close creation time
    if (node1.depth === node2.depth) {
      const timeDiff = Math.abs(
        node1.branch.createdAt.getTime() - node2.branch.createdAt.getTime()
      );
      return timeDiff < (2 * 60 * 60 * 1000); // 2 hours
    }
    
    return false;
  }

  private estimateInformationLoss(
    sourceBranch: ConversationBranch,
    targetBranch: ConversationBranch,
    strategy: string
  ): number {
    // Simple estimation based on strategy
    switch (strategy) {
      case 'full_merge': return 0.1;
      case 'selective_merge': return 0.3;
      case 'summary_merge': return 0.6;
      default: return 0.5;
    }
  }

  private async performFullMerge(source: BranchTreeNode, target: BranchTreeNode): Promise<void> {
    // Add all source messages to target
    target.branch.contextWindow.messages.push(...source.branch.contextWindow.messages);
    target.branch.contextWindow.tokenCount += source.branch.contextWindow.tokenCount;
    target.metadata.messageCount += source.metadata.messageCount;
  }

  private async performSelectiveMerge(source: BranchTreeNode, target: BranchTreeNode): Promise<void> {
    // Add only important messages from source
    const importantMessages = source.branch.contextWindow.messages.filter(
      msg => msg.importance > this.config.importanceThreshold
    );
    
    target.branch.contextWindow.messages.push(...importantMessages);
    target.branch.contextWindow.tokenCount += importantMessages.reduce(
      (sum, msg) => sum + msg.tokenCount, 0
    );
    target.metadata.messageCount += importantMessages.length;
  }

  private async performSummaryMerge(source: BranchTreeNode, target: BranchTreeNode): Promise<void> {
    // Create summary of source branch and add as single message
    const sourceSummary = `Branch Summary (${source.branch.topic}): ${source.metadata.messageCount} messages discussed topics including ${source.branch.contextWindow.messages.flatMap(m => m.topics).slice(0, 3).join(', ')}.`;
    
    const summaryMessage: EnhancedMessage = {
      id: `merge_summary_${Date.now()}`,
      role: 'system',
      content: sourceSummary,
      timestamp: new Date(),
      tokenCount: Math.ceil(sourceSummary.length / 4),
      importance: 0.7,
      messageType: 'system',
      topics: Array.from(new Set(source.branch.contextWindow.messages.flatMap(m => m.topics))),
      entities: [],
      contextRelevance: 0.8,
      createdAt: new Date(),
      metadata: { userIntent: 'branch_merge_summary' }
    };

    target.branch.contextWindow.messages.push(summaryMessage);
    target.branch.contextWindow.tokenCount += summaryMessage.tokenCount;
    target.metadata.messageCount += 1;
  }

  private getPathToRoot(node: BranchTreeNode): BranchTreeNode[] {
    const path: BranchTreeNode[] = [];
    let current: BranchTreeNode | undefined = node;
    
    while (current) {
      path.unshift(current);
      current = current.parent;
    }
    
    return path;
  }

  private suggestNextBranch(): string | undefined {
    if (!this.config.enableBranchSuggestions || this.branchTree.size < 2) {
      return undefined;
    }

    // Find most relevant inactive branch
    const inactiveBranches = Array.from(this.branchTree.values())
      .filter(node => !node.isActive);
    
    if (inactiveBranches.length === 0) return undefined;

    // Score branches by relevance and recent activity
    const scoredBranches = inactiveBranches.map(node => ({
      node,
      score: node.metadata.topicSimilarity * 0.5 + 
             node.metadata.userEngagement * 0.3 +
             (1 - (Date.now() - node.metadata.lastActivity.getTime()) / (24 * 60 * 60 * 1000)) * 0.2
    }));

    scoredBranches.sort((a, b) => b.score - a.score);
    return scoredBranches[0]?.node.id;
  }

  // =====================================================
  // PUBLIC API METHODS
  // =====================================================

  /**
   * Get all active branches
   */
  getActiveBranches(): ConversationBranch[] {
    return Array.from(this.branchTree.values())
      .filter(node => node.isActive)
      .map(node => node.branch);
  }

  /**
   * Get branch tree visualization data
   */
  getBranchTreeData(): any {
    const buildTree = (node: BranchTreeNode): any => ({
      id: node.id,
      topic: node.branch.topic,
      isActive: node.isActive,
      depth: node.depth,
      messageCount: node.metadata.messageCount,
      lastActivity: node.metadata.lastActivity,
      children: node.children.map(buildTree)
    });

    return this.rootBranch ? buildTree(this.rootBranch) : null;
  }

  /**
   * Get branch statistics
   */
  getBranchStats(): {
    totalBranches: number;
    activeBranches: number;
    maxDepth: number;
    averageMessages: number;
    oldestBranch: Date | null;
  } {
    const branches = Array.from(this.branchTree.values());
    
    return {
      totalBranches: branches.length,
      activeBranches: branches.filter(b => b.isActive).length,
      maxDepth: Math.max(...branches.map(b => b.depth), 0),
      averageMessages: branches.length > 0 
        ? branches.reduce((sum, b) => sum + b.metadata.messageCount, 0) / branches.length 
        : 0,
      oldestBranch: branches.length > 0 
        ? new Date(Math.min(...branches.map(b => b.branch.createdAt.getTime())))
        : null
    };
  }

  /**
   * Update branch manager configuration
   */
  updateConfig(newConfig: Partial<BranchingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.debug('🔧 Branch manager config updated', newConfig);
  }

  /**
   * Cleanup inactive branches
   */
  async cleanupInactiveBranches(): Promise<{ archived: number; merged: number }> {
    const cutoffTime = new Date(Date.now() - (this.config.mergeInactiveAfter * 60 * 60 * 1000));
    
    let archivedCount = 0;
    let mergedCount = 0;

    // Find merge candidates first
    const mergeCandidates = await this.findMergeCandidates();
    
    // Execute merges
    for (const candidate of mergeCandidates) {
      if (candidate.sourceBranch.contextWindow.lastUpdated < cutoffTime) {
        await this.mergeBranches(candidate);
        mergedCount++;
      }
    }

    // Archive remaining inactive branches
    const inactiveBranches = Array.from(this.branchTree.values())
      .filter(node => 
        !node.isActive && 
        node.metadata.lastActivity < cutoffTime &&
        node.metadata.importance < 0.5
      );

    for (const branch of inactiveBranches) {
      await this.archiveBranch(branch.id);
      archivedCount++;
    }

    logger.info('🧹 Cleanup complete', { archivedCount, mergedCount });
    
    return { archived: archivedCount, merged: mergedCount };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.branchTree.clear();
    this.rootBranch = null;
    this.activeBranch = null;
  }
}

export default ConversationBranchManager;