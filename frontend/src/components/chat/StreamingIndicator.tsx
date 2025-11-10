import React, { useEffect, useState } from 'react';

interface StreamingIndicatorProps {
  className?: string;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span className="inline-block w-1 h-4 bg-sky-600 dark:bg-sky-400 animate-blink" />
    </div>
  );
};

// Typing dots indicator (alternative style)
export const TypingDotsIndicator: React.FC<StreamingIndicatorProps> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-1 px-3 py-2 ${className}`}>
      <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce"
        style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce"
        style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce"
        style={{ animationDelay: '300ms' }} />
    </div>
  );
};

// Token rate display component
interface TokenRateProps {
  tokensPerSecond?: number;
  className?: string;
}

export const TokenRate: React.FC<TokenRateProps> = ({ tokensPerSecond, className = '' }) => {
  if (!tokensPerSecond) return null;

  return (
    <div className={`text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 ${className}`}>
      <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse-gentle" />
      <span>Streaming… {tokensPerSecond.toFixed(0)} tok/s</span>
    </div>
  );
};

// Hook to calculate token rate
export const useTokenRate = (isStreaming: boolean) => {
  const [tokenCount, setTokenCount] = useState(0);
  const [tokensPerSecond, setTokensPerSecond] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isStreaming && !startTime) {
      setStartTime(Date.now());
      setTokenCount(0);
    } else if (!isStreaming) {
      setStartTime(null);
      setTokensPerSecond(0);
    }
  }, [isStreaming]);

  const incrementToken = () => {
    setTokenCount(prev => {
      const newCount = prev + 1;
      if (startTime) {
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        if (elapsed > 0) {
          setTokensPerSecond(newCount / elapsed);
        }
      }
      return newCount;
    });
  };

  return { tokensPerSecond, incrementToken };
};
