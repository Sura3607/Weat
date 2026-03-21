import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, Zap, Clock } from "lucide-react";
import { toast } from "sonner";

type Props = {
  data: any;
  onClose: () => void;
};

export default function InvitePopup({ data, onClose }: Props) {
  const respondMutation = trpc.match.respond.useMutation({
    onSuccess: (result) => {
      if (result.status === "accepted") {
        toast.success("Đi ăn thôi! 🎉");
      } else {
        toast.info("Đã từ chối lời mời");
      }
      onClose();
    },
    onError: () => {
      toast.error("Có lỗi xảy ra");
    },
  });

  const handleAccept = () => {
    respondMutation.mutate({ inviteId: data.inviteId, accept: true });
  };

  const handleDecline = () => {
    respondMutation.mutate({ inviteId: data.inviteId, accept: false });
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="bg-cream border-none rounded-3xl max-w-sm mx-auto p-0 overflow-hidden">
        {/* Animated header */}
        <div className="bg-gradient-to-br from-terracotta to-ochre p-6 text-center text-white">
          <div className="text-4xl mb-2">⚡️</div>
          <h2 className="font-display text-2xl font-bold">Lời mời ăn cùng!</h2>
          <p className="text-white/80 mt-1 text-sm">
            <span className="font-semibold text-white">{data?.senderName || "Ai đó"}</span> muốn rủ bạn đi ăn
          </p>
          {data?.craving && (
            <div className="mt-3 inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
              <span className="text-sm font-medium">🍜 {data.craving}</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-3">
          <Button
            onClick={handleAccept}
            disabled={respondMutation.isPending}
            className="w-full bg-terracotta hover:bg-terracotta/90 text-white rounded-xl h-12 text-base font-semibold"
          >
            {respondMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Đi luôn! 🤤
          </Button>
          <Button
            onClick={handleDecline}
            disabled={respondMutation.isPending}
            variant="ghost"
            className="w-full rounded-xl h-10 text-muted-foreground"
          >
            <Clock className="w-4 h-4 mr-1" />
            Để sau
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
