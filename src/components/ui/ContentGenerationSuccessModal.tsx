import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, MapPin, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ContentGenerationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingId?: string;
  title?: string;
  description?: string;
  processingLocation?: string;
  estimatedTime?: string;
  additionalInfo?: string;
}

export function ContentGenerationSuccessModal({ 
  isOpen, 
  onClose,
  trackingId,
  title = "Content Generation Initiated!",
  description = "Your AI-powered content is being created",
  processingLocation = "AI Processing Center",
  estimatedTime = "3-5 minutes",
  additionalInfo = "You'll receive a notification when your content is ready"
}: ContentGenerationSuccessModalProps) {
  
  useEffect(() => {
    if (isOpen) {
      // Trigger confetti animation
      const duration = 2 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5']
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5']
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[9999]"
            onClick={onClose}
          />

          {/* Success Modal - Smaller, centered, non-transparent */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-sm mx-4"
          >
            <div className="relative bg-gray-900 rounded-xl shadow-2xl border border-gray-600 overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors z-10"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>

              {/* Content */}
              <div className="relative p-6 space-y-4">
                {/* Success Icon with Animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", damping: 15, stiffness: 200 }}
                  className="flex justify-center"
                >
                  <div className="relative w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center space-y-2"
                >
                  <h3 className="text-xl font-bold text-white">
                    {title}
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {description}
                  </p>
                </motion.div>

                {/* Info Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  {/* Processing Location */}
                  <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-300">Processing Location</p>
                      <p className="text-white font-semibold text-sm">{processingLocation}</p>
                    </div>
                  </div>

                  {/* Estimated Time */}
                  <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-300">Estimated Time</p>
                      <p className="text-white font-semibold text-sm">{estimatedTime}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-3"
                >
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200 transform hover:scale-[1.02] text-sm"
                  >
                    Got it!
                  </button>
                </motion.div>

                {/* Additional Info */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center"
                >
                  <p className="text-xs text-gray-500">
                    {additionalInfo}
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}