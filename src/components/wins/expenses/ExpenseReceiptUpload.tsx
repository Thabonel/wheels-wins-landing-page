import { useState, useRef } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { Camera, Upload, Loader2, FileText } from "lucide-react";
import Tesseract from "tesseract.js";
import { getTodayDateLocal } from "@/utils/format";

const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  (window.location.hostname.includes("staging") ||
  window.location.hostname.includes("wheels-wins-staging")
    ? "https://wheels-wins-backend-staging.onrender.com"
    : "https://pam-backend.onrender.com");

const CONFIDENCE_THRESHOLD = 0.7;
const MIN_OCR_TEXT_LENGTH = 20;

interface ExtractedData {
  total: number | null;
  date: string | null;
  station: string | null;
  overall_confidence: number;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    description: "",
    date: "",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const docTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!file.type.startsWith("image/") && !docTypes.includes(file.type)) {
      setError("Please select an image, PDF, or Word document");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File must be smaller than 10MB");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setExtracted(null);
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  };

  const openCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  };

  const clearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setExtracted(null);
    setError(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getAuthToken = async (): Promise<string> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Authentication required - please log in");
    }
    return session.access_token;
  };

  const uploadReceipt = async (
    file: File,
    token: string
  ): Promise<string | null> => {
    const uploadForm = new FormData();
    uploadForm.append("file", file);

    const resp = await fetch(`${BACKEND_URL}/api/v1/fuel/upload-receipt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: uploadForm,
    });

    if (!resp.ok) {
      console.error("Receipt upload failed:", resp.status, resp.statusText);
      return null;
    }

    const result = await resp.json();
    return result.receipt_url || null;
  };

  const runTesseractOCR = async (
    file: File
  ): Promise<{ text: string; confidence: number }> => {
    const result = await Tesseract.recognize(file, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          const pct = Math.round((m.progress || 0) * 100);
          setProcessingStep(`Reading receipt... ${pct}%`);
        }
      },
    });

    return {
      text: result.data.text,
      confidence: (result.data.confidence || 0) / 100,
    };
  };

  const callTextParseAPI = async (
    ocrText: string,
    token: string
  ): Promise<ExtractedData> => {
    const resp = await fetch(
      `${BACKEND_URL}/api/v1/fuel/parse-receipt-text`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: ocrText }),
      }
    );

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      throw new Error(errBody.detail || `Text parsing failed (${resp.status})`);
    }

    const result = await resp.json();
    const data = result.extracted || result;

    return {
      total: data.total ?? null,
      date: data.date ?? null,
      station: data.station ?? null,
      overall_confidence: result.overall_confidence || data.overall_confidence || 0,
    };
  };

  const callVisionAPI = async (
    file: File,
    token: string
  ): Promise<ExtractedData> => {
    const base64 = await fileToBase64(file);

    const resp = await fetch(
      `${BACKEND_URL}/api/v1/fuel/parse-receipt-vision`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_base64: base64,
          mime_type: file.type,
        }),
      }
    );

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      throw new Error(errBody.detail || `Vision analysis failed (${resp.status})`);
    }

    const visionResult = await resp.json();
    const data = visionResult.extracted || visionResult;

    return {
      total: data.total ?? null,
      date: data.date ?? null,
      station: data.station ?? null,
      overall_confidence: visionResult.overall_confidence || 0.9,
    };
  };

  const applyExtractedData = (data: ExtractedData) => {
    setExtracted(data);

    // Auto-detect category from station name
    let guessedCategory = "";
    if (data.station) {
      const lower = data.station.toLowerCase();
      const fuelKeywords = ["shell", "bp", "caltex", "chevron", "mobil", "exxon", "petrol", "gas", "fuel"];
      const foodKeywords = ["mcdonald", "hungry jack", "subway", "cafe", "coffee", "restaurant", "pizza", "kfc"];
      const campKeywords = ["caravan", "holiday", "camping", "rv park", "big4"];

      if (fuelKeywords.some((k) => lower.includes(k))) guessedCategory = "Fuel";
      else if (foodKeywords.some((k) => lower.includes(k))) guessedCategory = "Food";
      else if (campKeywords.some((k) => lower.includes(k))) guessedCategory = "Camp";
    }

    setFormData({
      amount: data.total?.toString() || "",
      category: guessedCategory,
      description: data.station || "",
      date: data.date || getTodayDateLocal(),
    });
  };

  const processReceipt = async () => {
    if (!selectedFile || !user) return;
    setIsProcessing(true);
    setError(null);

    try {
      const token = await getAuthToken();

      setProcessingStep("Uploading receipt...");
      const uploadedUrl = await uploadReceipt(selectedFile, token);
      if (uploadedUrl) {
        setReceiptUrl(uploadedUrl);
      }

      let handled = false;
      const isImage = selectedFile.type.startsWith("image/");
      const isPDF = selectedFile.type === "application/pdf";

      // Tesseract OCR only works on images
      if (isImage) {
        setProcessingStep("Reading receipt with OCR...");
        try {
          const ocr = await runTesseractOCR(selectedFile);

          if (
            ocr.confidence >= CONFIDENCE_THRESHOLD &&
            ocr.text.trim().length >= MIN_OCR_TEXT_LENGTH
          ) {
            setProcessingStep("Parsing receipt data...");
            try {
              const parsed = await callTextParseAPI(ocr.text, token);
              applyExtractedData(parsed);
              handled = true;
            } catch {
              // Fall through to Vision API
            }
          }
        } catch {
          // Tesseract failed, fall through to Vision API
        }
      }

      // Vision API handles images and PDFs
      if (!handled && (isImage || isPDF)) {
        setProcessingStep("Analyzing receipt with AI...");
        const visionData = await callVisionAPI(selectedFile, token);
        applyExtractedData(visionData);
        handled = true;
      }

      // Word docs: upload succeeds but no AI extraction - show manual form
      if (!handled) {
        setProcessingStep("");
        applyExtractedData({
          total: null, date: null, station: null, overall_confidence: 0,
        });
      }
    } catch (err: any) {
      console.error("Receipt processing error:", err);
      setError(
        err.message || "Could not read receipt. Please enter the details manually."
      );

      setExtracted({
        total: null,
        date: null,
        station: null,
        overall_confidence: 0,
      });
      setFormData({
        amount: "",
        category: "",
        description: "",
        date: getTodayDateLocal(),
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
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
      {/* File selection area */}
      {!previewUrl && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-3">
              <Button onClick={openCamera} variant="outline">
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Button onClick={openFilePicker} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Upload a receipt photo, PDF invoice, or take a photo
            </p>
          </div>
        </div>
      )}

      {/* File preview + scan button */}
      {previewUrl && !extracted && (
        <div className="space-y-3">
          {selectedFile && !selectedFile.type.startsWith("image/") ? (
            <div className="max-h-64 mx-auto rounded-lg shadow bg-gray-50 flex flex-col items-center justify-center p-8">
              <FileText className="w-12 h-12 text-red-500" />
              <p className="text-sm text-gray-600 mt-2">{selectedFile.name}</p>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="max-h-64 mx-auto rounded-lg shadow"
            />
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={clearSelection} variant="outline">
              Change File
            </Button>
            <Button onClick={processReceipt} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {processingStep}
                </>
              ) : (
                "Scan Receipt"
              )}
            </Button>
          </div>
        </div>
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
              selectedFile && !selectedFile.type.startsWith("image/") ? (
                <div className="max-h-32 flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <FileText className="w-6 h-6 text-red-500 shrink-0" />
                  <span className="text-sm text-gray-600 truncate">{selectedFile.name}</span>
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

      {/* Cancel button when only file picker is shown */}
      {!extracted && !previewUrl && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
