import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import type { FoodDna } from "@shared/types";
import { Camera, Edit2, Loader2, LogOut, Save, UtensilsCrossed, Users } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { data: profile, isLoading } = trpc.profile.get.useQuery(undefined, { enabled: !!user });
  const updateProfile = trpc.profile.update.useMutation();
  const uploadAvatar = trpc.profile.uploadAvatar.useMutation();
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [bio, setBio] = useState<string>("");
  const [craving, setCraving] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleEdit = useCallback(() => {
    setBio(profile?.bio || "");
    setCraving(profile?.currentCraving || "");
    setIsEditing(true);
  }, [profile]);

  const handleSave = useCallback(async () => {
    try {
      await updateProfile.mutateAsync({ bio, currentCraving: craving });
      await utils.profile.get.invalidate();
      setIsEditing(false);
      toast.success("Đã cập nhật profile");
    } catch {
      toast.error("Không thể cập nhật profile");
    }
  }, [bio, craving, updateProfile, utils]);

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        await uploadAvatar.mutateAsync({ base64, mimeType: file.type });
        await utils.profile.get.invalidate();
        toast.success("Đã cập nhật avatar");
      } catch {
        toast.error("Không thể upload avatar");
      }
    };
    reader.readAsDataURL(file);
  }, [uploadAvatar, utils]);

  const handleLogout = useCallback(async () => {
    await logout();
    window.location.href = "/";
  }, [logout]);

  const foodDna = profile?.foodDna as FoodDna | null;

  if (authLoading || isLoading) {
    return (
      <div className="page-enter pb-24 p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="page-enter pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button size="sm" variant="outline" onClick={handleEdit}>
              <Edit2 className="w-3.5 h-3.5 mr-1" /> Sửa
            </Button>
          ) : (
            <Button size="sm" className="bg-terracotta hover:bg-terracotta-dark text-white" onClick={handleSave} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Lưu
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Avatar & basic info */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile?.avatarUrl || undefined} />
              <AvatarFallback className="bg-terracotta/20 text-terracotta text-xl">
                {(profile?.name || "?")[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-terracotta text-white flex items-center justify-center shadow-md"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{profile?.name || "Người dùng"}</h2>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1 text-sm">
                <UtensilsCrossed className="w-3.5 h-3.5 text-terracotta" />
                <span className="font-semibold">{profile?.foodLogCount || 0}</span>
                <span className="text-muted-foreground text-xs">logs</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Users className="w-3.5 h-3.5 text-sage" />
                <span className="font-semibold">{profile?.friendCount || 0}</span>
                <span className="text-muted-foreground text-xs">bạn</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio & Craving */}
        {isEditing ? (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Giới thiệu bản thân..." className="resize-none" rows={3} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Đang thèm gì?</label>
                <Input value={craving} onChange={(e) => setCraving(e.target.value)} placeholder="Phở, bún bò, pizza..." />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {profile?.bio && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm">{profile.bio}</p>
                </CardContent>
              </Card>
            )}
            {profile?.currentCraving && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-sm text-muted-foreground">Đang thèm:</span>
                <Badge className="bg-ochre/20 text-ochre border-0">{profile.currentCraving}</Badge>
              </div>
            )}
          </>
        )}

        {/* Food DNA */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-lg">🧬</span> Food DNA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!foodDna ? (
              <p className="text-sm text-muted-foreground">
                Chụp thêm ảnh món ăn để tạo Food DNA profile. Cần ít nhất 3 food logs.
              </p>
            ) : (
              <>
                {/* Category breakdown */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Phân loại bữa ăn</p>
                  <div className="space-y-1.5">
                    {Object.entries(foodDna.categories).map(([cat, weight]) => (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-xs w-20 text-muted-foreground capitalize">{cat}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-terracotta rounded-full transition-all"
                            style={{ width: `${(weight as number) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {Math.round((weight as number) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top tags */}
                {foodDna.topTags.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Sở thích ẩm thực</p>
                    <div className="flex flex-wrap gap-1.5">
                      {foodDna.topTags.map((t) => (
                        <Badge key={t.tag} variant="secondary" className="text-xs bg-sage-light text-sage-dark border-0">
                          {t.tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-4 pt-2 border-t border-border">
                  <div className="text-center">
                    <p className="text-lg font-bold text-terracotta">{foodDna.avgCalories}</p>
                    <p className="text-[10px] text-muted-foreground">cal trung bình</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-sage">{foodDna.totalLogs}</p>
                    <p className="text-[10px] text-muted-foreground">food logs</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Logout */}
        <Button variant="outline" className="w-full text-destructive border-destructive/30" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
        </Button>
      </div>
    </div>
  );
}
