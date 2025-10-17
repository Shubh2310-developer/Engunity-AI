'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, Server } from 'lucide-react';
import { ensureServicesReady } from '@/lib/services/serviceLoader';

interface ServiceLoaderProps {
  feature: string;
  onReady?: () => void;
  children?: React.ReactNode;
}

export default function ServiceLoader({ feature, onReady, children }: ServiceLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Checking services...');

  useEffect(() => {
    let mounted = true;

    const loadServices = async () => {
      try {
        setLoading(true);
        setError(null);

        await ensureServicesReady(feature, (msg, prog) => {
          if (mounted) {
            setMessage(msg);
            setProgress(prog);
          }
        });

        if (mounted) {
          setLoading(false);
          onReady?.();
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load required services');
          setLoading(false);
        }
      }
    };

    loadServices();

    return () => {
      mounted = false;
    };
  }, [feature, onReady]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Service Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
        >
          {/* Icon */}
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <Server className="w-8 h-8 text-blue-600" />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Loading Services
          </h2>

          {/* Message */}
          <p className="text-slate-600 text-center mb-6">{message}</p>

          {/* Progress Bar */}
          <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Progress Percentage */}
          <p className="text-sm text-slate-500 text-center font-medium">
            {Math.round(progress)}%
          </p>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 text-center">
              <span className="font-semibold">First time loading?</span>
              <br />
              Services may take 10-30 seconds to initialize
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Services are ready, render children
  return <>{children}</>;
}

/**
 * Hook to use service loading in any component
 */
export function useServiceLoader(feature: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Checking services...');

  useEffect(() => {
    let mounted = true;

    const loadServices = async () => {
      try {
        setLoading(true);
        setError(null);

        await ensureServicesReady(feature, (msg, prog) => {
          if (mounted) {
            setMessage(msg);
            setProgress(prog);
          }
        });

        if (mounted) {
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load required services');
          setLoading(false);
        }
      }
    };

    loadServices();

    return () => {
      mounted = false;
    };
  }, [feature]);

  return { loading, error, progress, message };
}
