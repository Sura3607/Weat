import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function FeedSheet({ open, onOpenChange }: Props) {
  const { data: feed, isLoading } = trpc.food.feed.useQuery(undefined, { enabled: open });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] bg-cream">
        <DrawerHeader>
          <DrawerTitle className="font-display text-xl text-foreground">
            Bản tin Đồ ăn
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-terracotta animate-spin" />
            </div>
          ) : !feed || feed.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chưa có bài viết nào. Hãy chụp ảnh món ăn đầu tiên!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feed.map((item: any) => (
                <div key={item.id} className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
                  <div className="aspect-[4/3] relative">
                    <img
                      src={item.imageUrl}
                      alt={item.dishNameVi || item.dishName || "Food"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {/* Dish info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-white font-semibold text-lg leading-tight">
                        {item.dishNameVi || item.dishName || "Món ăn"}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-white/80 text-xs">
                          {item.userName || "Anonymous"}
                        </span>
                        <span className="text-white/50 text-xs">
                          {item.createdAt
                            ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Tags */}
                  {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
                    <div className="px-3 py-2 flex flex-wrap gap-1.5">
                      {(item.tags as string[]).slice(0, 4).map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded-full bg-terracotta/10 text-terracotta font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.calories && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sage/20 text-sage font-medium">
                          {item.calories} cal
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
