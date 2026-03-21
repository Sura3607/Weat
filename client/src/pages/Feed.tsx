import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Flame, MapPin, MessageCircle, SmilePlus, Trash2 } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import UserProfileSheet from "@/components/UserProfileSheet";
import ChatSheet from "@/components/ChatSheet";
import { toast } from "sonner";

// 3 reactions: ngon, binh thuong, do
const EMOJI_LIST = [
  { emoji: "😋", label: "Ngon" },
  { emoji: "😐", label: "Bình thường" },
  { emoji: "🤢", label: "Dở" }
];

interface Reaction {
  id: number;
  userId: number;
  emoji: string;
  userName: string | null;
  userAvatar: string | null;
}

interface FoodLog {
  id: number;
  userId: number;
  userName: string | null;
  userAvatar: string | null;
  imageUrl: string;
  dishName: string | null;
  dishNameVi: string | null;
  locationName: string | null;
  calories: number | null;
  tags: string[] | null;
  voiceNote: string | null;
  createdAt: Date;
}

// Mock data for feed when no real data is available
const MOCK_LOGS: FoodLog[] = [
  {
    id: 101,
    userId: 201,
    userName: "Minh Anh",
    userAvatar: null,
    imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=600&fit=crop",
    dishName: "Curry",
    dishNameVi: "Cà ri",
    locationName: "Tokyo, Japan",
    calories: 450,
    tags: ["spicy", "japanese", "rice"],
    voiceNote: "Thơm ngon, cay vừa phải!",
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: 102,
    userId: 202,
    userName: "Hoàng Nam",
    userAvatar: null,
    imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=600&fit=crop",
    dishName: "Phở",
    dishNameVi: "Phở bò",
    locationName: "Hà Nội, Việt Nam",
    calories: 380,
    tags: ["vietnamese", "noodles", "soup"],
    voiceNote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: 103,
    userId: 203,
    userName: "Lan Phương",
    userAvatar: null,
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=600&fit=crop",
    dishName: "Pizza",
    dishNameVi: "Pizza Margherita",
    locationName: "Hồ Chí Minh, Việt Nam",
    calories: 620,
    tags: ["italian", "pizza", "cheese"],
    voiceNote: "Pizza nóng hổi vừa thổi vừa ăn!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
];

export default function FeedPage() {
  const { user } = useAuth();
  const { data: logs, isLoading, refetch } = trpc.foodLog.feed.useQuery({ limit: 50, offset: 0 });

  // Use mock data if no real data is available
  const displayLogs = logs && logs.length > 0 ? logs : MOCK_LOGS;

  // Profile sheet state
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Chat sheet state
  const [chatUserId, setChatUserId] = useState<number | null>(null);
  const [chatUserName, setChatUserName] = useState<string | null>(null);
  const [chatUserAvatar, setChatUserAvatar] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Delete confirmation state
  const [deleteLogId, setDeleteLogId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Reactions state: track reactions per post
  const [postReactions, setPostReactions] = useState<Record<number, Reaction[]>>({});

  const utils = trpc.useUtils();

  const addReaction = trpc.reaction.add.useMutation({
    onSuccess: (_, variables) => {
      // Optimistic update: add reaction to local state immediately
      setPostReactions((prev) => {
        const currentReactions = prev[variables.foodLogId] || [];
        // Remove existing reaction from this user if any
        const filteredReactions = currentReactions.filter((r) => r.userId !== user?.id);
        // Add new reaction
        const newReaction: Reaction = {
          id: Date.now(), // temporary id
          userId: user!.id,
          emoji: variables.emoji,
          userName: user?.name || null,
          userAvatar: user?.avatarUrl || null,
        };
        return {
          ...prev,
          [variables.foodLogId]: [...filteredReactions, newReaction],
        };
      });
      // Invalidate to refetch from server in background
      utils.reaction.getForPost.invalidate({ foodLogId: variables.foodLogId });
    },
  });

  const deleteMutation = trpc.foodLog.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa bài đăng");
      refetch();
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error("Không thể xóa bài đăng");
    },
  });

  // Load reactions for each post when logs change
  useEffect(() => {
    const logsToUse = logs && logs.length > 0 ? logs : MOCK_LOGS;
    if (!logsToUse.length) return;
    
    const loadReactions = async () => {
      const reactionsMap: Record<number, Reaction[]> = {};
      for (const log of logsToUse) {
        try {
          const reactions = await utils.reaction.getForPost.fetch({ foodLogId: log.id });
          reactionsMap[log.id] = reactions;
        } catch (error) {
          console.error(`Failed to load reactions for post ${log.id}:`, error);
          reactionsMap[log.id] = [];
        }
      }
      setPostReactions(reactionsMap);
    };
    
    loadReactions();
  }, [logs, utils]);

  const handleOpenProfile = (userId: number) => {
    if (user && userId === user.id) return;
    setProfileUserId(userId);
    setProfileOpen(true);
  };

  const handleOpenChat = (userId: number, userName: string | null, userAvatar: string | null) => {
    if (user && userId === user.id) return;
    setChatUserId(userId);
    setChatUserName(userName);
    setChatUserAvatar(userAvatar);
    setChatOpen(true);
  };

  const handleReaction = useCallback((logId: number, emoji: string) => {
    addReaction.mutate({ foodLogId: logId, emoji });
  }, [addReaction]);

  const handleDeletePost = (logId: number) => {
    setDeleteLogId(logId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteLogId) {
      deleteMutation.mutate({ logId: deleteLogId });
    }
  };

  return (
    <div className="page-enter pb-24 max-w-md mx-auto">
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

        {displayLogs.map((log) => {
          const isOwner = user && log.userId === user.id;
          const reactions = postReactions[log.id] || [];

          // Group reactions by emoji and count
          const reactionCounts: Record<string, number> = {};
          reactions.forEach((r) => {
            reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
          });
          const groupedReactions = Object.entries(reactionCounts);

          return (
            <Card key={log.id} className="overflow-hidden bg-card border-border/50 shadow-sm">
              {/* User info header */}
              <div className="flex items-center gap-3 p-3 pb-0">
                <button
                  onClick={() => handleOpenProfile(log.userId)}
                  className="shrink-0 cursor-pointer"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={log.userAvatar || undefined} />
                    <AvatarFallback className="bg-terracotta/20 text-terracotta text-xs">
                      {(log.userName || "?")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleOpenProfile(log.userId)}
                    className="text-sm font-medium truncate hover:underline cursor-pointer text-left"
                  >
                    {log.userName || "Người dùng"}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: vi })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {log.calories && (
                    <div className="flex items-center gap-1 text-xs text-ochre font-medium mr-1">
                      <Flame className="w-3.5 h-3.5" />
                      {log.calories} cal
                    </div>
                  )}
                  {/* Delete button for own posts */}
                  {isOwner && (
                    <button
                      onClick={() => handleDeletePost(log.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
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

              {/* Action buttons row */}
              <div className="flex items-center gap-1 px-3 pt-2">
                {/* Reaction button */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <SmilePlus className="w-4 h-4" />
                      <span className="text-xs">React</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" side="top" align="start">
                    <div className="flex gap-1">
                      {EMOJI_LIST.map((item) => (
                        <button
                          key={item.emoji}
                          onClick={() => handleReaction(log.id, item.emoji)}
                          className="w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center text-2xl transition-transform hover:scale-125"
                          title={item.label}
                        >
                          {item.emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Direct message button (not for own posts) */}
                {!isOwner && (
                  <button
                    onClick={() => handleOpenChat(log.userId, log.userName, log.userAvatar)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs">Nhắn tin</span>
                  </button>
                )}
              </div>

              {/* Reactions display */}
              {groupedReactions.length > 0 && (
                <div className="px-3 pb-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    {groupedReactions.map(([emoji, count]) => (
                      <div key={emoji} className="flex items-center gap-0.5">
                        <span className="text-sm">{emoji}</span>
                        {count > 1 && <span className="text-xs text-muted-foreground">{count}</span>}
                      </div>
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">
                      {reactions.length} reaction{reactions.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="p-3 pt-1 space-y-2">
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
          );
        })}
      </div>

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bài đăng?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bài đăng này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
