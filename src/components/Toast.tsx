import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 20, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          className="fixed top-0 left-1/2 z-[100] bg-neutral-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
        >
          <Trophy className="w-5 h-5 text-brand-400" />
          <span className="font-bold text-sm tracking-tight">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
