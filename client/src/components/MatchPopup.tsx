import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Utensils, MapPin, Sparkles } from "lucide-react";

interface MatchPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user1: {
    name: string;
    avatarUrl?: string;
  };
  user2: {
    name: string;
    avatarUrl?: string;
  };
  onGetDirections: () => void;
}

export default function MatchPopup({
  open,
  onOpenChange,
  user1,
  user2,
  onGetDirections,
}: MatchPopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-gradient-to-br from-terracotta via-terracotta-light to-ochre">
        {/* Confetti animation background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF85A2"][
                  Math.floor(Math.random() * 5)
                ],
              }}
            />
          ))}
        </div>

        <div className="relative p-8 text-center">
          {/* MATCH text */}
          <h2 className="text-4xl font-black text-white mb-2 drop-shadow-lg">
            MATCH! 🎉
          </h2>
          <p className="text-white/90 text-sm mb-8">
            Bạn và {user2.name} muốn ăn cùng!
          </p>

          {/* Avatars connection */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Avatar className="w-20 h-20 border-4 border-white shadow-xl">
              <AvatarImage src={user1.avatarUrl} />
              <AvatarFallback className="bg-white/20 text-white text-xl">
                {user1.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center">
              <Utensils className="w-6 h-6 text-white" />
            </div>

            <Avatar className="w-20 h-20 border-4 border-white shadow-xl">
              <AvatarImage src={user2.avatarUrl} />
              <AvatarFallback className="bg-white/20 text-white text-xl">
                {user2.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Suggestion cards */}
          <div className="space-y-3 mb-8">
            <p className="text-white/90 text-sm font-medium">Quán ăn gợi ý:</p>
            <Card className="bg-white/20 backdrop-blur-sm border-white/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold">Quán Bún Bò Huế</p>
                    <p className="text-white/80 text-xs">150m • 4.5 ⭐</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full bg-white text-terracotta hover:bg-white/90 py-6 rounded-2xl text-base font-semibold shadow-lg"
              onClick={onGetDirections}
            >
              <MapPin className="w-5 h-5 mr-2" />
              Chỉ đường
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full border-2 border-white text-white hover:bg-white/20 py-6 rounded-2xl text-base"
              onClick={() => onOpenChange(false)}
            >
              Để sau
            </Button>
          </div>
        </div>

        <style>{`
          @keyframes confetti-fall {
            0% {
              transform: translateY(-100%) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(500px) rotate(720deg);
              opacity: 0;
            }
          }
          .confetti {
            position: absolute;
            top: -20px;
            width: 10px;
            height: 10px;
            animation: confetti-fall 3s linear infinite;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
