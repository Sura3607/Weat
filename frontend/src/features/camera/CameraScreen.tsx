'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import api from '@/shared/api/client';
import { compressImage, uploadWithRetry } from '@/shared/lib/imageCompress';

export function CameraScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Initialize camera
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });

        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true);
          };
        }
      } catch {
        if (!cancelled) {
          setError('Không thể truy cập camera. Vui lòng cấp quyền.');
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // Capture photo
  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing || !cameraReady) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    ctx.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setIsCapturing(false);
          return;
        }

        // Compress image before upload
        let compressedBlob: Blob;
        try {
          compressedBlob = await compressImage(blob, 1280, 0.8);
        } catch {
          compressedBlob = blob; // Fallback to original
        }

        // Show preview
        const previewUrl = URL.createObjectURL(compressedBlob);
        setLastCapture(previewUrl);

        // Upload with retry
        try {
          await uploadWithRetry(async () => {
            const formData = new FormData();
            formData.append('image', compressedBlob, 'capture.jpg');
            formData.append('capturedAt', new Date().toISOString());
            return api.post('/upload-food-locket', formData);
          }, 2, 1000);
        } catch (err) {
          console.error('Upload failed after retries:', err);
        }

        setIsCapturing(false);

        // Clear preview after 2 seconds
        setTimeout(() => {
          setLastCapture(null);
          URL.revokeObjectURL(previewUrl);
        }, 2000);
      },
      'image/jpeg',
      0.85,
    );
  }, [isCapturing, cameraReady]);

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <div className="text-center px-8">
          <p className="text-white/80 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white/20 px-6 py-2 rounded-full text-sm"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      {/* Camera Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash effect on capture */}
      {lastCapture && (
        <div className="absolute inset-0 bg-white animate-fade-in opacity-0 pointer-events-none" />
      )}

      {/* Preview thumbnail */}
      {lastCapture && (
        <div className="absolute top-20 right-4 w-16 h-16 rounded-lg overflow-hidden border-2 border-white/50 animate-slide-up z-20">
          <img src={lastCapture} alt="Captured" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Capture Button */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
        <button
          onClick={handleCapture}
          disabled={isCapturing || !cameraReady}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
          aria-label="Chụp ảnh món ăn"
        >
          <div
            className={`w-16 h-16 rounded-full bg-white transition-all ${
              isCapturing ? 'scale-75 bg-red-500' : ''
            }`}
          />
        </button>
      </div>
    </div>
  );
}
