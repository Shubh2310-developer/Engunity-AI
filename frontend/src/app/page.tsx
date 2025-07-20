'use client';

import React, { useEffect, useState } from 'react';
import { motion, useInView, useAnimation, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import Typewriter from 'typewriter-effect';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { supabase } from '@/lib/auth/supabase';
import { 
  MessageSquare, 
  Code, 
  FileText, 
  BarChart3, 
  BookOpen, 
  Shield,
  ArrowRight,
  Play,
  CheckCircle,
  
  Zap,
  Menu,
  X,
  Sparkles,
  LogIn,
  User,
  type LucideIcon
} from 'lucide-react';

// Animation variants for different components
const fadeInUp = {
  hidden: { 
    opacity: 0, 
    y: 60,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};


const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

const floatingAnimation = {
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Custom hook for intersection observer with Framer Motion
const useScrollAnimation = () => {
  const controls = useAnimation();
  const ref = React.useRef(null);
  const inView = useInView(ref, {
    amount: 0.2,
    once: true
  });

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);

  return [ref, controls] as const;
};

// Enhanced Animated Counter with Framer Motion
interface AnimatedCounterProps {
  target: number;
  duration?: number;
  suffix?: string;
  title: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ target, duration = 2.5, suffix = "", title }) => {
  const [ref, controls] = useScrollAnimation();

  return (
    <motion.div 
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={scaleIn}
      className="text-center group"
    >
      <motion.div 
        className="relative p-6 rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-sm 
                   hover:border-blue-300 hover:shadow-xl transition-all duration-500
                   hover:bg-white/80"
        whileHover={{ 
          scale: 1.05,
          boxShadow: "0 20px 40px rgba(59, 130, 246, 0.15)"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Glow effect */}
        <motion.div 
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          whileHover={{ opacity: 1 }}
        />
        
        <motion.div 
          className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease: "backOut" }}
        >
          <CountUp
            start={0}
            end={target}
            duration={duration}
            suffix={suffix}
            enableScrollSpy={true}
            scrollSpyOnce={true}
          />
        </motion.div>
        
        <motion.div 
          className="text-slate-600 font-medium text-sm md:text-base"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {title}
        </motion.div>
        
        {/* Sparkle effect */}
        <motion.div
          className="absolute top-2 right-2 text-blue-400 opacity-0 group-hover:opacity-100"
          animate={{ 
            rotate: [0, 180, 360],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Sparkles size={16} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// Enhanced Feature Card with sophisticated animations
interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, delay = 0 }) => {
  const [ref, controls] = useScrollAnimation();

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={fadeInUp}
      transition={{ delay: delay * 0.1 }}
      className="group"
    >
      <motion.div
        className="relative overflow-hidden bg-white/80 backdrop-blur-sm border border-slate-200 
                   rounded-2xl transition-all duration-500 h-full"
        whileHover={{ 
          y: -8,
          scale: 1.02,
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15)"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Gradient border effect */}
        <motion.div 
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        />
        
        {/* Subtle particle effect */}
        <motion.div
          className="absolute top-4 right-4 w-2 h-2 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <div className="relative p-8 z-10">
          <motion.div 
            className="mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div 
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 
                         flex items-center justify-center shadow-lg"
              whileHover={{ 
                scale: 1.1,
                rotate: 360,
                boxShadow: "0 10px 30px rgba(59, 130, 246, 0.4)"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Icon className="w-7 h-7 text-white" />
              </motion.div>
            </motion.div>
          </motion.div>
          
          <motion.h3 
            className="text-xl font-semibold text-slate-900 mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {title}
          </motion.h3>
          
          <motion.p 
            className="text-slate-600 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {description}
          </motion.p>
        </div>

        {/* Shimmer effect on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                     transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
          style={{ width: '50%' }}
        />
      </motion.div>
    </motion.div>
  );
};

// Pricing card component
interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
  ctaText?: string;
}

const PricingCard: React.FC<PricingCardProps> = ({ title, price, period, features, highlighted = false, ctaText = "Get Started" }) => {
  const [ref, controls] = useScrollAnimation();

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={fadeInUp}
      className="group"
    >
      <Card 
        className={`
          relative overflow-hidden transition-all duration-500 hover:-translate-y-2
          ${highlighted 
            ? 'bg-slate-900 border-slate-800 shadow-2xl scale-105' 
            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl'
          }
        `}
      >
      {highlighted && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1 shadow-lg">
            Most Popular
          </Badge>
        </div>
      )}
      
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h3 className={`text-2xl font-bold mb-2 ${highlighted ? 'text-white' : 'text-slate-900'}`}>
            {title}
          </h3>
          <div className="mb-4">
            <span className={`text-5xl font-bold ${highlighted ? 'text-white' : 'text-slate-900'}`}>
              {price}
            </span>
            {period && (
              <span className={`text-lg ${highlighted ? 'text-slate-300' : 'text-slate-500'}`}>
                /{period}
              </span>
            )}
          </div>
        </div>
        
        <ul className="space-y-4 mb-8">
          {features.map((feature: string, index: number) => (
            <li key={index} className="flex items-start">
              <CheckCircle className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${highlighted ? 'text-green-400' : 'text-green-500'}`} />
              <span className={highlighted ? 'text-slate-300' : 'text-slate-600'}>
                {feature}
              </span>
            </li>
          ))}
        </ul>
        
        <Button 
          className={`w-full py-3 transition-all duration-300 ${
            highlighted 
              ? 'bg-white text-slate-900 hover:bg-slate-100' 
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {ctaText}
        </Button>
      </CardContent>
    </Card>
    </motion.div>
  );
};

// Enhanced Navigation with smooth animations
const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = () => {
    router.push('/login');
  };

  const handleGetStarted = () => {
    if (user) {
      // If user is logged in, go to dashboard
      router.push('/dashboard');
    } else {
      // If not logged in, go to register
      router.push('/register');
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`
        fixed top-0 w-full z-50 transition-all duration-500
        ${scrolled 
          ? 'bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-lg' 
          : 'bg-transparent'
        }
      `}
    >
      <div className="w-full px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo - Positioned to extreme left */}
          <motion.div 
            className="flex items-center space-x-3 flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <motion.div 
              className="w-12 h-12 rounded-full bg-white/95 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center shadow-xl overflow-hidden"
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3), 0 0 0 2px rgba(59, 130, 246, 0.2)"
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <img 
                src="/images/logo/Logo.jpeg" 
                alt="Engunity AI Logo" 
                className="w-10 h-10 object-cover rounded-full"
              />
            </motion.div>
            <span className="text-xl font-bold text-slate-900">
              Engunity AI
            </span>
          </motion.div>

          {/* Desktop Navigation - Positioned to the right */}
          <motion.div 
            className="hidden md:flex items-center space-x-8 flex-shrink-0"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {['Features', 'Pricing', 'About'].map((item, index) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-slate-600 hover:text-slate-900 transition-colors font-medium relative"
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
              >
                {item}
                <motion.span
                  className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600"
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.3 }}
                />
              </motion.a>
            ))}
            
            {!isLoading && (
              <>
                {user ? (
                  // Authenticated user menu
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7, duration: 0.4 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        className="bg-slate-900 text-white hover:bg-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
                        onClick={handleGetStarted}
                      >
                        <User size={16} />
                        Dashboard
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8, duration: 0.4 }}
                    >
                      <Button 
                        variant="outline" 
                        className="border-slate-300 text-slate-700 hover:bg-slate-50 transition-all duration-300 hover:border-red-300 flex items-center gap-2"
                        onClick={handleSignOut}
                      >
                        Sign Out
                      </Button>
                    </motion.div>
                  </>
                ) : (
                  // Non-authenticated user menu
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7, duration: 0.4 }}
                    >
                      <Button 
                        variant="outline" 
                        className="border-slate-300 text-slate-700 hover:bg-slate-50 transition-all duration-300 hover:border-blue-300 flex items-center gap-2"
                        onClick={handleSignIn}
                      >
                        <LogIn size={16} />
                        Sign In
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8, duration: 0.4 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        className="bg-slate-900 text-white hover:bg-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl"
                        onClick={handleGetStarted}
                      >
                        Get Started
                      </Button>
                    </motion.div>
                  </>
                )}
              </>
            )}
          </motion.div>

          {/* Mobile menu button */}
          <motion.button 
            className="md:hidden p-2 flex-shrink-0"
            onClick={() => setIsOpen(!isOpen)}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="w-6 h-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="px-2 pt-2 pb-3 space-y-1"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {['Features', 'Pricing', 'About'].map((item) => (
                  <motion.a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="block px-3 py-2 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
                    variants={fadeInUp}
                    whileTap={{ scale: 0.98 }}
                  >
                    {item}
                  </motion.a>
                ))}
                <motion.div 
                  className="pt-4 flex flex-col space-y-2"
                  variants={fadeInUp}
                >
                  {!isLoading && (
                    <>
                      {user ? (
                        <>
                          <Button 
                            className="bg-slate-900 text-white flex items-center justify-center gap-2"
                            onClick={handleGetStarted}
                          >
                            <User size={16} />
                            Dashboard
                          </Button>
                          <Button 
                            variant="outline" 
                            className="border-slate-300 text-slate-700"
                            onClick={handleSignOut}
                          >
                            Sign Out
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            className="border-slate-300 text-slate-700 flex items-center justify-center gap-2"
                            onClick={handleSignIn}
                          >
                            <LogIn size={16} />
                            Sign In
                          </Button>
                          <Button 
                            className="bg-slate-900 text-white"
                            onClick={handleGetStarted}
                          >
                            Get Started
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

// Main landing page component
const LandingPageContent = () => {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleStartFreeTrial = () => {
    if (user) {
      // If user is logged in, go to dashboard
      router.push('/dashboard');
    } else {
      // If not logged in, go to register
      router.push('/register');
    }
  };

  const handleWatchDemo = () => {
    router.push('/demo');
  };

  const features = [
    {
      icon: MessageSquare,
      title: "Intelligent Chat Assistant",
      description: "Advanced AI conversations powered by state-of-the-art language models. Get instant answers, brainstorm ideas, and solve complex problems with natural language processing."
    },
    {
      icon: Code,
      title: "Code Generation & Review",
      description: "Generate, debug, and optimize code across multiple programming languages. From simple functions to complex applications with intelligent suggestions and best practices."
    },
    {
      icon: FileText,
      title: "Document Intelligence",
      description: "Upload PDFs, Word documents, and extract actionable insights. Ask questions about your documents and get contextual answers with source citations."
    },
    {
      icon: BarChart3,
      title: "Data Analysis Platform",
      description: "Upload CSV and Excel files for comprehensive data analysis. Generate visualizations, statistical insights, and automated reports with AI-powered recommendations."
    },
    {
      icon: BookOpen,
      title: "Research & Citation Tools",
      description: "Academic writing support with citation management, text summarization, and literature review assistance. Perfect for researchers and students."
    },
    {
      icon: Shield,
      title: "Web3 Security Audit",
      description: "Smart contract auditing and blockchain security analysis. Identify vulnerabilities and ensure your decentralized applications are secure and optimized."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <Navigation />

      {/* Enhanced Hero Section with Sophisticated Animations */}
      <section className="relative min-h-screen flex flex-col md:flex-row items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <motion.div 
            className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-10"
            animate={floatingAnimation.animate}
          />
          <motion.div 
            className="absolute top-0 right-0 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-10"
            animate={{
              y: [10, -10, 10],
              transition: {
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          />
          <motion.div 
            className="absolute bottom-0 left-1/2 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-10"
            animate={{
              y: [-5, 15, -5],
              transition: {
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          />
          
          {/* Particle Network Effect */}
          <motion.div 
            className="absolute inset-0 opacity-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.05 }}
            transition={{ duration: 2 }}
          >
            <svg className="w-full h-full" viewBox="0 0 1920 1080">
              <motion.circle 
                cx="200" cy="200" r="2" fill="currentColor"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.circle 
                cx="800" cy="300" r="2" fill="currentColor"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.9, 0.4]
                }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
              />
              <motion.circle 
                cx="1400" cy="400" r="2" fill="currentColor"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0.7, 0.2]
                }}
                transition={{ duration: 5, repeat: Infinity, delay: 2 }}
              />
              <motion.line 
                x1="200" y1="200" x2="800" y2="300" 
                stroke="currentColor" strokeWidth="1" opacity="0.2"
                animate={{
                  pathLength: [0, 1, 0],
                  opacity: [0, 0.3, 0]
                }}
                transition={{ duration: 6, repeat: Infinity }}
              />
            </svg>
          </motion.div>
        </div>

        {/* Enhanced Video Section */}
        <motion.div
          className="relative z-10 w-full md:w-2/3 p-8"
          initial={{ opacity: 0, y: 80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            duration: 1.2, 
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: 0.3 
          }}
        >
          <motion.div
            className="relative group"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Video container with glassmorphism effect */}
            <motion.div
              className="relative overflow-hidden rounded-3xl shadow-2xl bg-white/10 backdrop-blur-sm border border-white/20"
              initial={{ rotateX: 15, rotateY: 5 }}
              whileInView={{ rotateX: 0, rotateY: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              viewport={{ once: true, margin: "-50px" }}
            >
              {/* Animated border gradient */}
              <motion.div
                className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 opacity-20 blur-xl"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.2, 0.4, 0.2]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Video element */}
              <motion.video
                className="relative w-full h-auto rounded-3xl shadow-inner"
                autoPlay
                muted
                loop
                playsInline
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                whileHover={{ scale: 1.01 }}
              >
                <source src="/videos/video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </motion.video>

              {/* Floating particles around video */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-60"
                  animate={{
                    x: [0, Math.random() * 100 - 50],
                    y: [0, Math.random() * 100 - 50],
                    scale: [0.5, 1, 0.5],
                    opacity: [0.3, 0.8, 0.3]
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.5
                  }}
                  style={{
                    top: `${20 + Math.random() * 60}%`,
                    left: `${10 + Math.random() * 80}%`,
                  }}
                />
              ))}

              {/* Corner accent elements */}
              <motion.div
                className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-blue-400 rounded-tl-lg opacity-60"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.8, duration: 0.6, ease: "backOut" }}
              />
              <motion.div
                className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-purple-400 rounded-tr-lg opacity-60"
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 1, duration: 0.6, ease: "backOut" }}
              />
              <motion.div
                className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-indigo-400 rounded-bl-lg opacity-60"
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 1.2, duration: 0.6, ease: "backOut" }}
              />
              <motion.div
                className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-blue-400 rounded-br-lg opacity-60"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 1.4, duration: 0.6, ease: "backOut" }}
              />
            </motion.div>

            {/* Video caption */}
            <motion.div
              className="text-center mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.6 }}
            >
              <motion.p
                className="text-slate-600 text-sm font-medium"
                animate={{
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Experience the Power of Engunity AI
              </motion.p>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div 
          className="relative z-10 w-full md:w-1/3 p-4 flex flex-col items-start min-h-[320px] overflow-visible"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="mb-8"
            variants={scaleIn}
          >
            <motion.div
              className="inline-block"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Badge className="bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 mb-8 shadow-lg">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="inline-block mr-2"
                >
                  <Zap className="w-4 h-4" />
                </motion.div>
                <Typewriter
                  options={{
                    strings: [
                      'Powered by Advanced AI Technology',
                      'Empowering Engineers with AI',
                      'The Future is Here'
                    ],
                    autoStart: true,
                    loop: true,
                    delay: 75,
                    deleteSpeed: 25,
                  }}
                />
              </Badge>
            </motion.div>
          </motion.div>
          
          <motion.h1 
            className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight break-words whitespace-normal w-full"
            variants={fadeInUp}
          >
            <motion.span
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              The Future of
            </motion.span>
            <motion.span 
              className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 1, ease: "backOut" }}
            >
              Engineering Intelligence
            </motion.span>
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-slate-600 mb-12 max-w-4xl mx-auto leading-relaxed"
            variants={fadeInUp}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            Transform your development workflow with AI-powered code generation, intelligent document analysis, 
            advanced research tools, and enterprise-grade security features.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={scaleIn}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="lg" 
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                onClick={handleStartFreeTrial}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 hover:opacity-20 transition-opacity duration-300"
                  whileHover={{ opacity: 0.2 }}
                />
{user ? 'Go to Dashboard' : 'Start Free Trial'}
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="ml-2 inline-block"
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </Button>
            </motion.div>
            
            <motion.div
              variants={scaleIn}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="lg" 
                variant="outline" 
                className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-4 text-lg font-medium transition-all duration-300 hover:border-blue-300"
                onClick={handleWatchDemo}
              >
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </Button>
            </motion.div>
          </motion.div>
          
          {/* Enhanced Statistics with Individual Animations */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto"
            style={{ minHeight: '120px' }}
          >
            <AnimatedCounter target={50} suffix="K+" title="Active Users" />
            <AnimatedCounter target={1} suffix="M+" title="Lines of Code" />
            <AnimatedCounter target={99} suffix=".9%" title="Uptime" />
            <AnimatedCounter target={150} suffix="+" title="Countries" />
          </motion.div>
        </motion.div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-24 bg-white relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div 
            className="text-center mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div
              variants={scaleIn}
              className="inline-block"
            >
              <Badge className="bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 mb-6 shadow-sm">
                Core Features
              </Badge>
            </motion.div>
            
            <motion.h2 
              className="text-4xl md:text-5xl font-bold text-slate-900 mb-6"
              variants={fadeInUp}
            >
              Everything you need to excel
            </motion.h2>
            
            <motion.p 
              className="text-xl text-slate-600 max-w-3xl mx-auto"
              variants={fadeInUp}
            >
              Comprehensive AI-powered tools designed for developers, researchers, and data analysts
            </motion.p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {features.map((feature, index: number) => (
              <FeatureCard 
                key={index} 
                icon={feature.icon} 
                title={feature.title} 
                description={feature.description}
                delay={index}
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Enhanced Pricing Section with Scroll Animations */}
      <section id="pricing" className="py-24 bg-slate-50 relative overflow-hidden">
        {/* Animated background elements */}
        <motion.div 
          className="absolute top-0 left-0 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-5"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-0 right-0 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-5"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div 
            className="text-center mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div
              variants={scaleIn}
              className="inline-block"
            >
              <Badge className="bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 mb-6">
                Pricing Plans
              </Badge>
            </motion.div>
            <motion.h2 
              className="text-4xl md:text-5xl font-bold text-slate-900 mb-6"
              variants={fadeInUp}
            >
              Choose the perfect plan
            </motion.h2>
            <motion.p 
              className="text-xl text-slate-600 max-w-3xl mx-auto"
              variants={fadeInUp}
            >
              Start free and scale as you grow. All plans include our core AI features with premium support.
            </motion.p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            <PricingCard 
              title="Starter"
              price="$0"
              period="month"
              features={[
                "100 AI chat messages",
                "5 document uploads per month",
                "Basic code generation",
                "Community support",
                "Standard templates"
              ]}
              ctaText="Get Started Free"
            />
            
            <PricingCard 
              title="Professional"
              price="$29"
              period="month"
              features={[
                "Unlimited AI conversations",
                "Unlimited document uploads",
                "Advanced code generation",
                "Priority email support",
                "Notebook interface",
                "Data analysis tools",
                "Custom templates"
              ]}
              highlighted={true}
              ctaText="Start Free Trial"
            />
            
            <PricingCard 
              title="Enterprise"
              price="$99"
              period="month"
              features={[
                "Everything in Professional",
                "Custom AI model training",
                "API access & integrations",
                "Team collaboration tools",
                "White-label solutions",
                "Dedicated account manager",
                "SLA guarantee"
              ]}
              ctaText="Contact Sales"
            />
          </motion.div>
        </div>
      </section>

      {/* Enhanced CTA Section with Scroll Animations */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        {/* Animated background elements */}
        <motion.div 
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <motion.div 
            className="absolute top-10 left-10 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -40, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>

        <motion.div 
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-white mb-6"
            variants={fadeInUp}
          >
            Ready to transform your workflow?
          </motion.h2>
          <motion.p 
            className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto"
            variants={fadeInUp}
          >
            Join thousands of developers, researchers, and analysts who trust Engunity AI 
            to accelerate their work and unlock new possibilities.
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            variants={staggerContainer}
          >
            <motion.div
              variants={scaleIn}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="lg" 
                className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                onClick={handleStartFreeTrial}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 hover:opacity-10 transition-opacity duration-300"
                  whileHover={{ opacity: 0.1 }}
                />
{user ? 'Go to Dashboard' : 'Start Free Trial'}
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="ml-2 inline-block"
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </Button>
            </motion.div>
            <motion.div
              variants={scaleIn}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-white text-white bg-transparent hover:bg-white hover:text-slate-900 hover:border-white px-8 py-4 text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl !text-white hover:!text-slate-900"
                onClick={handleWatchDemo}
                style={{ color: 'white' }}
              >
                Schedule Demo
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center shadow-lg overflow-hidden">
                  <img 
                    src="/images/logo/Logo.jpeg" 
                    alt="Engunity AI Logo" 
                    className="w-8 h-8 object-cover rounded-full"
                  />
                </div>
                <span className="text-xl font-bold text-slate-900">Engunity AI</span>
              </div>
              <p className="text-slate-600 mb-6 max-w-md">
                Empowering developers, researchers, and analysts with cutting-edge AI technology 
                to accelerate innovation and discovery.
              </p>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm" className="border-slate-300 text-slate-600">
                  Privacy Policy
                </Button>
                <Button variant="outline" size="sm" className="border-slate-300 text-slate-600">
                  Terms of Service
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Product</h3>
              <ul className="space-y-2 text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">API</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Company</h3>
              <ul className="space-y-2 text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-slate-500 text-sm">
              © 2024 Engunity AI. All rights reserved.
            </div>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <span className="text-slate-500 text-sm">Made with ❤️ for innovators</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Main export with LoadingProvider wrapper
export default function EngunityLanding() {
  return (
    <LoadingProvider showInitialLoading={true}>
      <LandingPageContent />
    </LoadingProvider>
  );
}