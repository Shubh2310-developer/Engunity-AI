/**
 * Auth Layout Component for Engunity AI
 * Location: frontend/src/app/(auth)/layout.tsx
 * 
 * Purpose: Shared layout wrapper for authentication pages (login, register, forgot-password)
 * Features: Centered design, branded background, responsive layout, dark mode support
 */

import React from 'react';
import Link from 'next/link';
import { Zap, Sparkles } from 'lucide-react';

// ================================
// 🔧 Type Definitions
// ================================

interface AuthLayoutProps {
  children: React.ReactNode;
}

// ================================
// 🎨 Background Decorative Elements
// ================================

/**
 * Animated background grid pattern
 */
const BackgroundGrid: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Grid Pattern */}
    <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 opacity-50" />
    
    {/* Gradient Overlays */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-transparent to-purple-50/80 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20" />
    
    {/* Floating Orbs */}
    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 dark:bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
    
    {/* Sparkle Elements */}
    <div className="absolute top-20 left-20 text-blue-300/30 dark:text-blue-500/30 animate-twinkle">
      <Sparkles className="w-6 h-6" />
    </div>
    <div className="absolute top-40 right-32 text-purple-300/30 dark:text-purple-500/30 animate-twinkle delay-500">
      <Sparkles className="w-4 h-4" />
    </div>
    <div className="absolute bottom-32 left-16 text-blue-300/30 dark:text-blue-500/30 animate-twinkle delay-1000">
      <Sparkles className="w-5 h-5" />
    </div>
  </div>
);

/**
 * Brand logo component
 */
const BrandLogo: React.FC = () => (
  <Link 
    href="/" 
    className="inline-flex items-center space-x-3 text-2xl font-bold text-gray-900 dark:text-white hover:opacity-80 transition-opacity group"
  >
    <div className="relative">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
        <Zap className="w-6 h-6 text-white" />
      </div>
      {/* Glow effect */}
      <div className="absolute inset-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
    </div>
    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
      Engunity AI
    </span>
  </Link>
);

/**
 * Footer with links
 */
const AuthFooter: React.FC = () => (
  <div className="text-center space-y-4">
    <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
      <Link 
        href="/terms" 
        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        Terms of Service
      </Link>
      <Link 
        href="/privacy" 
        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        Privacy Policy
      </Link>
      <Link 
        href="/help" 
        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        Help Center
      </Link>
    </div>
    
    <p className="text-xs text-gray-500 dark:text-gray-500">
      © 2024 Engunity AI. All rights reserved.
    </p>
  </div>
);

// ================================
// 🎨 Auth Layout Component
// ================================

/**
 * Elegant authentication layout with branded design and animations
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full relative">
      {/* Background Elements */}
      <BackgroundGrid />
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with Logo */}
        <header className="w-full p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <BrandLogo />
          </div>
        </header>
        
        {/* Main Auth Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md space-y-8">
            {/* Content Container with Animation */}
            <div className="animate-fade-in-up">
              {children}
            </div>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="w-full p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <AuthFooter />
          </div>
        </footer>
      </div>
    </div>
  );
};

// ================================
// 🎯 Export Component
// ================================

export default AuthLayout;

// ================================
// 🎨 Custom CSS (Add to globals.css)
// ================================

/*
Add these styles to your globals.css file:

@keyframes fade-in-up {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes twinkle {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.6s ease-out;
}

.animate-twinkle {
  animation: twinkle 2s ease-in-out infinite;
}

.bg-grid-slate-100 {
  background-image: linear-gradient(to right, rgb(241 245 249) 1px, transparent 1px),
                    linear-gradient(to bottom, rgb(241 245 249) 1px, transparent 1px);
  background-size: 3rem 3rem;
}

.dark .bg-grid-slate-800 {
  background-image: linear-gradient(to right, rgb(30 41 59) 1px, transparent 1px),
                    linear-gradient(to bottom, rgb(30 41 59) 1px, transparent 1px);
  background-size: 3rem 3rem;
}
*/

// ================================
// 🧪 Usage Examples (Comments)
// ================================

/*
// This layout automatically wraps all pages in the (auth) folder:

// frontend/src/app/(auth)/login/page.tsx
export default function LoginPage() {
  return <LoginForm />; // Will be wrapped by AuthLayout
}

// frontend/src/app/(auth)/register/page.tsx
export default function RegisterPage() {
  return <RegisterForm />; // Will be wrapped by AuthLayout
}

// frontend/src/app/(auth)/forgot-password/page.tsx
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />; // Will be wrapped by AuthLayout
}

// The layout provides:
// - Consistent branding across all auth pages
// - Responsive design (mobile-first approach)
// - Dark mode support
// - Animated background elements
// - Professional footer with legal links
// - Centered content with proper spacing
// - Brand logo that links back to homepage

// Example file structure:
// frontend/src/app/(auth)/
// ├── layout.tsx                 (This file)
// ├── login/
// │   └── page.tsx
// ├── register/
// │   └── page.tsx
// ├── forgot-password/
// │   └── page.tsx
// └── verify-email/
//     └── page.tsx
*/