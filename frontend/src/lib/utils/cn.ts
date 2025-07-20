/**
 * Conditional Class Name Utility for Engunity AI
 * Next.js 14 + Tailwind CSS + ShadCN UI Project
 * 
 * Purpose: Provides a clean utility function to manage conditional Tailwind classes
 * with conflict resolution and proper type safety.
 * 
 * File: frontend/src/lib/utils/cn.ts
 * Alias: @/lib/utils/cn (if using path aliasing)
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines and merges Tailwind CSS class names with conflict resolution.
 * 
 * This function accepts any number of class name arguments and intelligently
 * merges them while resolving conflicts between Tailwind classes.
 * 
 * @param inputs - Any number of class name values (strings, arrays, objects, etc.)
 * @returns A string of merged and deduplicated class names
 * 
 * @example
 * ```tsx
 * // Basic usage
 * cn('px-4 py-2', 'bg-blue-500') // → 'px-4 py-2 bg-blue-500'
 * 
 * // Conditional classes
 * cn('px-4 py-2', isActive && 'bg-blue-600', disabled && 'opacity-50')
 * 
 * // Override conflicting classes (later classes win)
 * cn('px-4', 'px-6') // → 'px-6'
 * cn('text-sm text-red-500', 'text-lg text-blue-500') // → 'text-lg text-blue-500'
 * 
 * // Arrays and objects
 * cn(['px-4', 'py-2'], { 'bg-blue-500': isActive, 'bg-gray-500': !isActive })
 * 
 * // Complex conditional logic
 * cn(
 *   'inline-flex items-center justify-center rounded-md font-medium transition-colors',
 *   'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
 *   'disabled:pointer-events-none disabled:opacity-50',
 *   {
 *     // Size variants
 *     'h-10 px-4 py-2': size === 'default',
 *     'h-9 rounded-md px-3': size === 'sm',
 *     'h-11 rounded-md px-8': size === 'lg',
 *     
 *     // Color variants
 *     'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
 *     'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
 *     'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
 *   }
 * )
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Alternative export for consistency with some codebases
 * @deprecated Use `cn` instead for consistency
 */
export const classNames = cn;

/**
 * Variant of cn that forces all inputs to be strings for stricter typing
 * Useful when you want to ensure only string classes are passed
 * 
 * @param inputs - String class names only
 * @returns Merged class string
 * 
 * @example
 * ```tsx
 * cnStrict('px-4 py-2', 'bg-blue-500') // ✅ Valid
 * cnStrict('px-4 py-2', { active: true }) // ❌ TypeScript error
 * ```
 */
export function cnStrict(...inputs: string[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Creates a function that applies base classes and allows for additional classes
 * Useful for component variants where you have consistent base styles
 * 
 * @param baseClasses - Base classes that are always applied
 * @returns Function that accepts additional classes
 * 
 * @example
 * ```tsx
 * const buttonBase = createClassBuilder('inline-flex items-center justify-center rounded-md');
 * 
 * // Usage in component
 * <button className={buttonBase('px-4 py-2', isActive && 'bg-blue-500')} />
 * ```
 */
export function createClassBuilder(baseClasses: string) {
  return (...additionalClasses: ClassValue[]): string => {
    return cn(baseClasses, ...additionalClasses);
  };
}

/**
 * Utility to conditionally apply classes based on a condition
 * More readable than inline ternary for complex conditions
 * 
 * @param condition - Boolean condition to check
 * @param trueClasses - Classes to apply when condition is true
 * @param falseClasses - Classes to apply when condition is false (optional)
 * @returns Class string based on condition
 * 
 * @example
 * ```tsx
 * const buttonClasses = conditionalClasses(
 *   isLoading,
 *   'opacity-50 cursor-not-allowed',
 *   'hover:bg-blue-600 active:bg-blue-700'
 * );
 * ```
 */
export function conditionalClasses(
  condition: boolean,
  trueClasses: ClassValue,
  falseClasses?: ClassValue
): string {
  return cn(condition ? trueClasses : falseClasses);
}

/**
 * Utility for creating responsive class variations
 * Helps manage responsive breakpoints more cleanly
 * 
 * @param classes - Object with breakpoint keys and class values
 * @returns Merged responsive classes
 * 
 * @example
 * ```tsx
 * const responsiveClasses = responsive({
 *   base: 'text-sm px-2',
 *   sm: 'text-base px-4',
 *   md: 'text-lg px-6',
 *   lg: 'text-xl px-8'
 * });
 * // → 'text-sm px-2 sm:text-base sm:px-4 md:text-lg md:px-6 lg:text-xl lg:px-8'
 * ```
 */
export function responsive(classes: {
  base?: string;
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
}): string {
  return cn(
    classes.base,
    classes.xs && `xs:${classes.xs}`,
    classes.sm && `sm:${classes.sm}`,
    classes.md && `md:${classes.md}`,
    classes.lg && `lg:${classes.lg}`,
    classes.xl && `xl:${classes.xl}`,
    classes['2xl'] && `2xl:${classes['2xl']}`
  );
}

/**
 * Utility for handling dark mode class variants
 * Simplifies dark mode class management
 * 
 * @param lightClasses - Classes for light mode
 * @param darkClasses - Classes for dark mode
 * @returns Combined light and dark mode classes
 * 
 * @example
 * ```tsx
 * const themeClasses = darkMode(
 *   'bg-white text-gray-900',
 *   'bg-gray-900 text-white'
 * );
 * // → 'bg-white text-gray-900 dark:bg-gray-900 dark:text-white'
 * ```
 */
export function darkMode(lightClasses: string, darkClasses: string): string {
  const darkPrefixed = darkClasses
    .split(' ')
    .map(cls => `dark:${cls}`)
    .join(' ');
  
  return cn(lightClasses, darkPrefixed);
}

/**
 * Pre-configured class builders for common ShadCN UI patterns
 * These provide consistent styling across the Engunity AI platform
 */
export const shadcnVariants = {
  /**
   * Button variant classes following ShadCN UI patterns
   */
  button: {
    base: 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    
    size: {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10',
    },
  },
  
  /**
   * Input variant classes following ShadCN UI patterns
   */
  input: {
    base: 'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  },
  
  /**
   * Card variant classes following ShadCN UI patterns
   */
  card: {
    base: 'rounded-lg border bg-card text-card-foreground shadow-sm',
  },
  
  /**
   * Badge variant classes following ShadCN UI patterns
   */
  badge: {
    base: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
      secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
      outline: 'text-foreground',
    },
  },
};

/**
 * Type definitions for better TypeScript integration
 */
export type ClassNameFunction = typeof cn;
export type ClassBuilder = ReturnType<typeof createClassBuilder>;
export type ShadcnVariant = keyof typeof shadcnVariants;

// Default export for convenience
export default cn;