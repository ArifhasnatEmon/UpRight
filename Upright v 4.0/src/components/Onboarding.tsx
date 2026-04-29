import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Shield, Zap, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { AdvancedHealthMonitor } from './AdvancedHealthMonitor';
import { cn } from '../utils';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [calibrationScore, setCalibrationScore] = useState(0);

  const steps = [
    {
      title: "Welcome to UpRight",
      description: "Your AI-powered ergonomic companion. Let's get you set up for a healthier workday.",
      icon: <Zap className="w-12 h-12 text-brand-500" />,
      content: (
        <div className="space-y-4 py-8">
          <div className="p-4 rounded-2xl bg-tint-brand border border-brand-100 dark:border-brand-500/20">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" />
              <p className="text-sm text-brand-800 dark:text-brand-300">
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
          <div className="aspect-video rounded-2xl overflow-hidden border-2 border-dashed border-edge bg-inset relative">
            <AdvancedHealthMonitor 
              isActive={step === 1} 
              onStateChange={(_, score) => setCalibrationScore(score)} 
              frameRate={30} 
              postureSensitivity={5}
            />
          </div>
          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-medium text-fg-muted">Calibration Progress</span>
            <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{calibrationScore}%</span>
          </div>
          <div className="h-2 bg-inset rounded-full overflow-hidden">
            <motion.div className="h-full bg-brand-500" animate={{ width: `${calibrationScore}%` }} />
          </div>
        </div>
      )
    },
    {
      title: "Ready to Go!",
      description: "You're all set. UpRight will now monitor your posture in the background and alert you when needed.",
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
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-inset">
                <div className="w-5 h-5 rounded-full bg-tint-emerald-strong flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-fg">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step] || steps[0];

  return (
    <div className="fixed inset-0 z-[10001] bg-card flex items-center justify-center p-6" role="main" aria-label="Onboarding setup">
      <div className="max-w-xl w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
            role="tabpanel"
            aria-label={currentStep.title}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-3xl bg-inset shadow-sm">
                {currentStep.icon}
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-display font-bold text-fg">{currentStep.title}</h2>
                <p className="text-fg-muted">{currentStep.description}</p>
              </div>
            </div>

            {currentStep.content}

            <div className="flex items-center justify-between pt-8">
              <div className="flex gap-1" role="tablist" aria-label="Onboarding steps">
                {steps.map((s, i) => (
                  <div key={i} role="tab" aria-selected={i === step} aria-label={`Step ${i + 1}: ${s.title}`} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-8 bg-brand-500" : "w-2 bg-edge")} />
                ))}
              </div>
              <div className="flex gap-3">
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)} className="p-3 rounded-2xl border border-edge hover:bg-inset transition-colors text-fg" aria-label="Go to previous step">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                <button
                  onClick={() => { if (step < steps.length - 1) setStep(s => s + 1); else onComplete(); }}
                  disabled={step === 1 && calibrationScore < 70}
                  className={cn(
                    "px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2",
                    step === 1 && calibrationScore < 70 && "opacity-50 cursor-not-allowed"
                  )}
                  aria-label={step === steps.length - 1 ? "Complete setup and get started" : `Continue to step ${step + 2}`}
                >
                  {step === steps.length - 1 ? "Get Started" : "Continue"}
                  <ChevronRight className="w-5 h-5" />
                </button>
                {step === 1 && calibrationScore < 70 && (
                  <button onClick={() => setStep(s => s + 1)} className="text-xs text-fg-faint hover:text-fg-secondary transition-colors underline underline-offset-2" aria-label="Skip camera calibration step">
                    Skip calibration
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
