import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";
import { trpc } from "@/lib/trpc";
import { Camera as CameraIcon, Mic, MicOff, RotateCcw, Check, Loader2, X, Sparkles, ShieldAlert, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type ValidationState = "idle" | "validating" | "valid" | "invalid";

export default function CameraPage() {
  const { user, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: import.meta.env.PROD,
  });
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceNote, setVoiceNote] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [rating, setRating] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [validationReason, setValidationReason] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { latitude, longitude, requestLocation } = useGeolocation();
  const utils = trpc.useUtils();
  const createFoodLog = trpc.foodLog.create.useMutation();
  const validateImage = trpc.foodLog.validateImage.useMutation();
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

  // Capture photo and immediately validate with AI Vision
  const capturePhoto = useCallback(async () => {
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

    // AI Vision Validation - check if it's food/drink
    setValidationState("validating");
    setValidationReason("");
    try {
      const base64 = dataUrl.split(",")[1];
      const result = await validateImage.mutateAsync({
        imageBase64: base64,
        mimeType: "image/jpeg",
      });

      if (!result.aiAvailable) {
        toast.warning("AI đang lỗi tạm thời, vẫn cho phép đăng ảnh", {
          description: result.reason,
          duration: 4500,
        });
      }

      if (result.isFood) {
        setValidationState("valid");
        setValidationReason(result.reason);
      } else {
        setValidationState("invalid");
        setValidationReason(result.reason || "Ảnh không chứa đồ ăn hoặc nước uống");
        toast.error("Chỉ được phép đăng ảnh đồ ăn/nước uống!", {
          description: result.reason,
          duration: 5000,
        });
      }
    } catch (err) {
      // If validation API fails, allow upload (fail-open)
      setValidationState("valid");
      setValidationReason("Không thể xác minh, cho phép đăng");
    }
  }, [validateImage]);

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

  // Reset captured image
  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setCaption("");
    setRating(null);
    setValidationState("idle");
    setValidationReason("");
  }, []);

  // Submit food log - only if validated as food
  const handleSubmit = useCallback(async () => {
    if (!capturedImage) return;

    // Double-check: block if validation says it's not food
    if (validationState === "invalid") {
      toast.error("Chỉ được phép đăng ảnh đồ ăn/nước uống!");
      return;
    }

    const base64 = capturedImage.split(",")[1];
    try {
      const result = await createFoodLog.mutateAsync({
        imageBase64: base64,
        mimeType: "image/jpeg",
        voiceNote: voiceNote || undefined,
        caption: caption || undefined,
        rating: rating || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      });
      if (!result.aiValidationAvailable || !result.aiAnalysisAvailable) {
        toast.warning("Đã lưu food log nhưng AI chưa phân tích được", {
          description: "Kiểm tra OPENAI_API_KEY / OPENAI_MODEL hoặc log server [AI]",
          duration: 5000,
        });
      } else {
        toast.success(result.analysis?.dishNameVi ? `Đã lưu: ${result.analysis.dishNameVi}` : "Đã lưu food log!");
      }
      // Invalidate feed & profile so they show the new food log immediately
      utils.foodLog.feed.invalidate();
      utils.foodLog.myLogs.invalidate();
      utils.profile.get.invalidate();
      navigate("/feed");
    } catch (err: any) {
      // Handle server-side validation error
      const message = err?.message || "";
      if (message.includes("đồ ăn") || message.includes("nước uống")) {
        toast.error("Chỉ được phép đăng ảnh đồ ăn/nước uống!");
        setValidationState("invalid");
      } else {
        toast.error("Không thể lưu food log");
      }
    }
  }, [capturedImage, voiceNote, caption, rating, latitude, longitude, createFoodLog, navigate, validationState]);

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
          <>
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            
            {/* Validation overlay */}
            {validationState === "validating" && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                {/* Scanner animation */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="scanner-line" />
                </div>
                
                {/* Loading content */}
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-terracotta/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <p className="text-white text-lg font-medium">AI đang kiểm tra...</p>
                  <p className="text-white/60 text-sm mt-1">Xác nhận đây là ảnh đồ ăn/nước uống</p>
                </div>
              </div>
            )}

            {/* Validation result badge */}
            {validationState === "valid" && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                <div className="bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-sm font-medium">Đồ ăn/Nước uống</span>
                </div>
              </div>
            )}

            {validationState === "invalid" && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                <div className="text-center px-6">
                  <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="w-10 h-10 text-destructive" />
                  </div>
                  <p className="text-white text-xl font-bold mb-2">Không phải đồ ăn!</p>
                  <p className="text-white/70 text-sm mb-1">
                    Chỉ được phép đăng ảnh đồ ăn/nước uống!
                  </p>
                  {validationReason && (
                    <p className="text-white/50 text-xs">{validationReason}</p>
                  )}
                  <Button
                    className="mt-6 bg-white text-black hover:bg-white/90"
                    onClick={handleRetake}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Chụp lại
                  </Button>
                </div>
              </div>
            )}
          </>
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
            {/* Voice note display */}
            {voiceNote && (
              <p className="text-white/70 text-sm text-center italic">"{voiceNote}"</p>
            )}
            {transcribeMutation.isPending && (
              <p className="text-white/50 text-sm text-center flex items-center justify-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Đang nhận diện giọng nói...
              </p>
            )}

            {/* Caption input */}
            <div className="space-y-1">
              <label className="text-white/80 text-sm font-medium">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Nhập caption cho bức ảnh..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-terracotta/50 resize-none"
                rows={2}
              />
            </div>

            {/* Rating selector */}
            <div className="space-y-1">
              <label className="text-white/80 text-sm font-medium">Đánh giá</label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star === rating ? null : star)}
                    className="text-2xl transition-transform hover:scale-110"
                  >
                    {star <= (rating || 0) ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
              {rating && (
                <p className="text-white/50 text-xs text-center">
                  {rating === 1 ? "Rất tệ" : rating === 2 ? "Tệ" : rating === 3 ? "Bình thường" : rating === 4 ? "Ngon" : "Rất ngon"}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/30 text-white bg-transparent hover:bg-white/10"
                onClick={handleRetake}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Chụp lại
              </Button>
              <Button
                className="flex-1 bg-terracotta hover:bg-terracotta-dark text-white"
                onClick={handleSubmit}
                disabled={
                  createFoodLog.isPending ||
                  validationState === "validating" ||
                  validationState === "invalid"
                }
              >
                {createFoodLog.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : validationState === "validating" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                {createFoodLog.isPending
                  ? "Đang phân tích..."
                  : validationState === "validating"
                  ? "Đang kiểm tra..."
                  : validationState === "invalid"
                  ? "Không hợp lệ"
                  : "Lưu"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
