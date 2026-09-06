import { useCallback } from "react";
import { useAppealStore } from "../../../store/useAppealStore";

export function useAppealWorkflow() {
  const currentStep = useAppealStore(s => s.currentStep);
  const setCurrentStep = useAppealStore(s => s.setCurrentStep);
  const rawText = useAppealStore(s => s.rawText);
  const isAnalyzing = useAppealStore(s => s.isAnalyzing);
  const setIsAnalyzing = useAppealStore(s => s.setIsAnalyzing);

  const canProceedToStep2 = rawText.trim().length >= 30;

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  }, [setCurrentStep]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, [setCurrentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step);
    }
  }, [setCurrentStep]);

  return {
    currentStep,
    canProceedToStep2,
    isAnalyzing,
    setIsAnalyzing,
    nextStep,
    prevStep,
    goToStep
  };
}
