import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Camera, Heart, Utensils } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ProfileSheet({ open, onOpenChange }: Props) {
  const { user, logout } = useAuth();
  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery(undefined, { enabled: open });
  const { data: foodLogs, isLoading: logsLoading } = trpc.food.myLogs.useQuery(undefined, { enabled: open });

  const foodDna = profile?.foodDna as any;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="max-w-sm ml-auto h-full bg-cream">
        <DrawerHeader>
          <DrawerTitle className="font-display text-xl">Hồ sơ</DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-6">
          {profileLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-terracotta animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* User info */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-terracotta/10 flex items-center justify-center mx-auto mb-3">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <span className="text-terracotta font-display text-2xl font-bold">
                      {(profile?.name || user?.name || "?")[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <h2 className="font-semibold text-lg">{profile?.name || user?.name || "Anonymous"}</h2>
                {profile?.bio && <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>}

                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="text-center">
                    <p className="font-bold text-lg text-terracotta">{profile?.foodLogCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Món ăn</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg text-sage">{profile?.friendCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Bạn bè</p>
                  </div>
                </div>
              </div>

              {/* Food DNA */}
              {foodDna && (
                <div className="bg-card rounded-2xl p-4 border border-border">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                    <Heart className="w-4 h-4 text-terracotta" />
                    Food DNA
                  </h3>
                  {foodDna.dietaryStyle && (
                    <p className="text-sm text-muted-foreground mb-3">{foodDna.dietaryStyle}</p>
                  )}
                  {foodDna.topTags && foodDna.topTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {foodDna.topTags.map((tag: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-terracotta/10 text-terracotta">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {foodDna.healthScore && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Sức khỏe:</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sage rounded-full transition-all"
                          style={{ width: `${foodDna.healthScore * 10}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-sage">{foodDna.healthScore}/10</span>
                    </div>
                  )}
                </div>
              )}

              {/* Food history */}
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                  <Camera className="w-4 h-4 text-ochre" />
                  Lịch sử món ăn
                </h3>
                {logsLoading ? (
                  <Loader2 className="w-5 h-5 text-terracotta animate-spin mx-auto" />
                ) : !foodLogs || foodLogs.length === 0 ? (
                  <div className="text-center py-6 bg-card rounded-2xl border border-border">
                    <Utensils className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Chưa có món ăn nào</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {foodLogs.map((log: any) => (
                      <div key={log.id} className="aspect-square rounded-xl overflow-hidden relative">
                        <img src={log.imageUrl} alt={log.dishNameVi || ""} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-1">
                          <p className="text-white text-[10px] leading-tight truncate">{log.dishNameVi || log.dishName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logout */}
              <Button
                variant="outline"
                onClick={() => { logout(); onOpenChange(false); }}
                className="w-full rounded-xl border-border text-muted-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
