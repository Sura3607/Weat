import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Mic, MicOff, Loader2, Utensils } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function CravingDialog({ open, onOpenChange }: Props) {
  const [craving, setCraving] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const utils = trpc.useUtils();

  const setCravingMutation = trpc.craving.set.useMutation({
    onSuccess: () => {
      toast.success(`Đã lưu: "${craving}"`);
      // Invalidate profile and radar queries so craving shows up immediately
      utils.profile.get.invalidate();
      utils.radar.nearby.invalidate();
      onOpenChange(false);
      setCraving("");
    },
    onError: () => {
      toast.error("Không thể lưu craving");
    },
  });

  const transcribeMutation = trpc.voice.transcribe.useMutation({
    onSuccess: (data) => {
      setCraving(data.text);
      toast.success("Đã nhận diện giọng nói!");
    },
    onError: () => {
      toast.error("Không thể nhận diện giọng nói");
    },
  });

  const handleSubmit = () => {
    if (!craving.trim()) return;
    setCravingMutation.mutate({ craving: craving.trim() });
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          transcribeMutation.mutate({ audioBase64: base64, mimeType: "audio/webm" });
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Không thể truy cập microphone");
    }
  }, [transcribeMutation]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const suggestions = ["Bún Bò", "Phở", "Cơm Tấm", "Bánh Mì", "Trà Sữa", "Pizza", "Sushi", "Gỏi Cuốn"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cream border-border rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Utensils className="w-5 h-5 text-terracotta" />
            Bạn đang thèm gì?
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Nhập hoặc nói tên món bạn đang thèm. Trạng thái sẽ hiển thị trên Radar.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex gap-2">
            <Input
              value={craving}
              onChange={(e) => setCraving(e.target.value)}
              placeholder="VD: Bún Bò Huế, Pizza, Trà Sữa..."
              className="rounded-xl bg-card border-border"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isRecording ? "bg-destructive text-white animate-pulse" : "bg-terracotta/10 text-terracotta"
              }`}
            >
              {transcribeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Quick suggestions */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Gợi ý nhanh:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setCraving(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-ochre-light text-foreground hover:bg-ochre/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!craving.trim() || setCravingMutation.isPending}
            className="w-full bg-terracotta hover:bg-terracotta/90 text-white rounded-xl h-11"
          >
            {setCravingMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Lưu & Tìm bạn ăn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
