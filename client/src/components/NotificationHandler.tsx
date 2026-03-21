import { useAuth } from "@/_core/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function NotificationHandler() {
  const { user } = useAuth();
  const { lastMessage } = useWebSocket(user?.id);
  const respondMutation = trpc.match.respond.useMutation();

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === "match_invite") {
      toast(
        <div className="space-y-2">
          <p className="font-medium text-sm">
            {lastMessage.senderName || "Ai đó"} muốn ăn cùng bạn!
          </p>
          {lastMessage.craving && (
            <p className="text-xs text-muted-foreground">Đang thèm: {lastMessage.craving}</p>
          )}
          {lastMessage.venueName && (
            <p className="text-xs text-muted-foreground">Tại: {lastMessage.venueName}</p>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="bg-terracotta hover:bg-terracotta-dark text-white text-xs h-7"
              onClick={() => {
                respondMutation.mutate({ inviteId: lastMessage.inviteId, accept: true });
                toast.dismiss();
              }}
            >
              Đồng ý
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => {
                respondMutation.mutate({ inviteId: lastMessage.inviteId, accept: false });
                toast.dismiss();
              }}
            >
              Từ chối
            </Button>
          </div>
        </div>,
        { duration: 15000 }
      );
    }

    if (lastMessage.type === "match_response") {
      if (lastMessage.accepted) {
        toast.success(`${lastMessage.responderName || "Ai đó"} đã đồng ý ăn cùng bạn!`);
      } else {
        toast.info(`${lastMessage.responderName || "Ai đó"} đã từ chối lời mời.`);
      }
    }
  }, [lastMessage]);

  return null;
}
