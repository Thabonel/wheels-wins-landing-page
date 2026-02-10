import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useExpenseActions } from "@/hooks/useExpenseActions";
import SmartReceiptScanner from "@/components/shared/SmartReceiptScanner";
import { type UniversalExtractedData } from "@/hooks/useReceiptScanner";
import { Loader2, FileText } from "lucide-react";
import { getTodayDateLocal } from "@/utils/format";

interface ExpenseReceiptUploadProps {
  onExpenseCreated: () => void;
  onCancel: () => void;
}

export default function ExpenseReceiptUpload({
  onExpenseCreated,
  onCancel,
}: ExpenseReceiptUploadProps) {
  const { user } = useAuth();
  const { addExpense, categories } = useExpenseActions();

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<UniversalExtractedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    description: "",
    date: "",
  });

  const handleExtracted = (data: UniversalExtractedData) => {
    setExtracted(data);

    setFormData({
      amount: data.total?.toString() || "",
      category: data.suggested_category && categories.includes(data.suggested_category)
        ? data.suggested_category
        : "",
      description: [data.vendor, data.description].filter(Boolean).join(" - ") || "",
      date: data.date || getTodayDateLocal(),
    });
  };

  const handleFileChange = (file: File | null) => {
    setPreviewFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    const amount = parseFloat(formData.amount) || 0;
    if (!amount) {
      setError("Please enter an amount");
      return;
    }

    if (!formData.category) {
      setError("Please select a category");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const success = await addExpense({
        amount,
        category: formData.category,
        description: formData.description || formData.category,
        date: formData.date || getTodayDateLocal(),
        receiptUrl: receiptUrl,
      });

      if (success) {
        onExpenseCreated();
      } else {
        setError("Failed to save expense. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Scanner - handles file selection, OCR, and extraction */}
      {!extracted && (
        <SmartReceiptScanner
          onExtracted={handleExtracted}
          onFileChange={handleFileChange}
          onReceiptUploaded={(url) => setReceiptUrl(url)}
        />
      )}

      {/* Extracted data form */}
      {extracted && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-gray-600">
              {extracted.overall_confidence > 0
                ? "Receipt scanned - verify and edit the details below:"
                : "Enter your expense details:"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What was this expense for?"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
            </div>
            {previewUrl && (
              previewFile && !previewFile.type.startsWith("image/") ? (
                <div className="max-h-32 flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <FileText className="w-6 h-6 text-red-500 shrink-0" />
                  <span className="text-sm text-gray-600 truncate">{previewFile.name}</span>
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt="Receipt"
                  className="max-h-32 rounded"
                />
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Action buttons when form is visible */}
      {extracted && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !formData.amount || !formData.category}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Expense"
            )}
          </Button>
        </div>
      )}

      {/* Cancel button when only scanner is shown */}
      {!extracted && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
