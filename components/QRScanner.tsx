"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

interface QRScannerProps {
  onScan: (data: string) => void;
  onError: (error: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function QRScanner({ onScan, onError, onClose, isOpen }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    startScanning();
    return () => stopScanning();
  }, [isOpen]);

  const startScanning = async () => {
    try {
      setIsScanning(true);
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera if available
      });
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Initialize ZXing reader
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Start scanning
      reader.decodeFromVideoDevice(undefined, videoRef.current!, (result, error) => {
        if (result) {
          const scannedData = result.getText();
          console.log("QR Code scanned:", scannedData);
          onScan(scannedData);
          stopScanning();
          onClose();
        }
        
        if (error && !(error instanceof NotFoundException)) {
          console.error("QR Scanner error:", error);
          onError("Failed to scan QR code. Please try again.");
        }
      });

    } catch (err: any) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError') {
        onError("Camera permission denied. Please allow camera access and try again.");
      } else if (err.name === 'NotFoundError') {
        onError("No camera found. Please ensure your device has a camera.");
      } else {
        onError("Failed to access camera. Please check your device settings.");
      }
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    
    // Stop the reader
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }

    // Stop video stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        {hasPermission === false && (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Camera access is required to scan QR codes.</p>
            <button
              onClick={startScanning}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {hasPermission === true && (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-64 bg-black rounded"
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white rounded-lg opacity-75">
                <div className="w-full h-full border-4 border-transparent border-t-blue-500 border-l-blue-500 animate-pulse"></div>
              </div>
            </div>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Position the QR code within the frame to scan
              </p>
              {isScanning && (
                <div className="flex items-center justify-center mt-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-blue-600">Scanning...</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}



