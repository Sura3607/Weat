import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import type { FoodDna } from "@shared/types";
import { Camera, Heart, Loader2, MapPin, Send, UserCheck, Users, UtensilsCrossed, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number | null;
};

export default function UserProfileSheet({ open, onOpenChange, userId }: Props) {
  const { data, isLoading } = trpc.profile.getById.useQuery(
    { userId: userId! },
    { enabled: open && userId !== null }
  );

  const foodDna = data?.foodDna as FoodDna | null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="max-h-[85vh] bg-background">
        <DrawerHeader className="flex items-center justify-between pb-2">
          <DrawerTitle className="font-display text-lg">Hồ sơ người dùng</DrawerTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-6 overflow-y-auto" style={{ maxHeight: "calc(85vh - 60px)" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-terracotta animate-spin" />
            </div>
          ) : !data ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Không tìm thấy người dùng</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {/* User info header */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={data.avatarUrl || undefined} />
                  <AvatarFallback className="bg-terracotta/20 text-terracotta text-xl">
                    {(data.name || "?")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{data.name || "Người dùng"}</h2>
                    {data.isFriend && (
                      <Badge className="bg-sage/20 text-sage border-0 text-[10px]">
                        <UserCheck className="w-3 h-3 mr-0.5" />
                        Bạn bè
                      </Badge>
                    )}
                  </div>
                  {data.bio && <p className="text-sm text-muted-foreground mt-0.5">{data.bio}</p>}
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1 text-sm">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-terracotta" />
                      <span className="font-semibold">{data.foodLogCount || 0}</span>
                      <span className="text-muted-foreground text-xs">logs</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="w-3.5 h-3.5 text-sage" />
                      <span className="font-semibold">{data.friendCount || 0}</span>
                      <span className="text-muted-foreground text-xs">bạn</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current craving */}
              {data.currentCraving && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-sm text-muted-foreground">Đang thèm:</span>
                  <Badge className="bg-ochre/20 text-ochre border-0">{data.currentCraving}</Badge>
                </div>
              )}

              {/* Radar status */}
              {data.isRadarActive && (
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-600">Đang hoạt động trên Radar</span>
                </div>
              )}

              {/* Food DNA */}
              {foodDna && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-lg">🧬</span> Food DNA
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Category breakdown */}
                    {foodDna.categories && Object.keys(foodDna.categories).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Phân loại bữa ăn</p>
                        <div className="space-y-1.5">
                          {Object.entries(foodDna.categories).map(([cat, weight]) => (
                            <div key={cat} className="flex items-center gap-2">
                              <span className="text-xs w-20 text-muted-foreground capitalize">{cat}</span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-terracotta rounded-full transition-all"
                                  style={{ width: `${(weight as number) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {Math.round((weight as number) * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top tags */}
                    {foodDna.topTags && foodDna.topTags.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Sở thích ẩm thực</p>
                        <div className="flex flex-wrap gap-1.5">
                          {foodDna.topTags.map((t) => (
                            <Badge key={t.tag} variant="secondary" className="text-xs bg-sage-light text-sage-dark border-0">
                              {t.tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex gap-4 pt-2 border-t border-border">
                      <div className="text-center">
                        <p className="text-lg font-bold text-terracotta">{foodDna.avgCalories}</p>
                        <p className="text-[10px] text-muted-foreground">cal trung bình</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-sage">{foodDna.totalLogs}</p>
                        <p className="text-[10px] text-muted-foreground">food logs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Food history */}
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                  <Camera className="w-4 h-4 text-ochre" />
                  Lịch sử món ăn
                </h3>
                {!data.foodLogs || data.foodLogs.length === 0 ? (
                  <div className="text-center py-6 bg-card rounded-2xl border border-border">
                    <UtensilsCrossed className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Chưa có món ăn nào</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {data.foodLogs.map((log) => (
                      <div key={log.id} className="aspect-square rounded-xl overflow-hidden relative">
                        <img
                          src={log.imageUrl}
                          alt={log.dishNameVi || log.dishName || ""}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-1">
                          <p className="text-white text-[10px] leading-tight truncate">
                            {log.dishNameVi || log.dishName || "Món ăn"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Member since */}
              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  Tham gia {formatDistanceToNow(new Date(data.createdAt), { addSuffix: true, locale: vi })}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
