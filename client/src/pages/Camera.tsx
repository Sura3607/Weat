import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";
import { trpc } from "@/lib/trpc";
import { Camera as CameraIcon, Mic, MicOff, RotateCcw, Check, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function CameraPage() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceNote, setVoiceNote] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { latitude, longitude, requestLocation } = useGeolocation();
  const createFoodLog = trpc.foodLog.create.useMutation();
  const transcribeMutation = trpc.voice.transcribe.useMutation();

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("Không thể truy cập camera");
    }
  }, [facingMode]);

  useEffect(() => {
    if (!capturedImage) startCamera();
    requestLocation();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera, capturedImage, requestLocation]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  // Voice recording
  const toggleRecording = useCallback(async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          try {
            const result = await transcribeMutation.mutateAsync({
              audioBase64: base64,
              mimeType: "audio/webm",
            });
            setVoiceNote(result.text);
            toast.success("Đã nhận diện giọng nói");
          } catch {
            toast.error("Không thể nhận diện giọng nói");
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Không thể truy cập microphone");
    }
  }, [isRecording, transcribeMutation]);

  // Submit food log
  const handleSubmit = useCallback(async () => {
    if (!capturedImage) return;
    const base64 = capturedImage.split(",")[1];
    try {
      const result = await createFoodLog.mutateAsync({
        imageBase64: base64,
        mimeType: "image/jpeg",
        voiceNote: voiceNote || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      });
      toast.success(result.analysis?.dishNameVi ? `Đã lưu: ${result.analysis.dishNameVi}` : "Đã lưu food log!");
      navigate("/feed");
    } catch {
      toast.error("Không thể lưu food log");
    }
  }, [capturedImage, voiceNote, latitude, longitude, createFoodLog, navigate]);

  if (authLoading) {
    return (
      <div className="app-shell flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="app-shell bg-black relative flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera view or captured image */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="viewfinder-frame w-[85%] aspect-square" />
            </div>
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
              <button onClick={() => navigate("/feed")} className="text-white/80 p-2">
                <X className="w-6 h-6" />
              </button>
              <button onClick={toggleCamera} className="text-white/80 p-2">
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black/90 p-6 bottom-nav">
        {!capturedImage ? (
          <div className="flex items-center justify-center gap-8">
            {/* Voice button */}
            <button
              onClick={toggleRecording}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isRecording ? "bg-red-500" : "bg-white/20"
              }`}
            >
              {isRecording ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </button>

            {/* Capture button */}
            <button
              onClick={capturePhoto}
              className="capture-btn w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-white" />
            </button>

            {/* Placeholder for symmetry */}
            <div className="w-12 h-12" />
          </div>
        ) : (
          <div className="space-y-3">
            {voiceNote && (
              <p className="text-white/70 text-sm text-center italic">"{voiceNote}"</p>
            )}
            {transcribeMutation.isPending && (
              <p className="text-white/50 text-sm text-center flex items-center justify-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Đang nhận diện giọng nói...
              </p>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/30 text-white bg-transparent hover:bg-white/10"
                onClick={() => setCapturedImage(null)}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Chụp lại
              </Button>
              <Button
                className="flex-1 bg-terracotta hover:bg-terracotta-dark text-white"
                onClick={handleSubmit}
                disabled={createFoodLog.isPending}
              >
                {createFoodLog.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                {createFoodLog.isPending ? "Đang phân tích..." : "Lưu"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
