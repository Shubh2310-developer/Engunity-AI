import React from 'react';
import { User, Bot, Sparkles } from 'lucide-react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  children: React.ReactNode;
  timestamp?: Date;
  isStreaming?: boolean;
  className?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  role,
  children,
  timestamp,
  isStreaming = false,
  className = ''
}) => {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in ${className}`}>
      {/* Avatar - Only show for assistant */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600
            flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      {/* Message Container */}
      <div className="flex-1">
        {/* Message Content */}
        <div className={`
          ${isUser
            ? 'bg-sky-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm'
            : 'bg-white dark:bg-zinc-800/50 rounded-2xl rounded-tl-sm border border-zinc-200 dark:border-zinc-700 shadow-sm px-5 py-4'
          }
          ${isStreaming ? 'animate-pulse-gentle' : ''}
        `}>
          {children}
        </div>

        {/* Timestamp */}
        {timestamp && !isStreaming && (
          <div className={`text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 ${isUser ? 'text-right' : 'text-left'}`}>
            {formatTimestamp(timestamp)}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600
            flex items-center justify-center shadow-md">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

// Format timestamp helper
const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 10) return `${seconds}s ago`;
  return 'Just now';
};
