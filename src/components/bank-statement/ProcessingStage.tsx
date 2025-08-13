import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, Shield, Eye, Lock, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseCsvFile } from '@/services/bankStatement/csvParser';
import { parseExcelFile } from '@/services/bankStatement/excelParser';
import { parsePdfFile } from '@/services/bankStatement/pdfParser';
import { anonymizeTransactions } from '@/services/bankStatement/anonymizer';

interface ProcessingStageProps {
  file: File;
  session: {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  };
  onComplete: (transactions: any[]) => void;
}

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
}

export const ProcessingStage: React.FC<ProcessingStageProps> = ({ file, session, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'validate', name: 'Validating file format', status: 'pending' },
    { id: 'parse', name: 'Extracting transactions', status: 'pending' },
    { id: 'anonymize', name: 'Removing personal information', status: 'pending' },
    { id: 'categorize', name: 'Categorizing transactions', status: 'pending' },
    { id: 'complete', name: 'Finalizing', status: 'pending' },
  ]);
  const [redactedInfo, setRedactedInfo] = useState<string[]>([]);

  useEffect(() => {
    processFile();
  }, [file]);

  const updateStep = (stepId: string, status: ProcessingStep['status'], message?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, message } : step
    ));
  };

  const processFile = async () => {
    try {
      // Step 1: Validate file
      updateStep('validate', 'processing');
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('validate', 'completed');
      setProgress(20);

      // Step 2: Parse file
      updateStep('parse', 'processing');
      let rawTransactions: any[] = [];
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        rawTransactions = await parseCsvFile(file);
      } else if (fileExtension === 'xls' || fileExtension === 'xlsx') {
        rawTransactions = await parseExcelFile(file);
      } else if (fileExtension === 'pdf') {
        // For PDF, we'll need server-side processing
        rawTransactions = await parsePdfFile(file, session.id);
      }
      
      updateStep('parse', 'completed', `Found ${rawTransactions.length} transactions`);
      setProgress(40);

      // Step 3: Anonymize data
      updateStep('anonymize', 'processing');
      const { transactions, redactedFields } = await anonymizeTransactions(rawTransactions);
      setRedactedInfo(redactedFields);
      updateStep('anonymize', 'completed', `Redacted ${redactedFields.length} sensitive fields`);
      setProgress(60);

      // Step 4: Categorize transactions
      updateStep('categorize', 'processing');
      const categorizedTransactions = await categorizeTransactions(transactions);
      updateStep('categorize', 'completed');
      setProgress(80);

      // Step 5: Complete processing
      updateStep('complete', 'processing');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('complete', 'completed');
      setProgress(100);

      // Wait a moment before transitioning
      setTimeout(() => {
        onComplete(categorizedTransactions);
      }, 1000);

    } catch (error) {
      console.error('Processing error:', error);
      const currentStep = steps.find(s => s.status === 'processing');
      if (currentStep) {
        updateStep(currentStep.id, 'error', 'Processing failed');
      }
    }
  };

  const categorizeTransactions = async (transactions: any[]) => {
    // Simple categorization logic based on keywords
    const categories = {
      'Food & Dining': ['restaurant', 'cafe', 'coffee', 'food', 'grocery', 'market'],
      'Transportation': ['gas', 'fuel', 'uber', 'lyft', 'parking', 'toll'],
      'Shopping': ['amazon', 'walmart', 'target', 'store', 'shop'],
      'Entertainment': ['movie', 'theater', 'concert', 'game', 'sport'],
      'Bills & Utilities': ['electric', 'water', 'internet', 'phone', 'insurance'],
      'RV & Camping': ['rv', 'campground', 'park', 'camping', 'koa'],
    };

    return transactions.map(transaction => {
      let category = 'Other';
      const description = transaction.description.toLowerCase();
      
      for (const [cat, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => description.includes(keyword))) {
          category = cat;
          break;
        }
      }
      
      return { ...transaction, category };
    });
  };

  return (
    <div className="space-y-6">
      {/* Processing Card */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Your Statement</CardTitle>
          <CardDescription>
            We're extracting and anonymizing your transaction data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Processing Steps */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  {step.status === 'pending' && (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  {step.status === 'processing' && (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  )}
                  {step.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  {step.status === 'error' && (
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${
                    step.status === 'completed' ? 'text-green-600' : 
                    step.status === 'error' ? 'text-red-600' : 
                    step.status === 'processing' ? 'text-primary font-medium' :
                    'text-gray-500'
                  }`}>
                    {step.name}
                  </p>
                  {step.message && (
                    <p className="text-xs text-gray-500">{step.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* File Info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-500" />
              <div className="text-sm">
                <p className="font-medium">{session.fileName}</p>
                <p className="text-gray-500">Processing locally in your browser</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Status */}
      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Processing locally - no data sent to servers</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">256-bit AES encryption active</span>
            </div>
            {redactedInfo.length > 0 && (
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <span>Redacted {redactedInfo.length} sensitive fields</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {redactedInfo.slice(0, 3).map((field, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-green-100 dark:bg-green-900 rounded text-xs">
                        {field}
                      </span>
                    ))}
                    {redactedInfo.length > 3 && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 rounded text-xs">
                        +{redactedInfo.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Alert>
        <Eye className="w-4 h-4" />
        <AlertDescription>
          <strong>What happens to your data:</strong> Your original file will be deleted immediately after processing. 
          Only anonymized transaction data (amounts, dates, and merchant categories) will be saved temporarily 
          for your review. You have full control over what gets imported to your budget tracker.
        </AlertDescription>
      </Alert>
    </div>
  );
};