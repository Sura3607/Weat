import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Zap, UserCheck, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useMemo } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: { latitude: number; longitude: number } | null;
  userId: number | undefined;
  ws: any;
};

export default function RadarSheet({ open, onOpenChange, position, userId, ws }: Props) {
  const radarInput = useMemo(() => {
    if (!position) return null;
    return { latitude: position.latitude, longitude: position.longitude };
  }, [position?.latitude, position?.longitude]);

  const { data: nearbyUsers, isLoading, refetch } = trpc.location.radar.useQuery(
    radarInput!,
    { enabled: open && !!radarInput }
  );

  const inviteMutation = trpc.match.invite.useMutation({
    onSuccess: (data) => {
      toast.success("Đã gửi lời mời ăn cùng!");
      // Send WebSocket notification to the receiver
      if (ws) {
        ws.send({ type: "invite_sent", inviteId: data.inviteId });
      }
    },
    onError: () => {
      toast.error("Không thể gửi lời mời. Thử lại nhé!");
    },
  });

  const handleInvite = (targetUserId: number) => {
    inviteMutation.mutate({ receiverId: targetUserId });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] bg-cream">
        <DrawerHeader className="flex flex-row items-center justify-between">
          <DrawerTitle className="font-display text-xl text-foreground flex items-center gap-2">
            <div className="relative">
              <div className="w-3 h-3 bg-sage rounded-full" />
              <div className="absolute inset-0 w-3 h-3 bg-sage rounded-full animate-pulse-ring" />
            </div>
            Radar - Bạn ăn gần đây
          </DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-terracotta">
            Quét lại
          </Button>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-6">
          {!position ? (
            <div className="text-center py-12">
              <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Cần bật GPS để quét radar</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-terracotta animate-spin" />
            </div>
          ) : !nearbyUsers || nearbyUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Không tìm thấy ai gần đây</p>
              <p className="text-xs text-muted-foreground mt-1">Thử mở rộng phạm vi hoặc quay lại sau</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyUsers.map((u: any) => (
                <div
                  key={u.id}
                  className="bg-card rounded-2xl p-4 border border-border flex items-center gap-3"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-terracotta/10 flex items-center justify-center shrink-0">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <span className="text-terracotta font-bold text-lg">
                        {(u.name || "?")[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">{u.name || "Anonymous"}</span>
                      {u.isFriend && (
                        <span className="text-xs bg-sage/20 text-sage px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <UserCheck className="w-3 h-3" /> Bạn bè
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        Cách {u.distanceM}m
                      </span>
                      {u.compatibility > 0 && (
                        <span className="text-xs text-terracotta font-medium">
                          Gu {u.compatibility}% khớp
                        </span>
                      )}
                    </div>
                    {u.currentCraving && (
                      <p className="text-xs text-ochre mt-1 truncate">
                        Đang thèm: {u.currentCraving}
                      </p>
                    )}
                  </div>

                  {/* Invite button */}
                  <Button
                    size="sm"
                    onClick={() => handleInvite(u.id)}
                    disabled={inviteMutation.isPending}
                    className="bg-terracotta hover:bg-terracotta/90 text-white rounded-full px-3 shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5 mr-1" />
                    Rủ ăn!
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
