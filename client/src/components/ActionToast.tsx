import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Utensils } from "lucide-react";

interface ActionToastProps {
  visible: boolean;
  senderName: string;
  senderAvatar?: string;
  craving: string;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export default function ActionToast({
  visible,
  senderName,
  senderAvatar,
  craving,
  onAccept,
  onReject,
  onClose,
}: ActionToastProps) {
  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md animate-slide-down">
      <div className="bg-background border border-border shadow-2xl rounded-2xl p-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={senderAvatar} />
            <AvatarFallback className="bg-terracotta/20 text-terracotta">
              {senderName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 pr-6">
            <p className="text-sm font-medium">
              <span className="text-foreground">{senderName}</span>
              <span className="text-muted-foreground"> vừa rủ bạn đi ăn</span>
            </p>
            <p className="text-lg font-bold text-terracotta mt-1">
              {craving} 🤤
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1 bg-terracotta hover:bg-terracotta-dark text-white h-10 rounded-xl"
                onClick={onAccept}
              >
                <Utensils className="w-4 h-4 mr-1" />
                Let's Go!
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-10 rounded-xl"
                onClick={onReject}
              >
                Pass
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
