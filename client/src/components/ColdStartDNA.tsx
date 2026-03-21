import { Button } from "@/components/ui/button";
import { Utensils, ChefHat, Coffee, Pizza, IceCream, Apple, Fish, Wheat, Leaf } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface FoodTag {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const FOOD_TAGS: FoodTag[] = [
  { id: "vietnamese", label: "Ẩm thực Việt", icon: <ChefHat className="w-4 h-4" /> },
  { id: "asian", label: "Đồ Á", icon: <Utensils className="w-4 h-4" /> },
  { id: "western", label: "Đồ Âu", icon: <Pizza className="w-4 h-4" /> },
  { id: "japanese", label: "Nhật Bản", icon: <Fish className="w-4 h-4" /> },
  { id: "korean", label: "Hàn Quốc", icon: <ChefHat className="w-4 h-4" /> },
  { id: "chinese", label: "Trung Hoa", icon: <Wheat className="w-4 h-4" /> },
  { id: "vegetarian", label: "Ăn chay", icon: <Leaf className="w-4 h-4" /> },
  { id: "vegan", label: "Thuần chay", icon: <Apple className="w-4 h-4" /> },
  { id: "seafood", label: "Hải sản", icon: <Fish className="w-4 h-4" /> },
  { id: "grill", label: "Đồ nướng", icon: <ChefHat className="w-4 h-4" /> },
  { id: "soup", label: "Canh súp", icon: <Utensils className="w-4 h-4" /> },
  { id: "noodles", label: "Mì phở", icon: <Wheat className="w-4 h-4" /> },
  { id: "rice", label: "Cơm", icon: <Wheat className="w-4 h-4" /> },
  { id: "bread", label: "Bánh mì", icon: <Pizza className="w-4 h-4" /> },
  { id: "dessert", label: "Tráng miệng", icon: <IceCream className="w-4 h-4" /> },
  { id: "coffee", label: "Cà phê", icon: <Coffee className="w-4 h-4" /> },
  { id: "bubble_tea", label: "Trà sữa", icon: <Coffee className="w-4 h-4" /> },
  { id: "fast_food", label: "Đồ ăn nhanh", icon: <Pizza className="w-4 h-4" /> },
  { id: "healthy", label: "Healthy", icon: <Apple className="w-4 h-4" /> },
  { id: "spicy", label: "Đồ cay", icon: <ChefHat className="w-4 h-4" /> },
];

interface ColdStartDNAProps {
  onComplete: (tags: string[]) => void;
}

export default function ColdStartDNA({ onComplete }: ColdStartDNAProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : prev.length < 3
          ? [...prev, tagId]
          : prev
    );
  };

  const handleSubmit = () => {
    if (selectedTags.length < 3) {
      toast.error("Vui lòng chọn ít nhất 3 món yêu thích");
      return;
    }

    // Store locally, will be synced when user creates first food log
    localStorage.setItem("weat-food-dna", JSON.stringify(selectedTags));
    toast.success("Đã lưu sở thích ẩm thực!");
    onComplete(selectedTags);
  };

  const handleSkip = () => {
    // Default tags if skipped
    onComplete(["vietnamese", "asian", "rice"]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <button onClick={handleSkip} className="text-muted-foreground hover:text-foreground">
            Để sau
          </button>
          <h2 className="text-lg font-bold">Sở thích ẩm thực</h2>
          <div className="w-10" /> {/* Spacer */}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Chọn 3 món bạn yêu thích nhất
        </p>
      </div>

      {/* Progress */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Đã chọn {selectedTags.length}/3
          </span>
          <span className={`text-sm font-medium ${selectedTags.length >= 3 ? "text-terracotta" : "text-muted-foreground"}`}>
            {selectedTags.length >= 3 ? "Đủ!" : "Chọn thêm"}
          </span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-terracotta transition-all duration-300"
            style={{ width: `${(selectedTags.length / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Tags Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-2 gap-3">
          {FOOD_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => handleToggleTag(tag.id)}
                className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                  isSelected
                    ? "border-terracotta bg-terracotta/10 text-terracotta"
                    : "border-border bg-card hover:border-terracotta/50"
                } ${selectedTags.length >= 3 && !isSelected ? "opacity-50" : ""}`}
                disabled={selectedTags.length >= 3 && !isSelected}
              >
                <div className={isSelected ? "text-terracotta" : "text-muted-foreground"}>
                  {tag.icon}
                </div>
                <span className="text-sm font-medium text-center">{tag.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border px-6 py-4 safe-area-pb">
        <Button
          size="lg"
          className="w-full bg-terracotta hover:bg-terracotta-dark text-white py-6 rounded-2xl text-base"
          onClick={handleSubmit}
          disabled={selectedTags.length < 3 || updateFoodDna.isPending}
        >
          {updateFoodDna.isPending ? "Đang lưu..." : "Hoàn thành"}
        </Button>
      </div>

      <style>{`
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom, 1rem);
        }
      `}</style>
    </div>
  );
}
