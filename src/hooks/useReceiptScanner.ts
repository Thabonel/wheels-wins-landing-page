import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import Tesseract from "tesseract.js";
import heic2any from "heic2any";
import { useOCRWorker } from "./useOCRWorker";

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

async function convertHeicToJpg(file: File): Promise<File> {
  try {
    const convertedBlob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    }) as Blob;

    // Create a new File object with the converted blob
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

async function preprocessImageForOCR(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      try {
        // Calculate optimal dimensions (max 1920x1080 for performance, maintain aspect ratio)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          const ratio = Math.min(widthRatio, heightRatio);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Apply preprocessing filters for better OCR
        ctx.filter = 'contrast(1.2) brightness(1.1) saturate(0.8)';

        // Draw the optimized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert back to File with high quality for OCR
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to process image'));
            return;
          }

          const processedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, '_processed.jpg'),
            { type: 'image/jpeg' }
          );

          resolve(processedFile);
        }, 'image/jpeg', 0.95); // High quality for OCR accuracy

      } catch (error) {
        reject(new Error(`Image preprocessing failed: ${error.message || error}`));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for preprocessing'));
    };

    img.src = URL.createObjectURL(file);
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

  // OCR Worker for non-blocking processing
  const { processOCR, isWorkerSupported } = useOCRWorker();

  const handleFileSelect = useCallback(async (file: File): Promise<boolean> => {
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

    let processedFile = file;

    // Check if the file is HEIC and convert it to JPG
    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      try {
        setError("Converting HEIC image...");
        processedFile = await convertHeicToJpg(file);
        setError(null);
        console.log('HEIC file converted successfully:', processedFile.name);
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

      // Step 3: For images, try Tesseract OCR first (with format validation)
      if (isImage) {
        setProcessingStep("Optimizing image for OCR...");
        try {
          // Check if image format is supported by Tesseract.js
          const supportedFormats = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'image/gif'];
          const isTesseractSupported = supportedFormats.includes(selectedFile.type);

          if (!isTesseractSupported) {
            console.log(`Tesseract.js doesn't support ${selectedFile.type}, skipping to vision API`);
            throw new Error(`Unsupported image format for OCR: ${selectedFile.type}`);
          }

          // Preprocess image for better OCR accuracy
          let imageForOCR = selectedFile;
          try {
            imageForOCR = await preprocessImageForOCR(selectedFile);
            console.log('Image preprocessed for OCR:', imageForOCR.name);
          } catch (preprocessError) {
            console.warn('Image preprocessing failed, using original:', preprocessError);
            // Continue with original image if preprocessing fails
          }

          setProcessingStep("Reading receipt with OCR...");

          // Use Web Worker for OCR if supported, fallback to main thread
          let ocrText: string;
          let ocrConfidence: number;

          if (isWorkerSupported()) {
            try {
              const workerResult = await processOCR(imageForOCR, "eng", {}, (progress) => {
                setProcessingStep(progress.status);
              });
              ocrText = workerResult.text;
              ocrConfidence = workerResult.confidence;
              console.log('OCR processed with Web Worker');
            } catch (workerError) {
              console.warn('Web Worker OCR failed, falling back to main thread:', workerError);
              // Fallback to main thread processing
              const ocrResult = await Tesseract.recognize(imageForOCR, "eng", {
                logger: (m) => {
                  if (m.status === "recognizing text") {
                    const pct = Math.round((m.progress || 0) * 100);
                    setProcessingStep(`Reading receipt... ${pct}%`);
                  }
                },
              });
              ocrText = ocrResult.data.text;
              ocrConfidence = (ocrResult.data.confidence || 0) / 100;
            }
          } else {
            // Direct processing when Web Worker not supported
            const ocrResult = await Tesseract.recognize(imageForOCR, "eng", {
              logger: (m) => {
                if (m.status === "recognizing text") {
                  const pct = Math.round((m.progress || 0) * 100);
                  setProcessingStep(`Reading receipt... ${pct}%`);
                }
              },
            });
            ocrText = ocrResult.data.text;
            ocrConfidence = (ocrResult.data.confidence || 0) / 100;
            console.log('OCR processed on main thread');
          }

          // Step 4: If OCR produced good text, try universal text parsing
          if (ocrConfidence >= CONFIDENCE_THRESHOLD && ocrText.trim().length >= MIN_OCR_TEXT_LENGTH) {
            setProcessingStep("Parsing receipt data...");
            try {
              const textResp = await fetch(`${BACKEND_URL}/api/v1/receipts/parse-text`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                  "X-Requested-With": "XMLHttpRequest", // Help bypass CSRF
                },
                credentials: "include", // Include cookies
                mode: "cors", // Explicit CORS mode
                body: JSON.stringify({ text: ocrText }),
              });

              if (textResp.ok) {
                const textResult = await textResp.json();
                const data = textResult.extracted || textResult;
                setExtracted(normalizeExtractedData(data, textResult));
                handled = true;
              }
            } catch (textParseError) {
              // Text parse failed - fall through to vision API
              console.log("Text parsing failed:", textParseError);
            }
          }
        } catch (ocrError) {
          // Tesseract failed - log error and fall through to vision API
          console.log("Tesseract OCR failed:", ocrError);
          setProcessingStep("OCR failed, trying AI vision...");
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
            "X-Requested-With": "XMLHttpRequest", // Help bypass CSRF
          },
          credentials: "include", // Include cookies
          mode: "cors", // Explicit CORS mode
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
