import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Flame, MapPin } from "lucide-react";

export default function FeedPage() {
  const { user } = useAuth();
  const { data: logs, isLoading } = trpc.foodLog.feed.useQuery({ limit: 50, offset: 0 });

  return (
    <div className="page-enter pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold text-foreground">Feed</h1>
        <p className="text-xs text-muted-foreground">Khám phá món ăn từ mọi người</p>
      </div>

      {/* Feed list */}
      <div className="p-4 space-y-4">
        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full aspect-square" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </Card>
            ))}
          </>
        )}

        {logs && logs.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">Chưa có food log nào</p>
            <p className="text-muted-foreground text-sm mt-1">Hãy chụp ảnh món ăn đầu tiên!</p>
          </div>
        )}

        {logs?.map((log) => (
          <Card key={log.id} className="overflow-hidden bg-card border-border/50 shadow-sm">
            {/* User info */}
            <div className="flex items-center gap-3 p-3 pb-0">
              <Avatar className="w-8 h-8">
                <AvatarImage src={log.userAvatar || undefined} />
                <AvatarFallback className="bg-terracotta/20 text-terracotta text-xs">
                  {(log.userName || "?")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{log.userName || "Người dùng"}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: vi })}
                </p>
              </div>
              {log.calories && (
                <div className="flex items-center gap-1 text-xs text-ochre font-medium">
                  <Flame className="w-3.5 h-3.5" />
                  {log.calories} cal
                </div>
              )}
            </div>

            {/* Food image */}
            <div className="mt-2">
              <img
                src={log.imageUrl}
                alt={log.dishName || "Food"}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
            </div>

            {/* Info */}
            <div className="p-3 space-y-2">
              <div>
                <h3 className="font-semibold text-base">
                  {log.dishNameVi || log.dishName || "Món ăn"}
                </h3>
                {log.dishNameVi && log.dishName && (
                  <p className="text-xs text-muted-foreground">{log.dishName}</p>
                )}
              </div>

              {log.locationName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {log.locationName}
                </div>
              )}

              {/* Tags */}
              {(() => {
                const tags = log.tags as string[] | null;
                if (!tags || !Array.isArray(tags) || tags.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.slice(0, 5).map((tag: string, i: number) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5 bg-sage-light text-sage-dark border-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                );
              })()}

              {log.voiceNote && (
                <p className="text-xs text-muted-foreground italic">"{log.voiceNote}"</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
