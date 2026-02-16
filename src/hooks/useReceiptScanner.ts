import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import heic2any from "heic2any";

const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname.includes("staging") ||
    window.location.hostname.includes("wheels-wins-staging"))
    ? "https://wheels-wins-backend-staging.onrender.com"
    : "https://pam-backend.onrender.com");

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
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function convertHeicToJpg(file: File): Promise<File> {
  try {
    const convertedBlob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    }) as Blob;

    const convertedFile = new File(
      [convertedBlob],
      file.name.replace(/\.heic$/i, '.jpg'),
      { type: 'image/jpeg' }
    );

    return convertedFile;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw new Error('Failed to convert HEIC image. Please try a different format.');
  }
}

export function useReceiptScanner() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [extracted, setExtracted] = useState<UniversalExtractedData | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const objectUrlRef = useRef<string | null>(null);

  const handleFileSelect = useCallback(async (file: File): Promise<boolean> => {
    if (!isAcceptedFileType(file)) {
      setError("Please select an image, PDF, or Word document");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File must be smaller than 10MB");
      return false;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    let processedFile = file;

    // Convert HEIC to JPG for iPhone users
    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      try {
        setError("Converting HEIC image...");
        processedFile = await convertHeicToJpg(file);
        setError(null);
      } catch (conversionError) {
        console.error('HEIC conversion failed:', conversionError);
        setError("Failed to convert HEIC image. Please try a JPG or PNG format.");
        return false;
      }
    }

    const url = URL.createObjectURL(processedFile);
    objectUrlRef.current = url;

    setSelectedFile(processedFile);
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
        console.error("Receipt upload returned:", uploadResp.status);
      }

      const isImage = selectedFile.type.startsWith("image/");
      const isPDF = selectedFile.type === "application/pdf";
      const isWordDoc = ACCEPTED_DOC_TYPES.slice(1).includes(selectedFile.type);

      // Step 2: Word docs have no extraction pipeline
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

      // Step 3: For images and PDFs, use backend OCR service
      if (isImage || isPDF) {
        setProcessingStep("Extracting text from receipt...");
        try {
          const ocrForm = new FormData();
          ocrForm.append("file", selectedFile);

          const ocrResp = await fetch(`${BACKEND_URL}/api/v1/ocr/extract`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: ocrForm,
          });

          if (ocrResp.ok) {
            const ocrResult = await ocrResp.json();
            const ocrText = ocrResult.text || "";

            // If OCR produced good text, try universal text parsing
            if (ocrText.trim().length >= MIN_OCR_TEXT_LENGTH) {
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
              } catch (textParseError) {
                console.log("Text parsing failed:", textParseError);
              }
            }
          }
        } catch (ocrError) {
          console.log("Backend OCR failed:", ocrError);
        }
      }

      // Step 4: Fall back to vision API for direct structured extraction
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

      // Step 5: Nothing worked
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
