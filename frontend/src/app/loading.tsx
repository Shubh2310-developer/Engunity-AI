'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain } from 'lucide-react';


// Check if this is the first time visiting the website
const isFirstTimeVisit = (): boolean => {
  if (typeof window === 'undefined') return true;
  return !localStorage.getItem('engunity_visited');
};

// Mark the website as visited
const markAsVisited = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('engunity_visited', 'true');
  }
};

// Minimal loading screen component for first-time visits
interface LoadingScreenProps {
  onComplete?: () => void;
  message?: string;
  isVisible?: boolean;
}

export default function LoadingScreen({ onComplete, message = "Welcome to Engunity AI", isVisible = true }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    // Only show loading screen for first-time visitors
    const isFirstTime = isFirstTimeVisit();
    
    if (isFirstTime) {
      setShowLoading(true);
      markAsVisited();

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 15 + 5;
          if (newProgress >= 100) {
            setTimeout(() => {
              onComplete?.();
            }, 800);
            clearInterval(progressInterval);
            return 100;
          }
          return newProgress;
        });
      }, 150);

      return () => clearInterval(progressInterval);
    } else {
      // For returning visitors, complete immediately
      setTimeout(() => {
        onComplete?.();
      }, 100);
      return;
    }
  }, [isVisible, onComplete]);

  // Don't render anything for returning visitors
  if (!showLoading) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 w-full h-screen bg-slate-950 flex items-center justify-center z-50"
        >
          {/* Simple background with subtle gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

          {/* Content */}
          <motion.div 
            className="relative z-10 flex flex-col items-center justify-center space-y-6 px-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
          >
            {/* Logo */}
            <motion.div 
              className="flex flex-col items-center space-y-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5, ease: "backOut" }}
            >
              <motion.div className="relative">
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg"
                  animate={{ 
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                >
                  <Brain className="w-8 h-8 text-white" />
                </motion.div>
                
                {/* Subtle glow */}
                <motion.div 
                  className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 rounded-xl blur-lg opacity-30"
                  animate={{ 
                    opacity: [0.2, 0.4, 0.2]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>

              {/* Brand name */}
              <motion.h1 
                className="text-3xl md:text-4xl font-bold text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  Engunity AI
                </span>
              </motion.h1>
            </motion.div>

            {/* Loading message and progress */}
            <motion.div 
              className="text-center space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <p className="text-slate-300 text-lg font-medium">
                {message}
              </p>
              <MinimalProgressIndicator progress={progress} />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simple, professional progress indicator
const MinimalProgressIndicator: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="w-64 mx-auto">
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};