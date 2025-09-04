/**
 * Consultation History Component
 * Shows past health consultations with search and filter capabilities
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Search,
  Calendar,
  AlertTriangle,
  Info,
  Trash2,
  FileText,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { 
  getConsultationHistory, 
  clearConsultationHistory 
} from '@/services/health-ai/healthConsultationClient';
import { toast } from 'sonner';

interface ConsultationRecord {
  question: string;
  response: string;
  hasEmergency: boolean;
  timestamp: string;
}

export default function ConsultationHistory() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [filteredConsultations, setFilteredConsultations] = useState<ConsultationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationRecord | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Load consultation history
  useEffect(() => {
    if (user?.id) {
      const history = getConsultationHistory(user.id);
      setConsultations(history);
      setFilteredConsultations(history);
    }
  }, [user?.id]);

  // Filter consultations based on search
  useEffect(() => {
    if (searchTerm) {
      const filtered = consultations.filter(
        c => 
          c.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.response.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConsultations(filtered);
    } else {
      setFilteredConsultations(consultations);
    }
  }, [searchTerm, consultations]);

  // Handle clear history
  const handleClearHistory = () => {
    if (user?.id) {
      clearConsultationHistory(user.id);
      setConsultations([]);
      setFilteredConsultations([]);
      setShowClearDialog(false);
      toast.success('Consultation history cleared');
    }
  };

  // Show consultation detail
  const showDetail = (consultation: ConsultationRecord) => {
    setSelectedConsultation(consultation);
    setShowDetailDialog(true);
  };

  // Get time ago text
  const getTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Consultation History
              </CardTitle>
              <CardDescription>
                Review your past health information queries
              </CardDescription>
            </div>
            {consultations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Search bar */}
      {consultations.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search consultations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Consultation list */}
      {filteredConsultations.length > 0 ? (
        <ScrollArea className="h-[500px]">
          <div className="space-y-3 pr-4">
            {filteredConsultations.map((consultation, index) => (
              <Card
                key={`${consultation.timestamp}-${index}`}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => showDetail(consultation)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {getTimeAgo(consultation.timestamp)}
                      </span>
                    </div>
                    {consultation.hasEmergency && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Emergency
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium text-sm">Your Question:</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {consultation.question}
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-medium text-sm">Response:</p>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {consultation.response}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-3">
                    <Button variant="ghost" size="sm">
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Consultations Yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Your health consultation history will appear here. Start by asking a health question in the consultation tab.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detail dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consultation Detail</DialogTitle>
            <DialogDescription>
              {selectedConsultation && format(new Date(selectedConsultation.timestamp), 'MMMM d, yyyy \'at\' h:mm a')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedConsultation && (
            <div className="space-y-4">
              {selectedConsultation.hasEmergency && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This consultation contained emergency keywords. If you're still experiencing these symptoms, seek immediate medical attention.
                  </AlertDescription>
                </Alert>
              )}
              
              <div>
                <h4 className="font-semibold mb-2">Your Question:</h4>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                  {selectedConsultation.question}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Response:</h4>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                  {selectedConsultation.response}
                </p>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This information is for reference only. Always consult healthcare professionals for medical advice.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear history confirmation dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Consultation History?</DialogTitle>
            <DialogDescription>
              This will permanently delete all your saved consultations. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearHistory}>
              Clear History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}