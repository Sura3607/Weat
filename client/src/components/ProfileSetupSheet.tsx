import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Utensils } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProfileSetupSheetProps {
  onComplete: (username: string) => void;
}

export default function ProfileSetupSheet({ onComplete }: ProfileSetupSheetProps) {
  const [username, setUsername] = useState("");

  const handleSubmit = () => {
    if (!username.trim()) {
      toast.error("Vui lòng nhập tên người dùng");
      return;
    }

    // Store locally, will be synced when user creates first food log
    localStorage.setItem("weat-username", username.trim());
    toast.success("Đã lưu tên người dùng!");
    onComplete(username.trim());
  };

  const handleSkip = () => {
    onComplete("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-background rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-slide-up">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-terracotta/10 flex items-center justify-center mx-auto mb-6">
          <Utensils className="w-8 h-8 text-terracotta" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2">
          Hoàn thiện hồ sơ
        </h2>

        {/* Description */}
        <p className="text-muted-foreground text-center mb-8">
          Chọn tên người dùng để bạn bè có thể nhận ra bạn
        </p>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              Tên người dùng
            </Label>
            <Input
              id="username"
              placeholder="VD: HungAnUong"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 rounded-xl"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              Tên hiển thị công khai trên WEAT
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              size="lg"
              className="w-full bg-terracotta hover:bg-terracotta-dark text-white py-6 rounded-2xl"
              onClick={handleSubmit}
            >
              Tiếp tục
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
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
