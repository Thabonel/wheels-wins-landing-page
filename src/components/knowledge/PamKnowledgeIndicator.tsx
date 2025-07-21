
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/AnimatedDialog";
import { BookOpen, ExternalLink, FileText } from 'lucide-react';
import type { KnowledgeSearchResult } from '@/types/knowledgeTypes';

interface PamKnowledgeIndicatorProps {
  knowledgeUsed: KnowledgeSearchResult[];
  className?: string;
}

export const PamKnowledgeIndicator = ({ knowledgeUsed, className = '' }: PamKnowledgeIndicatorProps) => {
  if (knowledgeUsed.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            Used {knowledgeUsed.length} source{knowledgeUsed.length !== 1 ? 's' : ''}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Knowledge Sources Used
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {knowledgeUsed.map((source, index) => (
              <div key={source.chunk_id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">{source.document_name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(source.relevance_score * 100)}% match
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border-l-4 border-blue-200">
                  "{source.content.substring(0, 200)}{source.content.length > 200 ? '...' : ''}"
                </div>
                {source.chunk_metadata.page && (
                  <p className="text-xs text-gray-500 mt-2">
                    Page {source.chunk_metadata.page}
                  </p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
