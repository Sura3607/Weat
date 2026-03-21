import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { Mic, MicOff, Loader2, Utensils } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

interface CravingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (craving: string) => void;
}

export default function CravingSheet({ open, onOpenChange, onSubmit }: CravingSheetProps) {
  const [craving, setCraving] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
    if (!craving.trim()) {
      toast.error("Vui lòng nhập món bạn đang thèm");
      return;
    }
    onSubmit(craving.trim());
    onOpenChange(false);
    setCraving("");
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
    } catch {
      toast.error("Không thể truy cập microphone");
    }
  }, [transcribeMutation]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md p-0">
        <div className="p-6">
          <SheetHeader>
            <div className="w-12 h-12 rounded-2xl bg-terracotta/10 flex items-center justify-center mb-4">
              <Utensils className="w-6 h-6 text-terracotta" />
            </div>
            <SheetTitle className="text-2xl font-bold">Craving? 🤤</SheetTitle>
            <p className="text-muted-foreground">
              Hôm nay bạn đang thèm món gì? Nhập hoặc nói tên món ăn.
            </p>
          </SheetHeader>

          <div className="mt-8 space-y-4">
            {/* Input with voice */}
            <div className="relative">
              <Input
                placeholder="VD: Bún bò Huế, Pizza, Sushi..."
                value={craving}
                onChange={(e) => setCraving(e.target.value)}
                className="h-14 pr-12 rounded-2xl text-base"
                maxLength={100}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isRecording
                    ? "bg-red-500 animate-pulse"
                    : "bg-terracotta/10 hover:bg-terracotta/20"
                }`}
              >
                {transcribeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="w-4 h-4 text-white" />
                ) : (
                  <Mic className="w-4 h-4 text-terracotta" />
                )}
              </button>
            </div>

            {/* Quick suggestions */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Gợi ý:</p>
              <div className="flex flex-wrap gap-2">
                {["Bún bò", "Phở", "Cơm tấm", "Bánh mì", "Gỏi cuốn", "Trà sữa", "Pizza"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setCraving(suggestion)}
                    className="px-3 py-1.5 bg-sage-light/50 text-sage-dark text-sm rounded-full hover:bg-sage-light transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <Button
              size="lg"
              className="w-full bg-terracotta hover:bg-terracotta-dark text-white py-6 rounded-2xl text-base mt-8"
              onClick={handleSubmit}
              disabled={!craving.trim()}
            >
              Cập nhật trạng thái
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
