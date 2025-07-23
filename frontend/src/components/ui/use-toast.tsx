'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import toast, { Toaster as HotToaster, type ToastOptions } from 'react-hot-toast';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Bell, 
  Loader2, 
  X, 
  MessageSquare,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =================================
// Types & Interfaces
// =================================

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading' | 'custom';
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

interface CustomToastOptions {
  variant?: ToastVariant;
  title?: string;
  description?: string;
  action?: ToastAction;
  dismissible?: boolean;
  persistent?: boolean;
  duration?: number;
  icon?: React.ReactNode;
  className?: string;
}

// =================================
// Toast Variants & Styles
// =================================

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border-slate-200 bg-white text-slate-900',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        error: 'border-red-200 bg-red-50 text-red-900',
        warning: 'border-amber-200 bg-amber-50 text-amber-900',
        info: 'border-blue-200 bg-blue-50 text-blue-900',
        loading: 'border-indigo-200 bg-indigo-50 text-indigo-900',
        custom: 'border-slate-200 bg-white text-slate-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// =================================
// Toast Component
// =================================

interface ToastProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
  action?: ToastAction;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ 
    className, 
    variant, 
    title, 
    description, 
    action, 
    dismissible = true,
    onDismiss,
    icon,
    ...props 
  }, ref) => {
    const getDefaultIcon = () => {
      switch (variant) {
        case 'success':
          return <CheckCircle className="w-5 h-5 text-emerald-600" />;
        case 'error':
          return <XCircle className="w-5 h-5 text-red-600" />;
        case 'warning':
          return <AlertTriangle className="w-5 h-5 text-amber-600" />;
        case 'info':
          return <Info className="w-5 h-5 text-blue-600" />;
        case 'loading':
          return <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />;
        default:
          return <Bell className="w-5 h-5 text-slate-600" />;
      }
    };

    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {icon || getDefaultIcon()}
          </div>
          
          <div className="flex-1 space-y-1">
            {title && (
              <div className="text-sm font-semibold leading-none tracking-tight">
                {title}
              </div>
            )}
            {description && (
              <div className="text-sm opacity-90 leading-relaxed">
                {description}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                'inline-flex h-8 shrink-0 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors',
                action.variant === 'destructive'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              )}
            >
              {action.label}
            </button>
          )}
          
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute right-2 top-2 rounded-md p-1 text-slate-400 opacity-0 transition-opacity hover:text-slate-900 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }
);
Toast.displayName = 'Toast';

// =================================
// Toast State Management
// =================================

interface ToastState {
  toasts: Array<{
    id: string;
    variant: ToastVariant;
    title?: string;
    description?: string;
    action?: ToastAction;
    dismissible?: boolean;
    persistent?: boolean;
    icon?: React.ReactNode;
  }>;
}

type ToastActionType = {
  type: 'ADD_TOAST' | 'DISMISS_TOAST' | 'REMOVE_TOAST' | 'CLEAR_ALL';
  toast?: ToastState['toasts'][0];
  id?: string;
};

const toastReducer = (state: ToastState, action: ToastActionType): ToastState => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.toast!],
      };
    case 'DISMISS_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, dismissible: false } : t
        ),
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    case 'CLEAR_ALL':
      return {
        ...state,
        toasts: [],
      };
    default:
      return state;
  }
};

let toastCounter = 0;
const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: ToastActionType) {
  memoryState = toastReducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

// =================================
// Main Toast Functions
// =================================

function createToast(options: CustomToastOptions): string {
  const id = (++toastCounter).toString();
  
  const toastOptions: ToastOptions = {
    duration: options.persistent ? Infinity : (options.duration || 4000),
    ...options,
  };

  toast.custom(
    (t) => (
      <Toast
        variant={options.variant || 'default'}
        title={options.title}
        description={options.description}
        action={options.action}
        dismissible={options.dismissible !== false}
        onDismiss={() => toast.dismiss(t.id)}
        icon={options.icon}
        className={options.className}
      />
    ),
    {
      id,
      ...toastOptions,
    }
  );

  return id;
}

// =================================
// Toast Utility Functions
// =================================

export const toastFunctions = {
  show: (message: string, options?: CustomToastOptions) => {
    return createToast({
      description: message,
      ...options,
    });
  },

  success: (message: string, options?: Omit<CustomToastOptions, 'variant'>) => {
    return createToast({
      variant: 'success',
      description: message,
      ...options,
    });
  },

  error: (message: string, options?: Omit<CustomToastOptions, 'variant'>) => {
    return createToast({
      variant: 'error',
      description: message,
      ...options,
    });
  },

  warning: (message: string, options?: Omit<CustomToastOptions, 'variant'>) => {
    return createToast({
      variant: 'warning',
      description: message,
      ...options,
    });
  },

  info: (message: string, options?: Omit<CustomToastOptions, 'variant'>) => {
    return createToast({
      variant: 'info',
      description: message,
      ...options,
    });
  },

  loading: (message: string, options?: Omit<CustomToastOptions, 'variant'>) => {
    return createToast({
      variant: 'loading',
      description: message,
      persistent: true,
      ...options,
    });
  },

  custom: (options: CustomToastOptions) => {
    return createToast(options);
  },

  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    const id = toastFunctions.loading(options.loading);
    
    promise
      .then((data) => {
        toast.dismiss(id);
        const message = typeof options.success === 'function' 
          ? options.success(data) 
          : options.success;
        toastFunctions.success(message);
      })
      .catch((error) => {
        toast.dismiss(id);
        const message = typeof options.error === 'function' 
          ? options.error(error) 
          : options.error;
        toastFunctions.error(message);
      });
    
    return promise;
  },

  dismiss: (id: string) => {
    toast.dismiss(id);
  },

  dismissAll: () => {
    toast.dismiss();
  },
};

// =================================
// useToast Hook
// =================================

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    toast: toastFunctions.show,
    ...toastFunctions,
    toasts: state.toasts,
  };
}

// =================================
// Toaster Component
// =================================

interface ToasterProps {
  position?: ToastPosition;
  hotToasterProps?: React.ComponentProps<typeof HotToaster>;
}

export function Toaster({ 
  position = 'top-right',
  hotToasterProps,
  ...props 
}: ToasterProps) {
  const positionMap: Record<ToastPosition, any> = {
    'top-left': 'top-left',
    'top-center': 'top-center', 
    'top-right': 'top-right',
    'bottom-left': 'bottom-left',
    'bottom-center': 'bottom-center',
    'bottom-right': 'bottom-right',
  };

  return (
    <HotToaster
      position={positionMap[position]}
      containerClassName="font-sans"
      containerStyle={{
        zIndex: 999999,
      }}
      toastOptions={{
        duration: 4000,
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
          margin: 0,
        },
        className: 'font-sans',
      }}
      {...hotToasterProps}
      {...props}
    />
  );
}

// =================================
// Document-specific Toast Helpers
// =================================

export const documentToast = {
  uploadStart: (filename: string) => {
    return toastFunctions.loading(`Uploading ${filename}...`, {
      icon: <Zap className="w-5 h-5 text-indigo-600 animate-pulse" />,
    });
  },

  uploadSuccess: (filename: string) => {
    return toastFunctions.success(`${filename} uploaded successfully`, {
      title: 'Upload Complete',
    });
  },

  uploadError: (filename: string, error?: string) => {
    return toastFunctions.error(
      error || `Failed to upload ${filename}`,
      {
        title: 'Upload Failed',
        action: {
          label: 'Retry',
          onClick: () => {
            // Handle retry logic
          },
        },
      }
    );
  },

  processingStart: (filename: string) => {
    return toastFunctions.loading(`Processing ${filename}...`, {
      icon: <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />,
    });
  },

  processingComplete: (filename: string) => {
    return toastFunctions.success(`${filename} is ready for Q&A`, {
      title: 'Processing Complete',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    });
  },

  qaResponse: (confidence: number) => {
    const variant = confidence > 0.8 ? 'success' : confidence > 0.6 ? 'info' : 'warning';
    const message = confidence > 0.8 
      ? 'High confidence response generated'
      : confidence > 0.6
      ? 'Moderate confidence response'
      : 'Low confidence - please verify response';
    
    return toastFunctions.custom({
      variant,
      description: message,
      icon: <MessageSquare className="w-5 h-5" />,
    });
  },

  shareSuccess: (type: 'link' | 'email') => {
    return toastFunctions.success(
      type === 'link' ? 'Share link copied to clipboard' : 'Document shared successfully',
      {
        title: 'Shared',
      }
    );
  },

  deleteConfirm: (filename: string, onConfirm: () => void) => {
    return toastFunctions.custom({
      variant: 'warning',
      title: 'Delete Document',
      description: `Are you sure you want to delete ${filename}?`,
      persistent: true,
      action: {
        label: 'Delete',
        onClick: onConfirm,
        variant: 'destructive',
      },
    });
  },
};

// =================================
// Exports
// =================================

export { 
  Toast, 
  toastVariants,
  type ToastProps,
  type CustomToastOptions,
  type ToastVariant,
  type ToastPosition,
  type ToastAction,
};