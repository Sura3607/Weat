import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Loader2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otherUserId: number | null;
  otherUserName?: string | null;
  otherUserAvatar?: string | null;
};

export default function ChatSheet({ open, onOpenChange, otherUserId, otherUserName, otherUserAvatar }: Props) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { lastMessage } = useWebSocket(user?.id);

  const { data: messages, isLoading, refetch } = trpc.chat.messages.useQuery(
    { otherUserId: otherUserId! },
    { enabled: open && otherUserId !== null, refetchInterval: 5000 }
  );

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: () => {
      setMessage("");
      refetch();
    },
  });

  // Listen for incoming chat messages via WebSocket
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== "chat_message") return;
    if (lastMessage.senderId === otherUserId) {
      refetch();
    }
  }, [lastMessage, otherUserId, refetch]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !otherUserId) return;
    sendMutation.mutate({
      receiverId: otherUserId,
      content: message.trim(),
    });
  };

  // Reverse messages for display (they come in desc order)
  const sortedMessages = messages ? [...messages].reverse() : [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="max-h-[85vh] bg-background flex flex-col">
        <DrawerHeader className="flex items-center justify-between pb-2 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={otherUserAvatar || undefined} />
              <AvatarFallback className="bg-terracotta/20 text-terracotta text-xs">
                {(otherUserName || "?")[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <DrawerTitle className="font-display text-base">
              {otherUserName || "Người dùng"}
            </DrawerTitle>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </DrawerHeader>

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 pb-2"
          style={{ maxHeight: "calc(85vh - 140px)" }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-terracotta animate-spin" />
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">Chưa có tin nhắn nào</p>
              <p className="text-muted-foreground text-xs mt-1">Hãy gửi lời chào đầu tiên!</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {sortedMessages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[75%] ${isMe ? "order-1" : "order-2"}`}>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm ${
                          isMe
                            ? "bg-terracotta text-white rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <p className={`text-[10px] text-muted-foreground mt-0.5 ${isMe ? "text-right" : "text-left"}`}>
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: vi })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border px-4 py-3">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="rounded-xl bg-muted border-0"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            />
            <Button
              size="icon"
              className="bg-terracotta hover:bg-terracotta/90 text-white rounded-xl shrink-0"
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
