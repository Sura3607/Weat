import { useEffect } from "react";
import { useLocation } from "wouter";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to onboarding page
    setLocation("/onboarding");
    onComplete();
  }, [setLocation, onComplete]);

  return null;
}
