import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Flame, MapPin, MessageCircle, SmilePlus, Trash2, MoreHorizontal } from "lucide-react";
import { useState, useCallback } from "react";
import UserProfileSheet from "@/components/UserProfileSheet";
import ChatSheet from "@/components/ChatSheet";
import { toast } from "sonner";

const EMOJI_LIST = ["😋", "🤤", "😍", "🔥", "👍", "❤️", "😮", "🥰"];

export default function FeedPage() {
  const { user } = useAuth();
  const { data: logs, isLoading, refetch } = trpc.foodLog.feed.useQuery({ limit: 50, offset: 0 });

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
  const [postReactions, setPostReactions] = useState<Record<number, { emoji: string; userName: string | null }[]>>({});

  const addReaction = trpc.reaction.add.useMutation({
    onSuccess: () => {
      toast.success("Đã thả reaction!");
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
    // Optimistic update
    setPostReactions((prev) => {
      const existing = prev[logId] || [];
      // Remove existing reaction from same user, add new
      const filtered = existing.filter((r) => r.userName !== (user?.name || null));
      return { ...prev, [logId]: [...filtered, { emoji, userName: user?.name || null }] };
    });
  }, [addReaction, user]);

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

        {logs?.map((log) => {
          const isOwner = user && log.userId === user.id;
          const reactions = postReactions[log.id] || [];

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
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(log.id, emoji)}
                          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-lg transition-transform hover:scale-125"
                        >
                          {emoji}
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
              {reactions.length > 0 && (
                <div className="px-3 pb-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    {reactions.map((r, i) => (
                      <span key={i} className="text-sm" title={r.userName || undefined}>
                        {r.emoji}
                      </span>
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
