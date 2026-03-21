import { Button } from "@/components/ui/button";
import { Camera, MapPin, X } from "lucide-react";
import { useState } from "react";

interface PermissionsOverlayProps {
  onComplete: (granted: boolean) => void;
}

export default function PermissionsOverlay({ onComplete }: PermissionsOverlayProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setCameraGranted(true);
    } catch (err) {
      console.error("Camera permission denied:", err);
    }
  };

  const requestLocation = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      console.log("Location granted:", position);
      setLocationGranted(true);
    } catch (err) {
      console.error("Location permission denied:", err);
    }
  };

  const handleContinue = async () => {
    if (step === 1) {
      await requestCamera();
      setStep(2);
    } else {
      await requestLocation();
      onComplete(cameraGranted && locationGranted);
    }
  };

  const handleSkip = () => {
    onComplete(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-background rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-border">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-terracotta/10 flex items-center justify-center mx-auto mb-6">
          {step === 1 ? (
            <Camera className="w-8 h-8 text-terracotta" />
          ) : (
            <MapPin className="w-8 h-8 text-terracotta" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2">
          {step === 1 ? "Truy cập Camera" : "Truy cập Vị trí"}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground text-center mb-8 leading-relaxed">
          {step === 1
            ? "WEAT cần camera để chụp ảnh món ăn và phân tích bằng AI"
            : "WEAT cần vị trí để tìm bạn ăn gần bạn và gợi ý quán ăn"}
        </p>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className={`w-3 h-3 rounded-full transition-colors ${
              step === 1 ? "bg-terracotta" : cameraGranted ? "bg-green-500" : "bg-gray-300"
            }`}
          />
          <div
            className={`w-3 h-3 rounded-full transition-colors ${
              step === 2 ? "bg-terracotta" : locationGranted ? "bg-green-500" : "bg-gray-300"
            }`}
          />
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full bg-terracotta hover:bg-terracotta-dark text-white py-6 rounded-2xl"
            onClick={handleContinue}
          >
            {step === 1 ? "Cho phép Camera" : "Cho phép Vị trí"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full border-border text-muted-foreground py-6 rounded-2xl"
            onClick={handleSkip}
          >
            Để sau
          </Button>
        </div>

        {/* Warning */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Bạn có thể bật quyền này sau trong Cài đặt
        </p>
      </div>
    </div>
  );
}
