import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationBannerProps {
  notification: string | null;
}

export default function NotificationBanner({ notification }: NotificationBannerProps) {
  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4"
        >
          <div className="bg-slate-900/95 border border-indigo-500/40 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center justify-between space-x-3 text-xs sm:text-sm font-medium">
            <span className="truncate">{notification}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
