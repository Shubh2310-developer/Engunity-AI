import React from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { UserProvider } from '@/contexts/UserContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { EnhancedSettingsProvider } from '@/contexts/EnhancedSettingsContext';


import type { Metadata, Viewport } from 'next';

import './globals.css';

// =================================
// Professional Font Configuration
// =================================

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
  preload: true,
});

// =================================
// SEO & Metadata Configuration
// =================================

export const metadata: Metadata = {
  title: {
    default: 'Engunity AI – The Future of Engineering Intelligence',
    template: '%s | Engunity AI',
  },
  description:
    'AI-powered code generation, research tools, data analysis, and documentation platform. Transform your development workflow with cutting-edge artificial intelligence technology.',
  
  keywords: [
    'AI platform',
    'engineering intelligence',
    'code generation',
    'research assistant',
    'data analysis',
    'document processing',
    'artificial intelligence',
    'machine learning',
    'SaaS platform',
    'developer tools',
    'automation',
    'productivity',
    'enterprise AI',
    'team collaboration',
    'smart contracts',
    'blockchain security',
  ],
  
  authors: [{ name: 'Engunity AI', url: 'https://engunity-ai.com' }],
  creator: 'Engunity AI',
  publisher: 'Engunity AI',
  
  metadataBase: new URL('https://engunity-ai.vercel.app'),
  
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://engunity-ai.vercel.app',
    title: 'Engunity AI – The Future of Engineering Intelligence',
    description:
      'Transform your development workflow with AI-powered code generation, intelligent document analysis, advanced research tools, and enterprise-grade security features.',
    siteName: 'Engunity AI',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Engunity AI - AI-Powered Engineering Platform',
        type: 'image/png',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    site: '@engunity_ai',
    creator: '@engunity_ai',
    title: 'Engunity AI – The Future of Engineering Intelligence',
    description:
      'AI-powered platform for code generation, research, and data analysis.',
    images: ['/images/twitter-card.png'],
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  manifest: '/manifest.json',
  
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/logo/Logo.jpeg', sizes: '32x32', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/images/logo/Logo.jpeg', sizes: '180x180', type: 'image/jpeg' },
    ],
    other: [
      { rel: 'mask-icon', url: '/images/logo/Logo.jpeg', color: '#0f172a' },
    ],
  },
  
  category: 'technology',
  classification: 'Business',
  
  ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION && {
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    },
  }),
  
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
    },
  },
  
  applicationName: 'Engunity AI',
  referrer: 'origin-when-cross-origin',
  generator: 'Next.js',
  
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Engunity AI',
    'msapplication-TileColor': '#0f172a',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#ffffff',
  },
};

// =================================
// Viewport Configuration
// =================================

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  colorScheme: 'light dark',
  viewportFit: 'cover',
};

// =================================
// Structured Data Schema
// =================================

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Engunity AI',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  description: 'AI-powered platform for code generation, research, and data analysis',
  url: 'https://engunity-ai.vercel.app',
  author: {
    '@type': 'Organization',
    name: 'Engunity AI',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    priceValidUntil: '2025-12-31',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1247',
  },
};

// =================================
// Root Layout Component
// =================================

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html 
      lang="en" 
      className="scroll-smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Performance optimizations */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//api.groq.com" />
        <link rel="dns-prefetch" href="//supabase.co" />
        <link rel="dns-prefetch" href="//vercel.com" />
        <link rel="dns-prefetch" href="//analytics.vercel.app" />
        
        {/* Preload critical resources */}
        
        {/* Note: Security headers are handled by next.config.js */}
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
        
        {/* Performance and UX hints */}
        <meta httpEquiv="Accept-CH" content="DPR, Viewport-Width, Width, Save-Data" />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        
        {/* Progressive Web App meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Engunity AI" />
        <meta name="application-name" content="Engunity AI" />
        
        {/* Microsoft specific */}
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="msapplication-TileImage" content="/mstile-144x144.png" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        
        {/* Analytics (Production Only) */}
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}', {
                    page_title: document.title,
                    page_location: window.location.href,
                    custom_map: {'dimension1': 'user_type'},
                    send_page_view: true
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      
      <body
        className={`
          ${inter.variable} 
          ${jetbrainsMono.variable} 
          font-sans 
          antialiased 
          bg-white
          text-gray-900
          selection:bg-blue-100 
          selection:text-blue-900
          scrollbar-thin 
          scrollbar-track-slate-100 
          scrollbar-thumb-slate-300
          scrollbar-thumb-hover:slate-400
        `}
        suppressHydrationWarning
      >
        {/* Skip Navigation for Accessibility */}
        <a
          href="#main-content"
          className="
            sr-only 
            focus:not-sr-only 
            focus:absolute 
            focus:top-4 
            focus:left-4 
            focus:z-[9999] 
            focus:px-6 
            focus:py-3
            focus:bg-slate-900 
            focus:text-white 
            focus:rounded-lg 
            focus:font-medium
            focus:shadow-2xl
            focus:outline-none 
            focus:ring-4 
            focus:ring-blue-500/50
            transition-all 
            duration-200
          "
        >
          Skip to main content
        </a>

        {/* Professional Background System */}
        <div className="fixed inset-0 -z-50 overflow-hidden">
          {/* Primary white background */}
          <div 
            className="
              absolute inset-0 
              bg-white
            " 
          />
          
          {/* Subtle geometric pattern overlay */}
          <div 
            className="
              absolute inset-0 
              opacity-[0.015]
              bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23000000%22 fill-opacity=%221%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221%22%3E%3C/circle%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]
            " 
          />
          
          {/* Professional grid pattern */}
          <div 
            className="
              absolute inset-0 
              opacity-[0.02]
              bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)]
              bg-[size:24px_24px]
            " 
          />
          
          {/* Subtle radial gradient for depth */}
          <div 
            className="
              absolute inset-0 
              bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.03),transparent)]
            " 
          />
        </div>

        {/* Main Application Container */}
        <div 
          id="app-root"
          className="
            relative 
            min-h-screen 
            flex 
            flex-col
            isolation-auto
          "
        >
          {/* Professional noise texture overlay for premium feel */}
          <div 
            className="
              fixed inset-0 
              pointer-events-none 
              z-[1]
              opacity-[0.008]
              bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]
            "
          />

          {/* Main Content Area */}
          <main 
            id="main-content"
            className="
              relative 
              flex-1 
              flex 
              flex-col
              z-10
            "
            role="main"
          >
            <LoadingProvider showInitialLoading={true}>
              <UserProvider>
                <SettingsProvider>
                  <EnhancedSettingsProvider>
                    {children}
                  </EnhancedSettingsProvider>
                </SettingsProvider>
              </UserProvider>
            </LoadingProvider>
          </main>
        </div>

        {/* Professional Toast Notification System */}
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={12}
          containerClassName="font-sans"
          containerStyle={{
            top: 24,
            right: 24,
            zIndex: 9999,
          }}
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.95)',
              color: 'rgb(15, 23, 42)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(12px)',
              fontSize: '14px',
              fontWeight: '500',
              padding: '16px 20px',
              maxWidth: '420px',
            },
            
            success: {
              iconTheme: {
                primary: 'rgb(34, 197, 94)',
                secondary: 'rgb(255, 255, 255)',
              },
              style: {
                borderColor: 'rgba(34, 197, 94, 0.2)',
                background: 'rgba(240, 253, 244, 0.95)',
              },
            },
            
            error: {
              iconTheme: {
                primary: 'rgb(239, 68, 68)',
                secondary: 'rgb(255, 255, 255)',
              },
              style: {
                borderColor: 'rgba(239, 68, 68, 0.2)',
                background: 'rgba(254, 242, 242, 0.95)',
              },
            },
            
            loading: {
              iconTheme: {
                primary: 'rgb(59, 130, 246)',
                secondary: 'rgb(255, 255, 255)',
              },
              style: {
                borderColor: 'rgba(59, 130, 246, 0.2)',
                background: 'rgba(239, 246, 255, 0.95)',
              },
            },
          }}
        />

        {/* Production Analytics & Monitoring */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}

        {/* Portal Containers for Advanced UI Components */}
        <div id="modal-root" className="relative z-[9998]" />
        <div id="tooltip-root" className="relative z-[9997]" />
        <div id="popover-root" className="relative z-[9996]" />
        <div id="dropdown-root" className="relative z-[9995]" />
        <div id="overlay-root" className="relative z-[9994]" />
        
        {/* Service Worker Registration (Production Only) */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js', {
                      scope: '/'
                    }).then(function(registration) {
                      console.log('✅ Service Worker registered successfully:', registration.scope);
                      
                      // Check for updates
                      registration.addEventListener('updatefound', function() {
                        console.log('🔄 Service Worker update found');
                      });
                    }).catch(function(error) {
                      console.log('❌ Service Worker registration failed:', error);
                    });
                  });
                }
                
                // Performance monitoring
                if ('web-vitals' in window) {
                  import('web-vitals').then(({getCLS, getFID, getFCP, getLCP, getTTFB}) => {
                    getCLS(console.log);
                    getFID(console.log);
                    getFCP(console.log);
                    getLCP(console.log);
                    getTTFB(console.log);
                  });
                }
              `,
            }}
          />
        )}

        {/* Loading Performance Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Professional loading performance tracking
              window.addEventListener('load', function() {
                const loadTime = window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart;
                console.log('🚀 Page loaded in:', loadTime + 'ms');
                
                // Track loading performance
                if (typeof gtag !== 'undefined') {
                  gtag('event', 'page_load_time', {
                    'event_category': 'Performance',
                    'event_label': 'Load Time',
                    'value': Math.round(loadTime)
                  });
                }
              });
              
              // Professional error boundary
              window.addEventListener('error', function(e) {
                console.error('🔥 Global error:', e.error);
                if (typeof gtag !== 'undefined') {
                  gtag('event', 'exception', {
                    'description': e.error?.message || 'Unknown error',
                    'fatal': false
                  });
                }
              });
              
              // Unhandled promise rejection tracking
              window.addEventListener('unhandledrejection', function(e) {
                console.error('🔥 Unhandled promise rejection:', e.reason);
                if (typeof gtag !== 'undefined') {
                  gtag('event', 'exception', {
                    'description': e.reason?.message || 'Unhandled promise rejection',
                    'fatal': false
                  });
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}