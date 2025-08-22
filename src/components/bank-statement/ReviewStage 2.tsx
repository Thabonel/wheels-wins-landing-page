import React, { useState, useMemo, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle, TrendingUp, TrendingDown, DollarSign, Calendar, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency, formatDate } from '@/utils/format';
import { ReviewStageProps, debugTransactionData } from '@/types/bankStatementTypes';

// XSS protection utility
const sanitizeText = (text: string | undefined): string => {
  if (!text) return '';
  
  // Remove HTML tags and script content
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/&lt;script/gi, '')
    .replace(/&lt;\/script&gt;/gi, '')
    .trim();
};

export const ReviewStage: React.FC<ReviewStageProps> = ({ transactions, onImport, onCancel }) => {
  // Debug received transactions
  console.log('=== REVIEW STAGE RECEIVED DATA ===');
  console.log('Total transactions received:', transactions.length);
  
  transactions.forEach((transaction, index) => {
    debugTransactionData(transaction, `ReviewStage received transaction ${index + 1}`);
  });
  
  useEffect(() => {
    console.log('ReviewStage mounted/updated with transactions:', transactions.length);
  }, [transactions]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set(transactions.map(t => t.id))
  );
  const [showRedacted, setShowRedacted] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);

  const stats = useMemo(() => {
    const selected = transactions.filter(t => selectedTransactions.has(t.id));
    const totalDebits = selected
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCredits = selected
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    const categories = new Set(selected.map(t => t.category).filter(Boolean));
    
    return {
      total: selected.length,
      debits: totalDebits,
      credits: totalCredits,
      net: totalCredits - totalDebits,
      categories: categories.size,
      recurring: selected.filter(t => t.isRecurring).length,
    };
  }, [transactions, selectedTransactions]);

  const toggleTransaction = (id: string) => {
    setSelectedTransactions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t.id)));
    }
  };

  const categoryColors: Record<string, string> = {
    'Food & Dining': 'bg-orange-100 text-orange-800',
    'Transportation': 'bg-blue-100 text-blue-800',
    'Shopping': 'bg-purple-100 text-purple-800',
    'Entertainment': 'bg-pink-100 text-pink-800',
    'Bills & Utilities': 'bg-yellow-100 text-yellow-800',
    'RV & Camping': 'bg-green-100 text-green-800',
    'Other': 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.debits)}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.credits)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{stats.categories}</p>
              </div>
              <Tag className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Privacy Notice */}
      <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <Eye className="w-4 h-4 text-green-600" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong className="text-green-800 dark:text-green-200">What Was Redacted:</strong>
              <p className="text-sm mt-1">
                Account numbers (showing last 4 digits only), personal names, addresses, 
                and any SSN/tax ID numbers have been automatically removed.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRedacted(!showRedacted)}
              className="ml-4"
            >
              {showRedacted ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showRedacted ? 'Hide' : 'Show'} Redacted
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Review Transactions</CardTitle>
              <CardDescription>
                Select which transactions to import to your budget tracker
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selectedTransactions.size === transactions.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <Checkbox
                    checked={selectedTransactions.has(transaction.id)}
                    onCheckedChange={() => toggleTransaction(transaction.id)}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {sanitizeText(transaction.merchantName || transaction.description)}
                        </span>
                        {transaction.isRecurring && (
                          <Badge variant="secondary" className="text-xs">
                            Recurring
                          </Badge>
                        )}
                        {transaction.category && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${categoryColors[transaction.category] || categoryColors.Other}`}
                          >
                            {transaction.category}
                          </Badge>
                        )}
                      </div>
                      <span className={`font-bold ${
                        transaction.type === 'debit' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {transaction.type === 'debit' ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {transaction.date instanceof Date && !isNaN(transaction.date.getTime()) 
                          ? formatDate(transaction.date)
                          : 'Invalid date'}
                      </span>
                      {showRedacted && transaction.redactedFields.length > 0 && (
                        <span className="flex items-center gap-1">
                          <EyeOff className="w-3 h-3" />
                          Redacted: {transaction.redactedFields.map(field => sanitizeText(field)).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Import Confirmation */}
      {!confirmImport ? (
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={() => setConfirmImport(true)}
            disabled={selectedTransactions.size === 0}
            size="lg"
          >
            Review & Import {stats.total} Transactions
          </Button>
        </div>
      ) : (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Confirm Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                You're about to import {stats.total} transactions to your Wins budget tracker. 
                This will help you track expenses and manage your budget more accurately.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>All personal information has been removed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Original file will be deleted immediately</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Transaction data expires in 30 days unless saved</span>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setConfirmImport(false)}>
                Back
              </Button>
              <Button onClick={onImport} className="bg-green-600 hover:bg-green-700">
                Confirm Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};