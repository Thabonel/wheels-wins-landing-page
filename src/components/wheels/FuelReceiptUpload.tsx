import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useRegion } from "@/context/RegionContext";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Upload, Loader2 } from "lucide-react";
import Tesseract from "tesseract.js";
import { getTodayDateLocal } from "@/utils/format";

// Backend URL - same pattern used across the codebase (see api.ts, receiptService.ts)
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
  volume: number | null;
  price: number | null;
  date: string | null;
  station: string | null;
  unit: string;
  receipt_url?: string;
  overall_confidence: number;
}

interface FuelReceiptUploadProps {
  onEntryCreated: (entry: any) => void;
  onCancel: () => void;
}

export default function FuelReceiptUpload({
  onEntryCreated,
  onCancel,
}: FuelReceiptUploadProps) {
  const { user } = useAuth();
  const { region, regionConfig } = useRegion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isImperial = regionConfig.units === "imperial";
  const volumeLabel = isImperial ? "gal" : "L";

  const [formData, setFormData] = useState({
    total: "",
    volume: "",
    price: "",
    date: "",
    station: "",
    odometer: "",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10MB");
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
        // Strip the data:image/xxx;base64, prefix
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
      // Non-fatal - we can still scan without storing the image
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
      throw new Error("Text parsing failed");
    }

    const result = await resp.json();
    const data = result.extracted || result;

    return {
      total: data.total ?? null,
      volume: data.volume ?? null,
      price: data.price ?? null,
      date: data.date ?? null,
      station: data.station ?? null,
      unit: data.unit || (isImperial ? "gal" : "L"),
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
      throw new Error("Vision analysis failed");
    }

    const visionResult = await resp.json();
    const data = visionResult.extracted || visionResult;

    return {
      total: data.total ?? null,
      volume: data.volume ?? null,
      price: data.price ?? null,
      date: data.date ?? null,
      station: data.station ?? null,
      unit: data.unit || (isImperial ? "gal" : "L"),
      overall_confidence: visionResult.overall_confidence || 0.9,
    };
  };

  const applyExtractedData = (data: ExtractedData) => {
    setExtracted(data);
    setFormData({
      total: data.total?.toString() || "",
      volume: data.volume?.toString() || "",
      price: data.price?.toString() || "",
      date: data.date || getTodayDateLocal(),
      station: data.station || "",
      odometer: "",
    });
  };

  const processReceipt = async () => {
    if (!selectedFile || !user) return;
    setIsProcessing(true);
    setError(null);

    try {
      const token = await getAuthToken();

      // Step 1: Upload receipt image to backend storage
      setProcessingStep("Uploading receipt...");
      const uploadedUrl = await uploadReceipt(selectedFile, token);
      if (uploadedUrl) {
        setReceiptUrl(uploadedUrl);
      }

      // Step 2: Try Tesseract.js OCR first (client-side, free)
      setProcessingStep("Reading receipt with OCR...");
      let handled = false;

      try {
        const ocr = await runTesseractOCR(selectedFile);

        if (
          ocr.confidence >= CONFIDENCE_THRESHOLD &&
          ocr.text.trim().length >= MIN_OCR_TEXT_LENGTH
        ) {
          // Good OCR result - parse the text server-side with regex
          setProcessingStep("Parsing receipt data...");
          try {
            const parsed = await callTextParseAPI(ocr.text, token);
            applyExtractedData(parsed);
            handled = true;
          } catch {
            // Text parsing failed, fall through to Vision API
          }
        }
      } catch {
        // Tesseract failed entirely, fall through to Vision API
      }

      // Step 3: Vision API fallback when Tesseract was insufficient
      if (!handled) {
        setProcessingStep("Analyzing receipt with AI...");
        const visionData = await callVisionAPI(selectedFile, token);
        applyExtractedData(visionData);
      }
    } catch (err: any) {
      console.error("Receipt processing error:", err);
      setError(
        err.message || "Could not read receipt. Please enter the details manually."
      );

      // Even on error, show the form so user can enter data manually
      setExtracted({
        total: null,
        volume: null,
        price: null,
        date: null,
        station: null,
        unit: isImperial ? "gal" : "L",
        overall_confidence: 0,
      });
      setFormData({
        total: "",
        volume: "",
        price: "",
        date: getTodayDateLocal(),
        station: "",
        odometer: "",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    const total = parseFloat(formData.total);
    const volume = parseFloat(formData.volume);

    if (!total && !volume) {
      setError("Please enter at least a total cost or volume");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const entry = {
        user_id: user.id,
        date: formData.date || getTodayDateLocal(),
        location: formData.station,
        odometer: parseFloat(formData.odometer) || null,
        volume: volume || null,
        price: parseFloat(formData.price) || null,
        total: total || null,
        filled_to_top: true,
        receipt_url: receiptUrl,
        receipt_metadata: extracted
          ? {
              overall_confidence: extracted.overall_confidence,
              unit: extracted.unit,
            }
          : null,
        region: region || null,
      };

      const { data, error: dbError } = await (supabase as any)
        .from("fuel_log")
        .insert(entry)
        .select();

      if (dbError) {
        console.error("Failed to save fuel entry:", dbError);
        setError("Failed to save fuel entry. Please try again.");
        return;
      }

      if (data?.[0]) {
        onEntryCreated(data[0]);
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
            accept="image/*"
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
              Take a photo of your fuel receipt or upload one
            </p>
          </div>
        </div>
      )}

      {/* Image preview + scan button */}
      {previewUrl && !extracted && (
        <div className="space-y-3">
          <img
            src={previewUrl}
            alt="Receipt preview"
            className="max-h-64 mx-auto rounded-lg shadow"
          />
          <div className="flex gap-2 justify-center">
            <Button onClick={clearSelection} variant="outline">
              Change Photo
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
                : "Enter your fuel receipt details:"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) =>
                    setFormData({ ...formData, total: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Volume ({volumeLabel})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.volume}
                  onChange={(e) =>
                    setFormData({ ...formData, volume: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Price / {volumeLabel}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
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
              <div>
                <Label>Station</Label>
                <Input
                  value={formData.station}
                  onChange={(e) =>
                    setFormData({ ...formData, station: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Odometer</Label>
                <Input
                  type="number"
                  value={formData.odometer}
                  onChange={(e) =>
                    setFormData({ ...formData, odometer: e.target.value })
                  }
                  placeholder="Enter current reading"
                />
              </div>
            </div>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Receipt"
                className="max-h-32 rounded"
              />
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
            disabled={isSaving || (!formData.total && !formData.volume)}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Fuel Entry"
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
