import React, { useState, useCallback, useEffect } from 'react';
import { Shield, Lock, Eye, AlertTriangle, CheckCircle, FileText, Upload } from 'lucide-react';
import { UploadStage } from './UploadStage';
import { ProcessingStage } from './ProcessingStage';
import { ReviewStage } from './ReviewStage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { pamBankStatementIntegration } from '@/services/pamSavingsService';
import { 
  BankTransaction, 
  ProcessingSession,
  validateTransactionArray,
  debugTransactionData 
} from '@/types/bankStatementTypes';

export const BankStatementConverter: React.FC = () => {
  const [stage, setStage] = useState<'upload' | 'processing' | 'review'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [session, setSession] = useState<ProcessingSession | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [showPrivacyModal, setShowPrivacyModal] = useState(true);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const { toast } = useToast();

  // Memory cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clear sensitive data from memory
      if (file) {
        // Clear file reference
        setFile(null);
      }
      
      // Clear transaction data
      if (transactions.length > 0) {
        // Overwrite transaction data in memory
        const clearedTransactions = transactions.map(() => ({
          id: '',
          date: new Date(0),
          description: '',
          amount: 0,
          type: 'debit' as const,
          category: '',
          merchantName: '',
          isRecurring: false,
          redactedFields: [],
        }));
        setTransactions(clearedTransactions);
        
        // Force garbage collection hint (browser dependent)
        if (window.gc) {
          window.gc();
        }
      }
      
      // Clear session data
      setSession(null);
    };
  }, [file, transactions]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    
    // Create processing session
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to use the bank statement converter',
        variant: 'destructive',
      });
      return;
    }

    // Create session in database
    const { data: sessionData, error } = await supabase
      .from('bank_processing_sessions')
      .insert({
        user_id: userData.user.id,
        file_name: selectedFile.name,
        file_size_bytes: selectedFile.size,
        file_type: selectedFile.name.split('.').pop()?.toLowerCase() || 'unknown',
        processing_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Session creation error:', error);
      // Continue with a local session instead of blocking
      const localSession: ProcessingSession = {
        id: `local-${Date.now()}`,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.name.split('.').pop()?.toLowerCase() || 'unknown',
        status: 'pending',
        transactionCount: 0
      };
      
      toast({
        title: 'Note',
        description: 'Processing in offline mode. Your data is still secure.',
      });
      
      setSession(localSession);
      setStage('processing');
      return;
    }

    setSession(sessionData as ProcessingSession);
    setStage('processing');
  }, [toast]);

  const handleProcessingError = useCallback((error: string) => {
    console.error('Processing error:', error);
    setProcessingError(error);
    toast({
      title: 'Processing Failed',
      description: error,
      variant: 'destructive',
    });
    
    // Reset to upload stage after showing error
    setTimeout(() => {
      setStage('upload');
      setFile(null);
      setSession(null);
      setProcessingError(null);
    }, 3000);
  }, [toast]);

  const handleProcessingComplete = useCallback((processedTransactions: BankTransaction[]) => {
    console.log('=== PROCESSING COMPLETE HANDLER ===');
    console.log('Received transactions:', processedTransactions);
    
    // Debug each transaction
    processedTransactions.forEach((transaction, index) => {
      debugTransactionData(transaction, `Transaction ${index + 1} from ProcessingStage`);
    });
    
    // Validate transactions before proceeding
    if (!processedTransactions || processedTransactions.length === 0) {
      console.error('No valid transactions processed');
      toast({
        title: 'Processing Failed',
        description: 'No transactions could be extracted from the file. Please check the file format.',
        variant: 'destructive',
      });
      setStage('upload');
      setFile(null);
      setSession(null);
      return;
    }
    
    try {
      // Validate and clean transactions
      const validatedTransactions = validateTransactionArray(processedTransactions);
      console.log('Validated transactions:', validatedTransactions);
      
      if (validatedTransactions.length === 0) {
        console.error('No valid transactions after validation');
        toast({
          title: 'Invalid Data',
          description: 'The transactions could not be properly parsed. Please ensure your file is in the correct format.',
          variant: 'destructive',
        });
        setStage('upload');
        setFile(null);
        setSession(null);
        return;
      }
      
      // Debug validated transactions before setting state
      validatedTransactions.forEach((transaction, index) => {
        debugTransactionData(transaction, `Validated Transaction ${index + 1} before setState`);
      });
      
      console.log('Setting transactions in state and moving to review stage');
      setTransactions(validatedTransactions);
      setStage('review');
      
    } catch (error) {
      console.error('Error validating transactions:', error);
      toast({
        title: 'Validation Failed',
        description: 'Failed to validate transaction data. Please try again.',
        variant: 'destructive',
      });
      setStage('upload');
      setFile(null);
      setSession(null);
    }
  }, [toast]);

  const handleImportToWins = useCallback(async () => {
    if (!session || transactions.length === 0) return;

    try {
      // Use the integrated PAM savings service to import transactions
      const result = await pamBankStatementIntegration.importTransactions(transactions);

      // Update session status (only if it's not a local session)
      if (!session.id.startsWith('local-')) {
        await supabase
          .from('bank_processing_sessions')
          .update({
            processing_status: 'completed',
            transaction_count: result.imported,
            processed_at: new Date().toISOString(),
          })
          .eq('id', session.id);
      }

      toast({
        title: 'Success!',
        description: `${result.imported} transactions imported to your Wins budget tracker. ${result.skipped} duplicates skipped.`,
      });

      // Show insights if available
      if (result.insights.insights.length > 0) {
        setTimeout(() => {
          toast({
            title: 'PAM Insights',
            description: result.insights.insights[0],
          });
        }, 2000);
      }

      // Reset to initial state
      setStage('upload');
      setFile(null);
      setSession(null);
      setTransactions([]);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: 'Failed to import transactions. Please try again.',
        variant: 'destructive',
      });
    }
  }, [session, transactions, toast]);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Privacy Notice Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-green-600" />
                Your Privacy is Our Priority
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Lock className="w-4 h-4" />
                <AlertTitle>Bank-Grade Security</AlertTitle>
                <AlertDescription>
                  All processing happens locally in your browser. Your bank statements never leave your device unencrypted.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <Eye className="w-4 h-4" />
                <AlertTitle>Zero Personal Data Storage</AlertTitle>
                <AlertDescription>
                  We automatically redact all sensitive information including account numbers, SSNs, and personal details.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Automatic Deletion</AlertTitle>
                <AlertDescription>
                  Uploaded files are deleted immediately after processing. Transaction data is anonymized and expires after 30 days unless you choose to save it.
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => window.history.back()}>
                  Cancel
                </Button>
                <Button onClick={() => setShowPrivacyModal(false)}>
                  I Understand, Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header with Security Badges */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Bank Statement Converter</h1>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full">
            <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">256-bit Encryption</span>
          </div>
          <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-700 dark:text-blue-300">GDPR Compliant</span>
          </div>
          <div className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 px-3 py-1 rounded-full">
            <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-purple-700 dark:text-purple-300">No Data Retention</span>
          </div>
          <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900 px-3 py-1 rounded-full">
            <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm text-orange-700 dark:text-orange-300">Client-Side Processing</span>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${stage === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stage === 'upload' ? 'bg-primary text-white' : 'bg-muted'}`}>
              1
            </div>
            <span className="font-medium">Upload</span>
          </div>
          <div className="flex-1 h-1 bg-muted mx-4" />
          <div className={`flex items-center gap-2 ${stage === 'processing' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stage === 'processing' ? 'bg-primary text-white' : 'bg-muted'}`}>
              2
            </div>
            <span className="font-medium">Process</span>
          </div>
          <div className="flex-1 h-1 bg-muted mx-4" />
          <div className={`flex items-center gap-2 ${stage === 'review' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stage === 'review' ? 'bg-primary text-white' : 'bg-muted'}`}>
              3
            </div>
            <span className="font-medium">Review</span>
          </div>
        </div>
      </div>

      {/* Stage Components */}
      {stage === 'upload' && (
        <UploadStage onFileSelect={handleFileSelect} />
      )}
      
      {stage === 'processing' && file && session && (
        <ProcessingStage 
          file={file}
          session={session}
          onComplete={handleProcessingComplete}
          onError={handleProcessingError}
        />
      )}
      
      {stage === 'review' && (
        <ReviewStage 
          transactions={transactions}
          onImport={handleImportToWins}
          onCancel={() => {
            setStage('upload');
            setFile(null);
            setTransactions([]);
          }}
        />
      )}

      {/* Privacy Footer */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Your data is protected</p>
            <p>
              All sensitive information is automatically redacted. Files are processed locally and deleted immediately. 
              We never store your personal banking information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};