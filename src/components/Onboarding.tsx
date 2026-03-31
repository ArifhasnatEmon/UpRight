import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Shield, Zap, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '../utils';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [calibrationScore, setCalibrationScore] = useState(0);

  useEffect(() => {
    if (step !== 1) return;
    setCalibrationScore(0);
    const interval = setInterval(() => {
      setCalibrationScore(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [step]);

  // Define onboarding steps
  const steps = [
    {
      title: "Welcome to Upright",
      description: "Your AI-powered ergonomic companion. Let's get you set up for a healthier workday.",
      icon: <Zap className="w-12 h-12 text-brand-500" />,
      content: (
        <div className="space-y-4 py-8">
          <div className="p-4 rounded-2xl bg-brand-50 border border-brand-100">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-brand-600 shrink-0" />
              <p className="text-sm text-brand-800">
                <strong>Privacy First:</strong> All AI processing happens locally on your device. No video is ever recorded or stored.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Camera Calibration",
      description: "Sit in your natural working position. We'll use this as your baseline for good posture.",
      icon: <Camera className="w-12 h-12 text-brand-500" />,
      content: (
        <div className="space-y-4 py-4">
          <div className="aspect-video rounded-2xl overflow-hidden border-2 border-dashed border-neutral-200 bg-neutral-900 relative flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto">
                <Camera className="w-8 h-8 text-brand-400" />
              </div>
              <p className="text-white/70 text-sm font-medium">Calibrating posture baseline...</p>
              <div className="flex items-center justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-brand-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-medium text-neutral-500">Calibration Progress</span>
            <span className="text-sm font-bold text-brand-600">{calibrationScore}%</span>
          </div>
          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-500"
              animate={{ width: `${calibrationScore}%` }}
            />
          </div>
        </div>
      )
    },
    {
      title: "Ready to Go!",
      description: "You're all set. Upright will now monitor your posture in the background and alert you when needed.",
      icon: <Check className="w-12 h-12 text-emerald-500" />,
      content: (
        <div className="space-y-4 py-8">
          <div className="grid grid-cols-1 gap-3">
            {[
              "Real-time posture alerts",
              "Sitting & eye strain reminders",
              "Daily health analytics",
              "Gamified achievements"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  // Get current step data
  const currentStep = steps[step] || steps[0];

  return (
    <div className="fixed inset-0 z-[10001] bg-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-3xl bg-neutral-50 shadow-sm">
                {currentStep.icon}
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-display font-bold">{currentStep.title}</h2>
                <p className="text-neutral-500">{currentStep.description}</p>
              </div>
            </div>

            {currentStep.content}

            <div className="flex items-center justify-between pt-8">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === step ? "w-8 bg-brand-500" : "w-2 bg-neutral-200"
                    )}
                  />
                ))}
              </div>

              <div className="flex gap-3">
                {step > 0 && (
                  <button
                    onClick={() => setStep(s => s - 1)}
                    className="p-3 rounded-2xl border border-neutral-200 hover:bg-neutral-50 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (step < steps.length - 1) setStep(s => s + 1);
                    else onComplete();
                  }}
                  disabled={step === 1 && calibrationScore < 100}
                  className={cn(
                    "px-8 py-3 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all flex items-center gap-2",
                    step === 1 && calibrationScore < 100 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {step === steps.length - 1 ? "Get Started" : "Continue"}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
