/**
 * Professional Skeleton Component
 * 
 * Elegant loading skeletons with smooth animations
 * and comprehensive layout patterns.
 */

import * as React from 'react';
import { VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

// =================================
// Skeleton Variants & Styles
// =================================

const skeletonVariants = cva(
  'animate-pulse rounded-md bg-gradient-to-r',
  {
    variants: {
      variant: {
        default: 'from-slate-200 via-slate-300 to-slate-200 bg-[length:200%_100%] animate-shimmer',
        subtle: 'from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] animate-shimmer',
        modern: 'from-slate-200/80 via-slate-300/80 to-slate-200/80 bg-[length:200%_100%] animate-shimmer backdrop-blur-sm',
        solid: 'bg-slate-200',
        wave: 'from-slate-200 via-slate-300 to-slate-200 bg-[length:400%_100%] animate-wave',
      },
      speed: {
        slow: 'animate-pulse',
        default: '[animation-duration:1.5s]',
        fast: '[animation-duration:1s]',
        ultra: '[animation-duration:0.5s]',
      },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        default: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
      }
    },
    defaultVariants: {
      variant: 'default',
      speed: 'default',
      rounded: 'default',
    },
  }
);

// =================================
// Core Skeleton Component
// =================================

interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string | number;
  height?: string | number;
  aspectRatio?: string;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, speed, rounded, width, height, aspectRatio, style, ...props }, ref) => {
    const skeletonStyle = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      aspectRatio,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, speed, rounded }), className)}
        style={skeletonStyle}
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';

// =================================
// Predefined Skeleton Components
// =================================

const SkeletonText = React.forwardRef<
  HTMLDivElement,
  Omit<SkeletonProps, 'height'> & {
    lines?: number;
    lineHeight?: string;
    gap?: string;
    lastLineWidth?: string;
  }
>(({ lines = 1, lineHeight = '1rem', gap = '0.5rem', lastLineWidth = '75%', className, ...props }, ref) => {
  if (lines === 1) {
    return (
      <Skeleton
        ref={ref}
        className={cn('h-4', className)}
        height={lineHeight}
        {...props}
      />
    );
  }

  return (
    <div ref={ref} className={cn('space-y-2', className)} style={{ gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          {...props}
        />
      ))}
    </div>
  );
});
SkeletonText.displayName = 'SkeletonText';

const SkeletonAvatar = React.forwardRef<
  HTMLDivElement,
  Omit<SkeletonProps, 'rounded'> & {
    size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl' | '2xl';
  }
>(({ size = 'default', className, ...props }, ref) => {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    default: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20',
  };

  return (
    <Skeleton
      ref={ref}
      className={cn(sizeClasses[size], className)}
      rounded="full"
      {...props}
    />
  );
});
SkeletonAvatar.displayName = 'SkeletonAvatar';

const SkeletonButton = React.forwardRef<
  HTMLDivElement,
  Omit<SkeletonProps, 'height'> & {
    size?: 'sm' | 'default' | 'lg';
  }
>(({ size = 'default', className, ...props }, ref) => {
  const sizeClasses = {
    sm: 'h-8 px-6',
    default: 'h-10 px-8',
    lg: 'h-12 px-10',
  };

  return (
    <Skeleton
      ref={ref}
      className={cn(sizeClasses[size], className)}
      rounded="lg"
      {...props}
    />
  );
});
SkeletonButton.displayName = 'SkeletonButton';

const SkeletonCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hasImage?: boolean;
    imageHeight?: string;
    hasAvatar?: boolean;
    textLines?: number;
    hasActions?: boolean;
  }
>(({ 
  className, 
  hasImage = false, 
  imageHeight = '12rem', 
  hasAvatar = false, 
  textLines = 3, 
  hasActions = false,
  ...props 
}, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-slate-200 bg-white p-6 shadow-sm',
      className
    )}
    {...props}
  >
    {hasImage && (
      <Skeleton 
        className="mb-4 w-full" 
        height={imageHeight}
        rounded="lg"
      />
    )}
    
    <div className="space-y-4">
      {hasAvatar && (
        <div className="flex items-center space-x-3">
          <SkeletonAvatar size="sm" />
          <div className="space-y-2">
            <Skeleton height="1rem" width="6rem" />
            <Skeleton height="0.875rem" width="4rem" />
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Skeleton height="1.25rem" width="80%" />
        <SkeletonText lines={textLines} />
      </div>
      
      {hasActions && (
        <div className="flex space-x-2 pt-2">
          <SkeletonButton size="sm" width="5rem" />
          <SkeletonButton size="sm" width="4rem" />
        </div>
      )}
    </div>
  </div>
));
SkeletonCard.displayName = 'SkeletonCard';

// =================================
// Document-specific Skeletons
// =================================

const SkeletonDocumentCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
      className
    )}
    {...props}
  >
    <div className="space-y-3">
      {/* Document thumbnail */}
      <Skeleton className="w-full h-32" rounded="lg" />
      
      {/* Document title */}
      <Skeleton height="1.125rem" width="85%" />
      
      {/* Document metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton width="3rem" height="0.875rem" />
          <Skeleton width="2rem" height="0.875rem" />
        </div>
        <Skeleton width="4rem" height="0.875rem" />
      </div>
      
      {/* Document tags */}
      <div className="flex space-x-2">
        <Skeleton width="3rem" height="1.5rem" rounded="full" />
        <Skeleton width="2.5rem" height="1.5rem" rounded="full" />
      </div>
    </div>
  </div>
));
SkeletonDocumentCard.displayName = 'SkeletonDocumentCard';

const SkeletonDocumentList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    count?: number;
  }
>(({ className, count = 3, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('space-y-4', className)}
    {...props}
  >
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 rounded-lg border border-slate-200">
        {/* Document icon */}
        <Skeleton width="2.5rem" height="2.5rem" rounded="lg" />
        
        {/* Document details */}
        <div className="flex-1 space-y-2">
          <Skeleton height="1rem" width="60%" />
          <div className="flex items-center space-x-4">
            <Skeleton height="0.875rem" width="4rem" />
            <Skeleton height="0.875rem" width="3rem" />
            <Skeleton height="0.875rem" width="5rem" />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-2">
          <Skeleton width="2rem" height="2rem" rounded="lg" />
          <Skeleton width="2rem" height="2rem" rounded="lg" />
        </div>
      </div>
    ))}
  </div>
));
SkeletonDocumentList.displayName = 'SkeletonDocumentList';

const SkeletonChatMessage = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    isUser?: boolean;
    hasAttachment?: boolean;
  }
>(({ className, isUser = false, hasAttachment = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex space-x-3',
      isUser && 'justify-end',
      className
    )}
    {...props}
  >
    {!isUser && <SkeletonAvatar size="sm" />}
    
    <div className={cn(
      'max-w-[70%] space-y-2',
      isUser ? 'items-end' : 'items-start'
    )}>
      {hasAttachment && (
        <div className="flex space-x-2">
          <Skeleton width="8rem" height="6rem" rounded="lg" />
          <Skeleton width="6rem" height="6rem" rounded="lg" />
        </div>
      )}
      
      <div className={cn(
        'rounded-2xl p-3 space-y-2',
        isUser ? 'bg-blue-50' : 'bg-slate-50'
      )}>
        <SkeletonText lines={2} lastLineWidth="60%" />
      </div>
      
      <Skeleton height="0.75rem" width="3rem" />
    </div>
    
    {isUser && <SkeletonAvatar size="sm" />}
  </div>
));
SkeletonChatMessage.displayName = 'SkeletonChatMessage';

// =================================
// Layout Skeletons
// =================================

const SkeletonHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hasActions?: boolean;
  }
>(({ className, hasActions = true, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-between p-6 border-b border-slate-200',
      className
    )}
    {...props}
  >
    <div className="flex items-center space-x-4">
      <Skeleton width="2rem" height="2rem" rounded="lg" />
      <div className="space-y-2">
        <Skeleton height="1.25rem" width="8rem" />
        <Skeleton height="0.875rem" width="6rem" />
      </div>
    </div>
    
    {hasActions && (
      <div className="flex space-x-2">
        <SkeletonButton size="sm" width="4rem" />
        <SkeletonButton size="sm" width="5rem" />
      </div>
    )}
  </div>
));
SkeletonHeader.displayName = 'SkeletonHeader';

const SkeletonSidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    itemCount?: number;
  }
>(({ className, itemCount = 6, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'w-64 border-r border-slate-200 bg-slate-50 p-4 space-y-6',
      className
    )}
    {...props}
  >
    {/* Sidebar header */}
    <div className="space-y-3">
      <Skeleton height="1.5rem" width="70%" />
      <Skeleton height="2.5rem" width="100%" rounded="lg" />
    </div>
    
    {/* Sidebar navigation */}
    <div className="space-y-2">
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-2">
          <Skeleton width="1.5rem" height="1.5rem" rounded="sm" />
          <Skeleton height="1rem" width="60%" />
        </div>
      ))}
    </div>
  </div>
));
SkeletonSidebar.displayName = 'SkeletonSidebar';

// =================================
// Composite Skeleton Layouts
// =================================

const SkeletonDashboard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('min-h-screen bg-slate-50', className)}
    {...props}
  >
    <SkeletonHeader />
    
    <div className="flex">
      <SkeletonSidebar />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} hasAvatar textLines={1} />
          ))}
        </div>
        
        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard hasImage textLines={4} hasActions />
          <SkeletonCard textLines={6} />
        </div>
      </div>
    </div>
  </div>
));
SkeletonDashboard.displayName = 'SkeletonDashboard';

const SkeletonDocumentGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    columns?: number;
    count?: number;
  }
>(({ className, columns = 3, count = 6, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'grid gap-6',
      columns === 1 && 'grid-cols-1',
      columns === 2 && 'grid-cols-1 md:grid-cols-2',
      columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      className
    )}
    {...props}
  >
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonDocumentCard key={index} />
    ))}
  </div>
));
SkeletonDocumentGrid.displayName = 'SkeletonDocumentGrid';

// =================================
// Custom CSS for animations
// =================================

// Add these animations to your global CSS or Tailwind config:
/*
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes wave {
  0% { background-position: -400% 0; }
  100% { background-position: 400% 0; }
}

.animate-shimmer {
  animation: shimmer 2s ease-in-out infinite;
}

.animate-wave {
  animation: wave 3s ease-in-out infinite;
}
*/

// =================================
// Exports
// =================================

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonDocumentCard,
  SkeletonDocumentList,
  SkeletonChatMessage,
  SkeletonHeader,
  SkeletonSidebar,
  SkeletonDashboard,
  SkeletonDocumentGrid,
  skeletonVariants,
  type SkeletonProps,
};