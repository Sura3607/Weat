import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, Users } from "lucide-react";

const FOOD_OPTIONS = [
  "Bún bò",
  "Phở",
  "Sushi",
  "Salad",
  "Cơm tấm",
  "Gà rán",
  "Pizza",
  "Cà phê muối",
  "Chân gà sả tắc",
  "Hải sản",
  "Bánh mì",
];

const FEATURE_SLIDES = [
  {
    icon: Camera,
    title: "Chụp & Phân tích",
    description: "AI nhận diện món ăn, tính calories, và gợi ý tags tự động.",
  },
  {
    icon: MapPin,
    title: "Radar Bạn Ăn",
    description: "Tìm người gần bạn muốn ăn cùng trong bán kính 200m.",
  },
  {
    icon: Users,
    title: "Match & Đi Ăn",
    description: "Cùng gu, cùng thèm, cùng đi ăn ngay với Google Maps.",
  },
];

interface OnboardingPageProps {
  onComplete?: () => void;
}

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);

  const handleToggleFood = (food: string) => {
    setSelectedFoods((prev) =>
      prev.includes(food)
        ? prev.filter((f) => f !== food)
        : [...prev, food]
    );
  };

  const handleContinueToFeatures = () => {
    if (selectedFoods.length >= 3) {
      localStorage.setItem("weat-food-dna", JSON.stringify(selectedFoods));
      setCurrentStep(1);
    }
  };

  const handleNextSlide = () => {
    if (currentStep < FEATURE_SLIDES.length) {
      setCurrentStep(currentStep + 1);
    } else {
      setLocation("/feed");
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handleSkip = () => {
    setLocation("/feed");
    if (onComplete) {
      onComplete();
    }
  };

  // Phase 1: Cold Start DNA (Step 0)
  if (currentStep === 0) {
    const canContinue = selectedFoods.length >= 3;

    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col max-w-md mx-auto">
        {/* Header */}
        <div className="px-6 py-4">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Để sau
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Chọn 3 món bạn có thể ăn mỗi ngày
          </h1>
        </div>

        {/* Food Options Grid */}
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {FOOD_OPTIONS.map((food) => {
              const isSelected = selectedFoods.includes(food);
              return (
                <button
                  key={food}
                  onClick={() => handleToggleFood(food)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isSelected
                      ? "bg-[#D9774A] text-white"
                      : "bg-transparent border border-gray-300 text-gray-700 hover:border-[#D9774A]"
                  }`}
                >
                  {food}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="px-6 py-2">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Đã chọn {selectedFoods.length} món</span>
            <span className={canContinue ? "text-[#D9774A] font-medium" : ""}>
              {canContinue ? "Đủ!" : "Chọn ít nhất 3 món"}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D9774A] transition-all duration-300"
              style={{
                width: `${Math.min((selectedFoods.length / 3) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Continue Button */}
        <div className="px-6 py-4 border-t border-gray-200">
          <Button
            onClick={handleContinueToFeatures}
            disabled={!canContinue}
            className={`w-full py-6 rounded-xl text-base font-medium ${
              canContinue
                ? "bg-[#D9774A] hover:bg-[#C4673A] text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Tiếp tục
          </Button>
        </div>
      </div>
    );
  }

  // Phase 2: Feature Introduction Carousel (Steps 1-3)
  const slideIndex = currentStep - 1;
  const currentSlide = FEATURE_SLIDES[slideIndex];
  const isLastSlide = slideIndex === FEATURE_SLIDES.length - 1;
  const IconComponent = currentSlide.icon;

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col max-w-md mx-auto">
      {/* Slide Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-24 h-24 rounded-full bg-[#D9774A]/10 flex items-center justify-center mb-6">
          <IconComponent className="w-12 h-12 text-[#D9774A]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
          {currentSlide.title}
        </h2>
        <p className="text-gray-600 text-center text-base leading-relaxed">
          {currentSlide.description}
        </p>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-2 px-6 py-4">
        {FEATURE_SLIDES.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === slideIndex
                ? "bg-[#D9774A] w-6"
                : "bg-gray-300"
            }`}
          />
        ))}
      </div>

      {/* Navigation Button */}
      <div className="px-6 py-4 border-t border-gray-200">
        <Button
          onClick={handleNextSlide}
          className="w-full py-6 rounded-xl text-base font-medium bg-[#D9774A] hover:bg-[#C4673A] text-white"
        >
          {isLastSlide ? "Bắt đầu" : "Tiếp"}
        </Button>
      </div>
    </div>
  );
}
