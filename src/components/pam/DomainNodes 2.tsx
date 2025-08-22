/**
 * PAM Domain Nodes - Specialized AI Capabilities
 * Connects to Wheels, Wins, Shop, and Social nodes
 * Simple, elegant interface following Apple design principles
 */

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Brain, 
  Sparkles,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePamAssistant, usePamDomainAssistant } from '@/hooks/pam/usePamAssistant';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DomainNode {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  capabilities: string[];
  domain: 'travel' | 'financial' | 'shopping' | 'social';
}

const domainNodes: DomainNode[] = [
  {
    id: 'wheels',
    name: 'Wheels Node',
    icon: <MapPin size={20} />,
    color: 'from-blue-500 to-cyan-500',
    description: 'Your intelligent travel planning companion',
    capabilities: [
      'Route optimization and planning',
      'Real-time weather and traffic updates', 
      'RV park recommendations',
      'Fuel cost calculations',
      'Vehicle maintenance reminders'
    ],
    domain: 'travel'
  },
  {
    id: 'wins',
    name: 'Wins Node', 
    icon: <DollarSign size={20} />,
    color: 'from-green-500 to-emerald-500',
    description: 'Smart financial management for travelers',
    capabilities: [
      'Expense tracking and categorization',
      'Budget optimization suggestions',
      'Cost-saving recommendations',
      'Travel rewards maximization',
      'Financial goal tracking'
    ],
    domain: 'financial'
  },
  {
    id: 'shop',
    name: 'Shop Node',
    icon: <ShoppingBag size={20} />,
    color: 'from-purple-500 to-pink-500',
    description: 'Personalized shopping and gear recommendations',
    capabilities: [
      'Gear recommendations for trips',
      'Price comparison across retailers',
      'Seasonal equipment suggestions',
      'Quality vs budget analysis',
      'Affiliate deal discovery'
    ],
    domain: 'shopping'
  },
  {
    id: 'social',
    name: 'Social Node',
    icon: <Users size={20} />,
    color: 'from-orange-500 to-red-500', 
    description: 'Connect with fellow travelers and communities',
    capabilities: [
      'Traveler community matching',
      'Event and meetup discovery',
      'Experience sharing facilitation',
      'Safety network connections',
      'Local insider recommendations'
    ],
    domain: 'social'
  }
];

interface DomainNodeCardProps {
  node: DomainNode;
  isActive: boolean;
  onClick: () => void;
}

const DomainNodeCard: React.FC<DomainNodeCardProps> = ({ node, isActive, onClick }) => {
  const domainAssistant = usePamDomainAssistant(node.domain);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);

  // Load recommendations when node becomes active
  useEffect(() => {
    if (isActive && domainAssistant.isAvailable) {
      loadRecommendations();
    }
  }, [isActive, domainAssistant.isAvailable]);

  const loadRecommendations = async () => {
    try {
      setIsLoadingRecs(true);
      const recs = await domainAssistant.getRecommendations();
      setRecommendations(recs.slice(0, 3)); // Limit to 3 recommendations
    } catch (error) {
      console.warn(`Failed to load ${node.domain} recommendations:`, error);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-200 cursor-pointer hover:shadow-md",
      isActive && "ring-2 ring-blue-500 shadow-lg"
    )}>
      <Collapsible open={isActive} onOpenChange={() => onClick()}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r text-white",
                  node.color
                )}>
                  {node.icon}
                </div>
                <div>
                  <CardTitle className="text-lg">{node.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {node.description}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {domainAssistant.isAvailable && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
                <ChevronRight 
                  size={16} 
                  className={cn(
                    "text-gray-400 transition-transform",
                    isActive && "rotate-90"
                  )} 
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Capabilities */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Capabilities
              </h4>
              <div className="space-y-1">
                {node.capabilities.slice(0, 3).map((capability, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Sparkles size={12} className="text-blue-500" />
                    <span>{capability}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Recommendations */}
            {domainAssistant.isAvailable && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Smart Recommendations
                </h4>
                {isLoadingRecs ? (
                  <div className="flex items-center space-x-2 py-3">
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                    <span className="text-sm text-gray-500">Loading recommendations...</span>
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="space-y-2">
                    {recommendations.map((rec, index) => (
                      <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {rec.title}
                        </p>
                        {rec.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {rec.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No recommendations available right now.
                  </p>
                )}
              </div>
            )}

            {/* Quick Action */}
            <button
              onClick={() => domainAssistant.ask(`What can you help me with regarding ${node.domain}?`)}
              disabled={!domainAssistant.isAvailable}
              className={cn(
                "w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                "bg-gradient-to-r text-white shadow-sm hover:shadow-md",
                node.color,
                !domainAssistant.isAvailable && "opacity-50 cursor-not-allowed"
              )}
            >
              Ask {node.name}
            </button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export const DomainNodes: React.FC<{
  className?: string;
  compact?: boolean;
}> = ({ className, compact = false }) => {
  const { capabilities, isReady } = usePamAssistant();
  const [activeNode, setActiveNode] = useState<string | null>(null);

  if (!isReady) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain size={20} className="text-gray-400" />
            <span>PAM Domain Nodes</span>
          </CardTitle>
          <CardDescription>
            Specialized AI capabilities are initializing...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 py-4">
            <Loader2 size={16} className="animate-spin text-blue-500" />
            <span className="text-sm text-gray-500">Connecting to AI nodes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn("grid grid-cols-2 gap-3", className)}>
        {domainNodes.map((node) => (
          <div
            key={node.id}
            className="flex items-center space-x-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r text-white",
              node.color
            )}>
              {React.cloneElement(node.icon as React.ReactElement, { size: 16 })}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {node.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {node.capabilities.length} capabilities
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          PAM Domain Specialists
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Specialized AI nodes with deep expertise in travel, finance, shopping, and social connections.
        </p>
      </div>

      {domainNodes.map((node) => (
        <DomainNodeCard
          key={node.id}
          node={node}
          isActive={activeNode === node.id}
          onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
        />
      ))}

      {/* System Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">System Status</span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-600 dark:text-green-400">All nodes operational</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};