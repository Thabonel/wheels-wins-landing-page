import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Fuel, 
  Car, 
  Receipt, 
  ShoppingCart,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickActionType } from './QuickActionsHub';

interface QuickActionFormProps {
  actionType: QuickActionType;
  onComplete: () => void;
  onCancel: () => void;
}

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'file' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  prefix?: string;
  suffix?: string;
  icon?: React.ComponentType<any>;
}

const formConfigs: Record<QuickActionType, FormField[]> = {
  expense: [
    { id: 'amount', label: 'Amount', type: 'number', required: true, prefix: '$', icon: DollarSign },
    { id: 'category', label: 'Category', type: 'select', required: true, options: ['Food & Dining', 'Gas & Fuel', 'Accommodation', 'Entertainment', 'Supplies', 'Other'] },
    { id: 'description', label: 'Description', type: 'textarea', placeholder: 'What was this expense for?' },
    { id: 'location', label: 'Location', type: 'text', placeholder: 'Where did you spend this?', icon: MapPin },
    { id: 'receipt', label: 'Receipt Photo', type: 'file' }
  ],
  fuel: [
    { id: 'amount', label: 'Total Cost', type: 'number', required: true, prefix: '$', icon: DollarSign },
    { id: 'gallons', label: 'Gallons', type: 'number', required: true, suffix: 'gal' },
    { id: 'pricePerGallon', label: 'Price per Gallon', type: 'number', prefix: '$' },
    { id: 'station', label: 'Gas Station', type: 'text', placeholder: 'Shell, Exxon, etc.' },
    { id: 'location', label: 'Location', type: 'text', placeholder: 'City, State', icon: MapPin },
    { id: 'odometer', label: 'Odometer Reading', type: 'number', suffix: 'miles' }
  ],
  receipt: [
    { id: 'photo', label: 'Receipt Photo', type: 'file', required: true },
    { id: 'amount', label: 'Amount', type: 'number', prefix: '$' },
    { id: 'merchant', label: 'Merchant', type: 'text', placeholder: 'Store or business name' },
    { id: 'category', label: 'Category', type: 'select', options: ['Food & Dining', 'Gas & Fuel', 'Accommodation', 'Entertainment', 'Supplies', 'Other'] },
    { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional details...' }
  ],
  mileage: [
    { id: 'startLocation', label: 'From', type: 'text', required: true, placeholder: 'Starting location', icon: MapPin },
    { id: 'endLocation', label: 'To', type: 'text', required: true, placeholder: 'Destination', icon: MapPin },
    { id: 'miles', label: 'Miles Driven', type: 'number', required: true, suffix: 'miles' },
    { id: 'purpose', label: 'Purpose', type: 'select', required: true, options: ['Business', 'Personal', 'Medical', 'Charitable'] },
    { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Trip details...' }
  ],
  maintenance: [
    { id: 'type', label: 'Service Type', type: 'select', required: true, options: ['Oil Change', 'Tire Service', 'Brake Service', 'Engine Work', 'Electrical', 'Plumbing', 'Other'] },
    { id: 'amount', label: 'Cost', type: 'number', prefix: '$', icon: DollarSign },
    { id: 'provider', label: 'Service Provider', type: 'text', placeholder: 'Shop or technician name' },
    { id: 'odometer', label: 'Odometer Reading', type: 'number', suffix: 'miles' },
    { id: 'description', label: 'Work Performed', type: 'textarea', required: true, placeholder: 'Describe the maintenance work...' },
    { id: 'nextService', label: 'Next Service Due', type: 'date' }
  ],
  shopping: [
    { id: 'amount', label: 'Total Cost', type: 'number', required: true, prefix: '$', icon: DollarSign },
    { id: 'store', label: 'Store', type: 'text', placeholder: 'Walmart, Target, etc.' },
    { id: 'category', label: 'Category', type: 'select', required: true, options: ['Groceries', 'RV Supplies', 'Clothing', 'Electronics', 'Home & Garden', 'Other'] },
    { id: 'items', label: 'Items Purchased', type: 'textarea', placeholder: 'List of items (optional)' },
    { id: 'location', label: 'Location', type: 'text', placeholder: 'City, State', icon: MapPin }
  ]
};

export const QuickActionForm: React.FC<QuickActionFormProps> = ({
  actionType,
  onComplete,
  onCancel
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const fields = formConfigs[actionType];

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }

    // Auto-calculate price per gallon for fuel
    if (actionType === 'fuel') {
      if (fieldId === 'amount' || fieldId === 'gallons') {
        const amount = fieldId === 'amount' ? parseFloat(value) : parseFloat(formData.amount || '0');
        const gallons = fieldId === 'gallons' ? parseFloat(value) : parseFloat(formData.gallons || '0');
        
        if (amount > 0 && gallons > 0) {
          setFormData(prev => ({
            ...prev,
            [fieldId]: value,
            pricePerGallon: (amount / gallons).toFixed(3)
          }));
        }
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      if (field.required && (!formData[field.id] || formData[field.id] === '')) {
        newErrors[field.id] = `${field.label} is required`;
      }

      // Additional validation rules
      if (field.type === 'number' && formData[field.id] && parseFloat(formData[field.id]) <= 0) {
        newErrors[field.id] = `${field.label} must be greater than 0`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Integrate with actual API
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      setIsSuccess(true);
      
      // Auto-close after success animation
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ general: 'Failed to save. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const hasError = !!errors[field.id];
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select 
              value={value} 
              onValueChange={(val) => handleInputChange(field.id, val)}
            >
              <SelectTrigger className={cn(hasError && "border-red-500")}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors[field.id]}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={cn("min-h-[80px] resize-none", hasError && "border-red-500")}
            />
            {hasError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors[field.id]}
              </p>
            )}
          </div>
        );

      case 'file':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => {
                  // TODO: Implement camera/file picker
                  console.log('Open camera/file picker');
                }}
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => {
                  // TODO: Implement file upload
                  console.log('Upload file');
                }}
              >
                <Receipt className="h-4 w-4" />
                Upload File
              </Button>
            </div>
            {hasError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors[field.id]}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="relative">
              {field.prefix && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {field.prefix}
                </div>
              )}
              {field.icon && !field.prefix && (
                <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              )}
              <Input
                id={field.id}
                type={field.type}
                value={value}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                className={cn(
                  field.prefix && "pl-8",
                  field.suffix && "pr-12",
                  field.icon && !field.prefix && "pl-10",
                  hasError && "border-red-500"
                )}
                step={field.type === 'number' ? '0.01' : undefined}
              />
              {field.suffix && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {field.suffix}
                </div>
              )}
            </div>
            {hasError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors[field.id]}
              </p>
            )}
          </div>
        );
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-full"
        >
          <Check className="h-12 w-12 text-green-600 dark:text-green-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Successfully Added!
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Your {actionType} has been saved to your travel records.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="pt-4">
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {errors.general}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6">
        {fields.map(renderField)}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            `Save ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`
          )}
        </Button>
      </div>
    </form>
  );
};