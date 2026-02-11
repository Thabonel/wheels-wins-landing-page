import { useState, useCallback } from "react";
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
import { Loader2, FileText, Plus } from "lucide-react";
import { getTodayDateLocal } from "@/utils/format";
import { defaultCategories } from "@/components/wins/expenses/mockData";

interface ExpenseReceiptUploadProps {
  onExpenseCreated: () => void;
  onCancel: () => void;
}

export default function ExpenseReceiptUpload({
  onExpenseCreated,
  onCancel,
}: ExpenseReceiptUploadProps) {
  const { user } = useAuth();
  const { addExpense, categories, addCategory } = useExpenseActions();

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<UniversalExtractedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // New category creation states
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    description: "",
    date: "",
  });

  // Combine default categories with user categories, ensuring no duplicates
  const allCategories = [
    ...new Set([...defaultCategories, ...categories])
  ].sort();

  const handleExtracted = useCallback((data: UniversalExtractedData) => {
    setExtracted(data);

    // Enhanced category suggestion mapping
    const mapSuggestedCategory = (suggestion: string): string => {
      const lower = suggestion.toLowerCase();

      // Direct matches first
      if (allCategories.includes(suggestion)) return suggestion;

      // Smart mapping based on common receipt types
      const mappings: Record<string, string> = {
        'fuel': 'Fuel',
        'gas': 'Fuel',
        'gasoline': 'Fuel',
        'diesel': 'Fuel',
        'food': 'Groceries',
        'grocery': 'Groceries',
        'restaurant': 'Restaurants',
        'dining': 'Restaurants',
        'coffee': 'Coffee',
        'camp': 'Campgrounds',
        'camping': 'Campgrounds',
        'rv park': 'RV Parks',
        'hotel': 'Hotels',
        'motel': 'Hotels',
        'lodging': 'Hotels',
        'maintenance': 'Maintenance',
        'repair': 'Repairs',
        'auto': 'Maintenance',
        'car wash': 'Maintenance',
        'oil': 'Oil Change',
        'tire': 'Tires',
        'propane': 'Propane',
        'laundry': 'Laundry',
        'toll': 'Toll',
        'parking': 'Parking',
        'entertainment': 'Entertainment',
        'attraction': 'Attractions',
        'tour': 'Tours',
        'souvenir': 'Souvenirs',
        'medical': 'Medical',
        'pharmacy': 'Pharmacy',
        'drug': 'Pharmacy',
        'supply': 'Supplies',
        'general': 'Miscellaneous',
        'other': 'Other'
      };

      // Check for partial matches
      for (const [key, category] of Object.entries(mappings)) {
        if (lower.includes(key)) {
          return category;
        }
      }

      return ""; // No good match found
    };

    const suggestedCategory = data.suggested_category
      ? mapSuggestedCategory(data.suggested_category)
      : "";

    setFormData({
      amount: data.total?.toString() || "",
      category: suggestedCategory,
      description: [data.vendor, data.description].filter(Boolean).join(" - ") || "",
      date: data.date || getTodayDateLocal(),
    });
  }, [allCategories]);

  const handleFileChange = useCallback((file: File | null) => {
    setPreviewFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }, []);

  const handleReceiptUploaded = useCallback((url: string) => {
    setReceiptUrl(url);
  }, []);

  const handleCreateNewCategory = useCallback(async () => {
    if (!newCategoryName.trim()) return;

    setIsAddingCategory(true);
    setError(null);

    const success = await addCategory(newCategoryName.trim());

    if (success) {
      // Auto-select the newly created category
      setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
      setNewCategoryName("");
      setShowNewCategoryInput(false);
    }

    setIsAddingCategory(false);
  }, [newCategoryName, addCategory]);

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
          onReceiptUploaded={handleReceiptUploaded}
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
                {showNewCategoryInput ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter new category name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateNewCategory();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={handleCreateNewCategory}
                        disabled={!newCategoryName.trim() || isAddingCategory}
                      >
                        {isAddingCategory ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select
                      value={formData.category}
                      onValueChange={(value) => {
                        if (value === "CREATE_NEW") {
                          setShowNewCategoryInput(true);
                        } else {
                          setFormData({ ...formData, category: value });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {/* Popular/Essential categories first */}
                        <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                          Essential Travel
                        </div>
                        {["Fuel", "Toll", "Parking", "Insurance"].map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}

                        <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                          Camping & Accommodation
                        </div>
                        {["Campgrounds", "RV Parks", "Hotels", "Boondocking"].map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}

                        <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                          Food & Dining
                        </div>
                        {["Groceries", "Restaurants", "Coffee", "Snacks"].map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}

                        <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                          All Categories
                        </div>
                        {allCategories
                          .filter(cat => !["Fuel", "Toll", "Parking", "Insurance", "Campgrounds", "RV Parks", "Hotels", "Boondocking", "Groceries", "Restaurants", "Coffee", "Snacks"].includes(cat))
                          .map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}

                        <div className="border-t mt-2 pt-2">
                          <SelectItem value="CREATE_NEW" className="font-medium text-blue-600">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Create New Category
                            </div>
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                    {formData.category && (
                      <p className="text-xs text-gray-500">
                        Selected: <span className="font-medium">{formData.category}</span>
                      </p>
                    )}
                  </div>
                )}
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
