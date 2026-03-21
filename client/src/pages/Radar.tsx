import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGeolocation } from "@/hooks/useGeolocation";
import { trpc } from "@/lib/trpc";
import { Loader2, MapPin, MessageCircle, Radio, Send, UserCheck, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import UserProfileSheet from "@/components/UserProfileSheet";
import ChatSheet from "@/components/ChatSheet";
import CravingDialog from "@/components/CravingDialog";

export default function RadarPage() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { latitude, longitude, requestLocation, loading: geoLoading, error: geoError } = useGeolocation();

  const updateLocation = trpc.radar.updateLocation.useMutation();
  const toggleActive = trpc.radar.toggleActive.useMutation();
  const sendInvite = trpc.match.sendInvite.useMutation();

  const [isActive, setIsActive] = useState<boolean>(false);

  // Profile sheet state
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Chat sheet state
  const [chatUserId, setChatUserId] = useState<number | null>(null);
  const [chatUserName, setChatUserName] = useState<string | null>(null);
  const [chatUserAvatar, setChatUserAvatar] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Craving dialog state
  const [cravingOpen, setCravingOpen] = useState(false);

  const locationReady = latitude !== null && longitude !== null;

  const { data: nearbyUsers, isLoading: nearbyLoading, refetch } = trpc.radar.nearby.useQuery(
    { latitude: latitude!, longitude: longitude! },
    { enabled: locationReady && isActive, refetchInterval: 15000 }
  );

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  // Update server location when we get it
  useEffect(() => {
    if (locationReady && user) {
      updateLocation.mutate({ latitude: latitude!, longitude: longitude! });
    }
  }, [latitude, longitude, user]);

  const handleToggleRadar = async () => {
    const newState = !isActive;
    setIsActive(newState);
    await toggleActive.mutateAsync({ active: newState });
    if (newState) {
      requestLocation();
      toast.success("Radar đã bật - đang tìm người gần bạn");
      // Prompt to set craving if not set
      if (!user?.currentCraving) {
        setCravingOpen(true);
      }
    } else {
      toast.info("Radar đã tắt");
    }
  };

  const handleSendInvite = async (receiverId: number) => {
    try {
      await sendInvite.mutateAsync({ receiverId, craving: user?.currentCraving || undefined });
      toast.success("Đã gửi lời mời ăn cùng!");
    } catch {
      toast.error("Không thể gửi lời mời");
    }
  };

  // For friends: skip match, open chat directly
  const handleInviteFriend = (userId: number, userName: string | null, userAvatar: string | null) => {
    setChatUserId(userId);
    setChatUserName(userName);
    setChatUserAvatar(userAvatar);
    setChatOpen(true);
  };

  const handleOpenProfile = (userId: number) => {
    setProfileUserId(userId);
    setProfileOpen(true);
  };

  if (authLoading) {
    return (
      <div className="app-shell flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
      </div>
    );
  }

  return (
    <div className="page-enter pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Radar</h1>
            <p className="text-xs text-muted-foreground">Tìm bạn ăn gần bạn</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-ochre border-ochre/30"
              onClick={() => setCravingOpen(true)}
            >
              <Utensils className="w-3.5 h-3.5 mr-1" />
              {user?.currentCraving || "Thèm gì?"}
            </Button>
            <Button
              size="sm"
              variant={isActive ? "default" : "outline"}
              className={isActive ? "bg-terracotta hover:bg-terracotta-dark" : ""}
              onClick={handleToggleRadar}
            >
              <Radio className="w-4 h-4 mr-1" />
              {isActive ? "Đang bật" : "Bật radar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Radar visualization */}
        <div className="relative w-full aspect-square max-w-[320px] mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-terracotta/20 bg-cream-dark/50" />
          <div className="absolute inset-[15%] rounded-full border border-terracotta/15" />
          <div className="absolute inset-[30%] rounded-full border border-terracotta/10" />
          <div className="absolute inset-[45%] rounded-full border border-terracotta/5" />

          {/* Center - You */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-10 h-10 rounded-full bg-terracotta flex items-center justify-center shadow-lg">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            {isActive && <div className="absolute inset-0 rounded-full bg-terracotta/30 radar-ping" />}
          </div>

          {/* Nearby users dots */}
          {nearbyUsers?.map((u, i) => {
            const angle = (i / Math.max(nearbyUsers.length, 1)) * 2 * Math.PI - Math.PI / 2;
            const dist = Math.min((u.distance / 0.2) * 0.4, 0.45);
            const x = 50 + dist * 100 * Math.cos(angle);
            const y = 50 + dist * 100 * Math.sin(angle);

            return (
              <button
                key={u.id}
                className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 transition-all"
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => handleOpenProfile(u.id)}
              >
                <Avatar className="w-8 h-8 border-2 border-white shadow-md">
                  <AvatarImage src={u.avatarUrl || undefined} />
                  <AvatarFallback className="bg-sage text-white text-xs">
                    {(u.name || "?")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            );
          })}
        </div>

        {/* Status */}
        {!isActive && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Bật radar để tìm người gần bạn muốn ăn cùng</p>
          </div>
        )}

        {isActive && geoLoading && (
          <div className="text-center py-4 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang xác định vị trí...
          </div>
        )}

        {isActive && geoError && (
          <div className="text-center py-4">
            <p className="text-destructive text-sm">Không thể xác định vị trí: {geoError}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={requestLocation}>
              Thử lại
            </Button>
          </div>
        )}

        {/* Nearby users list */}
        {isActive && nearbyUsers && nearbyUsers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {nearbyUsers.length} người gần bạn
            </h2>
            {nearbyUsers.map((u) => {
              // Check if this user is a friend (we use foodDnaCompatibility > 0 as proxy,
              // but ideally we'd have isFriend from backend. We'll use profile.getById for that)
              return (
                <NearbyUserCard
                  key={u.id}
                  user={u}
                  currentUserId={user?.id || 0}
                  onOpenProfile={() => handleOpenProfile(u.id)}
                  onSendInvite={() => handleSendInvite(u.id)}
                  onInviteFriend={() => handleInviteFriend(u.id, u.name, u.avatarUrl)}
                  sendInvitePending={sendInvite.isPending}
                />
              );
            })}
          </div>
        )}

        {isActive && nearbyUsers && nearbyUsers.length === 0 && !nearbyLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Chưa tìm thấy ai gần bạn</p>
            <p className="text-xs text-muted-foreground mt-1">Hãy thử lại sau hoặc mở rộng phạm vi</p>
          </div>
        )}
      </div>

      {/* Craving Dialog */}
      <CravingDialog open={cravingOpen} onOpenChange={setCravingOpen} />

      {/* User Profile Sheet */}
      <UserProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        userId={profileUserId}
      />

      {/* Chat Sheet */}
      <ChatSheet
        open={chatOpen}
        onOpenChange={setChatOpen}
        otherUserId={chatUserId}
        otherUserName={chatUserName}
        otherUserAvatar={chatUserAvatar}
      />
    </div>
  );
}

// Sub-component for nearby user card with friend detection
function NearbyUserCard({
  user: u,
  currentUserId,
  onOpenProfile,
  onSendInvite,
  onInviteFriend,
  sendInvitePending,
}: {
  user: any;
  currentUserId: number;
  onOpenProfile: () => void;
  onSendInvite: () => void;
  onInviteFriend: () => void;
  sendInvitePending: boolean;
}) {
  // Check friendship status
  const { data: profileData } = trpc.profile.getById.useQuery(
    { userId: u.id },
    { enabled: true, staleTime: 60000 }
  );

  const isFriend = profileData?.isFriend ?? false;

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <button onClick={onOpenProfile} className="shrink-0 cursor-pointer">
          <Avatar className="w-10 h-10">
            <AvatarImage src={u.avatarUrl || undefined} />
            <AvatarFallback className="bg-terracotta/20 text-terracotta">
              {(u.name || "?")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenProfile}
              className="font-medium text-sm truncate hover:underline cursor-pointer text-left"
            >
              {u.name || "Người dùng"}
            </button>
            {isFriend && (
              <Badge className="bg-sage/20 text-sage border-0 text-[10px] px-1.5 py-0">
                <UserCheck className="w-2.5 h-2.5 mr-0.5" />
                Bạn bè
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {Math.round(u.distance * 1000)}m
            </span>
            {u.foodDnaCompatibility > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-sage-light text-sage-dark border-0">
                {u.foodDnaCompatibility}% match
              </Badge>
            )}
          </div>
          {u.currentCraving && (
            <p className="text-xs text-ochre mt-0.5">Đang thèm: {u.currentCraving}</p>
          )}
        </div>

        {/* Action button: "Rủ" for friends (opens chat), "Send invite" for strangers */}
        {isFriend ? (
          <Button
            size="sm"
            className="bg-sage hover:bg-sage/80 text-white"
            onClick={onInviteFriend}
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1" />
            Rủ
          </Button>
        ) : (
          <Button
            size="sm"
            className="bg-terracotta hover:bg-terracotta-dark text-white"
            onClick={onSendInvite}
            disabled={sendInvitePending}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
}
