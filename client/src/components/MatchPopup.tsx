import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { MapPin, Navigation, Star, Loader2 } from "lucide-react";
import { useMemo, useEffect, useState } from "react";

type Props = {
  data: any;
  onClose: () => void;
  position: { latitude: number; longitude: number } | null;
};

function Fireworks() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: ["#C2703E", "#D4A855", "#7A9B6D", "#E8C07A", "#B85C3A"][Math.floor(Math.random() * 5)],
    delay: Math.random() * 0.5,
    size: 4 + Math.random() * 8,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float-up"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function MatchPopup({ data, onClose, position }: Props) {
  const [showFireworks, setShowFireworks] = useState(true);

  const venueInput = useMemo(() => {
    if (!position) return null;
    return {
      latitude: position.latitude,
      longitude: position.longitude,
      query: data?.craving || "restaurant",
    };
  }, [position?.latitude, position?.longitude, data?.craving]);

  const { data: venues, isLoading: venuesLoading } = trpc.venues.suggest.useQuery(
    venueInput!,
    { enabled: !!venueInput }
  );

  useEffect(() => {
    const timer = setTimeout(() => setShowFireworks(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const openGoogleMaps = (lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="bg-cream border-none rounded-3xl max-w-sm mx-auto overflow-hidden p-0">
        {showFireworks && <Fireworks />}

        <div className="relative p-6 text-center">
          {/* Match header */}
          <div className="mb-6">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="font-display text-3xl font-bold text-terracotta">MATCH!</h2>
            <p className="text-muted-foreground mt-2">
              {data?.senderName || "Ai đó"} muốn đi ăn{" "}
              <span className="text-terracotta font-semibold">{data?.craving || "cùng bạn"}</span>!
            </p>
          </div>

          {/* Venue suggestions */}
          <div className="text-left space-y-2 mb-4">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <Star className="w-4 h-4 text-ochre" />
              Quán gợi ý gần đây
            </h3>
            {venuesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-terracotta animate-spin" />
              </div>
            ) : venues && venues.length > 0 ? (
              <div className="space-y-2">
                {venues.slice(0, 3).map((v: any, i: number) => (
                  <div
                    key={i}
                    className="bg-card rounded-xl p-3 border border-border flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{v.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.address}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {v.rating && (
                          <span className="text-xs text-ochre flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-current" /> {v.rating}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => openGoogleMaps(v.lat, v.lng, v.name)}
                      className="w-9 h-9 rounded-full bg-sage/20 flex items-center justify-center shrink-0"
                    >
                      <Navigation className="w-4 h-4 text-sage" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">Không tìm thấy quán gần đây</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 rounded-xl border-border"
            >
              Đóng
            </Button>
            {venues && venues.length > 0 && (
              <Button
                onClick={() => {
                  const v = venues[0];
                  openGoogleMaps(v.lat, v.lng, v.name);
                }}
                className="flex-1 bg-terracotta hover:bg-terracotta/90 text-white rounded-xl"
              >
                <MapPin className="w-4 h-4 mr-1" />
                Dẫn đường
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
