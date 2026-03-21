import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Camera, MapPin, Radio, Utensils, ChevronRight, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Redirect authenticated users to feed - must be in useEffect to avoid setState-in-render
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/feed");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-terracotta/10 via-cream to-sage-light/30" />
        <div className="relative px-6 pt-16 pb-12 max-w-md mx-auto text-center">
          {/* Logo */}
          <div className="w-20 h-20 rounded-3xl bg-terracotta mx-auto mb-6 flex items-center justify-center shadow-lg">
            <Utensils className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Weat
          </h1>
          <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
            Khám phá ẩm thực. Kết nối bạn bè.<br />
            <span className="text-terracotta font-medium">Cùng nhau thưởng thức.</span>
          </p>

          <div className="flex flex-col gap-3 mt-8">
            <Button
              size="lg"
              className="bg-terracotta hover:bg-terracotta-dark text-white px-8 py-6 text-base rounded-2xl shadow-lg"
              onClick={() => navigate("/login")}
            >
              Đăng nhập
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-terracotta text-terracotta hover:bg-terracotta/10 px-8 py-6 text-base rounded-2xl"
              onClick={() => navigate("/register")}
            >
              Tạo tài khoản mới
            </Button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-12 max-w-md mx-auto space-y-6">
        <FeatureCard
          icon={<Camera className="w-6 h-6" />}
          title="Chụp & Phân tích"
          description="AI nhận diện món ăn, tính calories, và gợi ý tags tự động"
          color="terracotta"
        />
        <FeatureCard
          icon={<Radio className="w-6 h-6" />}
          title="Radar bạn ăn"
          description="Tìm người gần bạn muốn ăn cùng trong bán kính 200m"
          color="sage"
        />
        <FeatureCard
          icon={<MapPin className="w-6 h-6" />}
          title="Gợi ý quán ăn"
          description="Quán ăn phù hợp dựa trên vị trí và sở thích của bạn"
          color="ochre"
        />
        <FeatureCard
          icon={<span className="text-xl">🧬</span>}
          title="Food DNA"
          description="Profile ẩm thực cá nhân tự động cập nhật sau mỗi bữa ăn"
          color="warm-brown"
        />
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-muted-foreground">
        <p>Weat - Discover food together</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    terracotta: "bg-terracotta/10 text-terracotta",
    sage: "bg-sage/20 text-sage-dark",
    ochre: "bg-ochre/15 text-ochre",
    "warm-brown": "bg-warm-brown/10 text-warm-brown",
  };

  return (
    <div className="flex gap-4 items-start p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bgMap[color] || bgMap.terracotta}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-base">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
