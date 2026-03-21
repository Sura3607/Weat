import { Utensils } from "lucide-react";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Show splash for 1.5 seconds with bounce effect
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500); // Wait for fade out
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex flex-col items-center">
        {/* Logo */}
        <div
          className={`w-24 h-24 rounded-3xl bg-terracotta flex items-center justify-center shadow-2xl transition-transform duration-700 ${
            visible ? "scale-100" : "scale-90"
          }`}
          style={{
            animation: visible ? "bounce 1s ease-in-out" : "none",
          }}
        >
          <Utensils className="w-12 h-12 text-white" />
        </div>

        {/* App Name */}
        <h1
          className={`mt-6 text-4xl font-bold text-white tracking-widest transition-opacity duration-500 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          WEAT
        </h1>

        {/* Tagline */}
        <p
          className={`mt-2 text-sm text-white/60 transition-opacity duration-500 delay-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          Discover food together
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
