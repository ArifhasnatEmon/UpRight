import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[10002] bg-neutral-900 flex flex-col items-center justify-center space-y-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-24 h-24 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-500/40"
      >
        <Activity className="w-12 h-12 text-white" />
      </motion.div>
      <div className="text-center space-y-2">
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-4xl font-display font-bold text-white tracking-tight"
        >
          Upright
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-neutral-500 font-medium"
        >
          AI-Powered Ergonomics
        </motion.p>
      </div>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 200 }}
        transition={{ delay: 0.8, duration: 1.5, ease: "easeInOut" }}
        className="h-1 bg-brand-500 rounded-full"
      />
    </div>
  );
};
