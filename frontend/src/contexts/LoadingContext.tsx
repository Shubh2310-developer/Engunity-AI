'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import LoadingScreen from '@/app/loading';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
  showInitialLoading?: boolean;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ 
  children, 
  showInitialLoading = true 
}) => {
  const [isLoading, setIsLoading] = useState(showInitialLoading);
  const [loadingMessage, setLoadingMessage] = useState("Initializing Engunity AI Neural Engine...");
  const [isInitialLoad, setIsInitialLoad] = useState(showInitialLoading);

  // Handle initial loading
  useEffect(() => {
    if (showInitialLoading) {
      // Simulate initial app loading
      const timer = setTimeout(() => {
        setIsLoading(false);
        setIsInitialLoad(false);
      }, 3000); // Show loading for 3 seconds on initial load

      return () => clearTimeout(timer);
    }
  }, [showInitialLoading]);

  const showLoading = (message = "Loading...") => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setIsInitialLoad(false);
  };

  const contextValue: LoadingContextType = {
    isLoading,
    loadingMessage,
    showLoading,
    hideLoading,
    setLoadingMessage,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      <LoadingScreen 
        isVisible={isLoading}
        message={loadingMessage}
        onComplete={handleLoadingComplete}
      />
    </LoadingContext.Provider>
  );
};

export default LoadingContext;