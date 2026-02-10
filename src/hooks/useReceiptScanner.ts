import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import Tesseract from "tesseract.js";

const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname.includes("staging") ||
    window.location.hostname.includes("wheels-wins-staging"))
    ? "https://wheels-wins-backend-staging.onrender.com"
    : "https://pam-backend.onrender.com");

const CONFIDENCE_THRESHOLD = 0.7;
const MIN_OCR_TEXT_LENGTH = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export interface UniversalExtractedData {
  receipt_type: string;
  total: number | null;
  date: string | null;
  vendor: string | null;
  description: string | null;
  suggested_category: string;
  confidence: Record<string, number>;
  overall_confidence: number;
  volume?: number | null;
  price?: number | null;
  unit?: string;
  odometer?: number | null;
  station?: string | null;
}

function isAcceptedFileType(file: File): boolean {
  return file.type.startsWith("image/") || ACCEPTED_DOC_TYPES.includes(file.type);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URI prefix to get raw base64
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useReceiptScanner() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [extracted, setExtracted] = useState<UniversalExtractedData | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track the object URL so we can revoke it on cleanup
  const objectUrlRef = useRef<string | null>(null);

  const handleFileSelect = useCallback((file: File): boolean => {
    if (!isAcceptedFileType(file)) {
      setError("Please select an image, PDF, or Word document");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File must be smaller than 10MB");
      return false;
    }

    // Revoke previous object URL to prevent memory leaks
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    setSelectedFile(file);
    setPreviewUrl(url);
    setError(null);
    setExtracted(null);
    setReceiptUrl(null);
    return true;
  }, []);

  const clearSelection = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtracted(null);
    setError(null);
    setReceiptUrl(null);
  }, []);

  const reset = useCallback(() => {
    clearSelection();
    setProcessingStep("");
    setIsProcessing(false);
  }, [clearSelection]);

  const processReceipt = useCallback(async () => {
    if (!selectedFile) {
      setError("No file selected");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setExtracted(null);

    try {
      // Auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Authentication required - please log in");
      }
      const token = session.access_token;

      // Step 1: Upload the receipt file
      setProcessingStep("Uploading receipt...");
      const uploadForm = new FormData();
      uploadForm.append("file", selectedFile);

      const uploadResp = await fetch(`${BACKEND_URL}/api/v1/fuel/upload-receipt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: uploadForm,
      });

      if (uploadResp.ok) {
        const uploadResult = await uploadResp.json();
        if (uploadResult.receipt_url) {
          setReceiptUrl(uploadResult.receipt_url);
        }
      } else {
        // Upload failure is non-fatal - we can still try to extract data
        console.error("Receipt upload returned:", uploadResp.status);
      }

      const isImage = selectedFile.type.startsWith("image/");
      const isPDF = selectedFile.type === "application/pdf";
      const isWordDoc = ACCEPTED_DOC_TYPES.slice(1).includes(selectedFile.type);

      // Step 2: Word docs have no extraction pipeline - show empty data
      if (isWordDoc) {
        setExtracted({
          receipt_type: "unknown",
          total: null,
          date: null,
          vendor: null,
          description: null,
          suggested_category: "",
          confidence: {},
          overall_confidence: 0,
        });
        return;
      }

      let handled = false;

      // Step 3: For images, try Tesseract OCR first
      if (isImage) {
        setProcessingStep("Reading receipt with OCR...");
        try {
          const ocrResult = await Tesseract.recognize(selectedFile, "eng", {
            logger: (m) => {
              if (m.status === "recognizing text") {
                const pct = Math.round((m.progress || 0) * 100);
                setProcessingStep(`Reading receipt... ${pct}%`);
              }
            },
          });

          const ocrText = ocrResult.data.text;
          const ocrConfidence = (ocrResult.data.confidence || 0) / 100;

          // Step 4: If OCR produced good text, try universal text parsing
          if (ocrConfidence >= CONFIDENCE_THRESHOLD && ocrText.trim().length >= MIN_OCR_TEXT_LENGTH) {
            setProcessingStep("Parsing receipt data...");
            try {
              const textResp = await fetch(`${BACKEND_URL}/api/v1/receipts/parse-text`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ text: ocrText }),
              });

              if (textResp.ok) {
                const textResult = await textResp.json();
                const data = textResult.extracted || textResult;
                setExtracted(normalizeExtractedData(data, textResult));
                handled = true;
              }
            } catch {
              // Text parse failed - fall through to vision
            }
          }
        } catch {
          // Tesseract failed - fall through to vision
        }
      }

      // Step 5: For images and PDFs, fall back to vision API
      if (!handled && (isImage || isPDF)) {
        setProcessingStep("Analyzing receipt with AI...");
        const base64 = await fileToBase64(selectedFile);

        const visionResp = await fetch(`${BACKEND_URL}/api/v1/receipts/parse-vision`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_base64: base64,
            mime_type: selectedFile.type,
          }),
        });

        if (!visionResp.ok) {
          const errBody = await visionResp.json().catch(() => ({}));
          throw new Error(errBody.detail || `Vision analysis failed (${visionResp.status})`);
        }

        const visionResult = await visionResp.json();
        const data = visionResult.extracted || visionResult;
        setExtracted(normalizeExtractedData(data, visionResult));
        handled = true;
      }

      // Step 6: Nothing worked - provide empty data so caller can show manual entry
      if (!handled) {
        setExtracted({
          receipt_type: "unknown",
          total: null,
          date: null,
          vendor: null,
          description: null,
          suggested_category: "",
          confidence: {},
          overall_confidence: 0,
        });
      }
    } catch (err: any) {
      console.error("Receipt processing error:", err);
      setError(err.message || "Could not read receipt. Please enter details manually.");
      setExtracted(null);
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  }, [selectedFile]);

  return {
    selectedFile,
    previewUrl,
    isProcessing,
    processingStep,
    extracted,
    receiptUrl,
    error,
    handleFileSelect,
    processReceipt,
    clearSelection,
    reset,
  };
}

// Normalize any backend response shape into the universal format
function normalizeExtractedData(
  data: Record<string, any>,
  envelope: Record<string, any>
): UniversalExtractedData {
  return {
    receipt_type: data.receipt_type ?? "general",
    total: data.total ?? null,
    date: data.date ?? null,
    vendor: data.vendor ?? data.station ?? null,
    description: data.description ?? null,
    suggested_category: data.suggested_category ?? "",
    confidence: data.confidence ?? {},
    overall_confidence: envelope.overall_confidence ?? data.overall_confidence ?? 0,
    volume: data.volume ?? null,
    price: data.price ?? null,
    unit: data.unit,
    odometer: data.odometer ?? null,
    station: data.station ?? data.vendor ?? null,
  };
}
