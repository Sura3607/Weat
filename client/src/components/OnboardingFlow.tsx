import { useState } from "react";
import SplashScreen from "@/pages/SplashScreen";
import AuthPage from "@/pages/AuthPage";
import PermissionsOverlay from "./PermissionsOverlay";
import ProfileSetupSheet from "./ProfileSetupSheet";
import ColdStartDNA from "./ColdStartDNA";

interface OnboardingFlowProps {
  onComplete: () => void;
}

type OnboardingStep = "splash" | "auth" | "permissions" | "profile" | "dna" | "complete";

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>("splash");

  const handleSplashComplete = () => setStep("auth");
  const handleAuthComplete = () => setStep("permissions");
  const handlePermissionsComplete = () => setStep("profile");
  const handleProfileComplete = () => setStep("dna");
  const handleDNAComplete = () => {
    setStep("complete");
    onComplete();
  };

  if (step === "splash") {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (step === "auth") {
    return <AuthPage onComplete={handleAuthComplete} />;
  }

  if (step === "permissions") {
    return <PermissionsOverlay onComplete={handlePermissionsComplete} />;
  }

  if (step === "profile") {
    return <ProfileSetupSheet onComplete={handleProfileComplete} />;
  }

  if (step === "dna") {
    return <ColdStartDNA onComplete={handleDNAComplete} />;
  }

  return null;
}
