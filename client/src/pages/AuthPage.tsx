import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Utensils } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AuthPageProps {
  onComplete: () => void;
}

export default function AuthPage({ onComplete }: AuthPageProps) {
  const [, navigate] = useLocation();
  const { refetch } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await refetch();
      onComplete();
      navigate("/feed");
    },
    onError: (err) => {
      toast.error(err.message || "Đăng nhập thất bại");
      setIsLoading(false);
    },
  });

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Redirect to Google OAuth
    window.location.href = getLoginUrl();
  };

  const handleAppleLogin = () => {
    // Apple login placeholder
    toast.info("Apple Login sẽ sớm ra mắt");
    setIsLoading(false);
  };

  const handleSkip = () => {
    onComplete();
    navigate("/login");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-terracotta/10 via-cream to-sage-light/30">
      {/* Background food image with blur */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200')",
          filter: "blur(8px)",
        }}
      />
      
      {/* Backdrop blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="w-20 h-20 rounded-3xl bg-terracotta flex items-center justify-center shadow-xl mb-8">
          <Utensils className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2">
          Weat
        </h1>
        <p className="text-lg text-muted-foreground text-center mb-12 leading-relaxed">
          Khám phá ẩm thực. Kết nối bạn bè.
        </p>

        {/* Login buttons */}
        <div className="w-full max-w-sm space-y-4">
          <Button
            size="lg"
            className="w-full bg-white hover:bg-gray-50 text-gray-900 px-8 py-6 text-base rounded-2xl shadow-lg border border-gray-200 flex items-center justify-center gap-3"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <Button
            size="lg"
            className="w-full bg-black hover:bg-gray-900 text-white px-8 py-6 text-base rounded-2xl shadow-lg flex items-center justify-center gap-3"
            onClick={handleAppleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Continue with Apple
              </>
            )}
          </Button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-br from-terracotta/10 via-cream to-sage-light/30 text-muted-foreground">
                hoặc
              </span>
            </div>
          </div>

          <Button
            size="lg"
            variant="outline"
            className="w-full border-terracotta text-terracotta hover:bg-terracotta/10 px-8 py-6 text-base rounded-2xl"
            onClick={handleSkip}
            disabled={isLoading}
          >
            Đăng nhập bằng tài khoản
          </Button>
        </div>

        {/* Footer */}
        <p className="mt-12 text-xs text-muted-foreground text-center">
          Bằng việc tiếp tục, bạn đồng ý với{" "}
          <a href="#" className="text-terracotta hover:underline">
            Điều khoản dịch vụ
          </a>{" "}
          và{" "}
          <a href="#" className="text-terracotta hover:underline">
            Chính sách bảo mật
          </a>
        </p>
      </div>
    </div>
  );
}
