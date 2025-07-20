'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Sparkles } from 'lucide-react';

// Neural Network Node Interface
interface Neuron {
  x: number;
  y: number;
  radius: number;
  layer: number;
  id: string;
  glow: number;
  connections: Connection[];
  activationLevel: number;
}

// Connection Interface
interface Connection {
  from: Neuron;
  to: Neuron;
  weight: number;
  particles: Particle[];
  isActive: boolean;
}

// Particle Interface
interface Particle {
  x: number;
  y: number;
  progress: number;
  speed: number;
  size: number;
  glow: number;
  color: string;
}

// Neural Network Canvas Component
const NeuralNetworkCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [neurons, setNeurons] = useState<Neuron[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  // Initialize neural network structure
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Create neural network layers
    const createNeuralNetwork = () => {
      const newNeurons: Neuron[] = [];
      const newConnections: Connection[] = [];
      
      const layers = [
        { count: 4, x: 0.15 }, // Input layer
        { count: 6, x: 0.35 }, // Hidden layer 1
        { count: 8, x: 0.5 },  // Hidden layer 2
        { count: 6, x: 0.65 }, // Hidden layer 3
        { count: 3, x: 0.85 }, // Output layer
      ];

      // Create neurons for each layer
      layers.forEach((layer, layerIndex) => {
        for (let i = 0; i < layer.count; i++) {
          const neuron: Neuron = {
            x: layer.x * canvas.width,
            y: (canvas.height / (layer.count + 1)) * (i + 1),
            radius: 8 + Math.random() * 4,
            layer: layerIndex,
            id: `${layerIndex}-${i}`,
            glow: 0,
            connections: [],
            activationLevel: 0,
          };
          newNeurons.push(neuron);
        }
      });

      // Create connections between adjacent layers
      for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex++) {
        const currentLayerNeurons = newNeurons.filter(n => n.layer === layerIndex);
        const nextLayerNeurons = newNeurons.filter(n => n.layer === layerIndex + 1);

        currentLayerNeurons.forEach(fromNeuron => {
          nextLayerNeurons.forEach(toNeuron => {
            // Create connection with some randomness
            if (Math.random() > 0.3) {
              const connection: Connection = {
                from: fromNeuron,
                to: toNeuron,
                weight: Math.random() * 0.8 + 0.2,
                particles: [],
                isActive: false,
              };
              newConnections.push(connection);
              fromNeuron.connections.push(connection);
            }
          });
        });
      }

      setNeurons(newNeurons);
      setConnections(newConnections);
    };

    createNeuralNetwork();

    // Animation loop
    let lastTime = 0;
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create animated background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
      );
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
      gradient.addColorStop(0.5, 'rgba(30, 41, 59, 0.98)');
      gradient.addColorStop(1, 'rgba(2, 6, 23, 1)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle grid pattern
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Trigger neural impulses periodically
      if (Math.random() < 0.02) {
        const inputNeurons = neurons.filter(n => n.layer === 0);
        const randomInputNeuron = inputNeurons[Math.floor(Math.random() * inputNeurons.length)];
        if (randomInputNeuron) {
          triggerNeuralImpulse(randomInputNeuron, connections);
        }
      }

      // Update and draw connections
      connections.forEach(connection => {
        drawConnection(ctx, connection);
        updateParticles(connection, deltaTime);
      });

      // Update and draw neurons
      neurons.forEach(neuron => {
        updateNeuron(neuron, deltaTime);
        drawNeuron(ctx, neuron);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [neurons, connections]);

  // Trigger neural impulse
  const triggerNeuralImpulse = (startNeuron: Neuron, allConnections: Connection[]) => {
    startNeuron.activationLevel = 1;
    startNeuron.glow = 1;

    startNeuron.connections.forEach(connection => {
      const particle: Particle = {
        x: connection.from.x,
        y: connection.from.y,
        progress: 0,
        speed: 0.8 + Math.random() * 0.4,
        size: 3 + Math.random() * 2,
        glow: 1,
        color: `hsl(${220 + Math.random() * 40}, 80%, 60%)`,
      };
      connection.particles.push(particle);
      connection.isActive = true;
    });
  };

  // Update particles along connections
  const updateParticles = (connection: Connection, deltaTime: number) => {
    connection.particles = connection.particles.filter(particle => {
      particle.progress += particle.speed * (deltaTime / 1000) * 2;
      
      if (particle.progress >= 1) {
        // Particle reached destination neuron
        connection.to.activationLevel = Math.min(1, connection.to.activationLevel + 0.3);
        connection.to.glow = Math.min(1, connection.to.glow + 0.5);
        
        // Propagate to next connections with delay
        setTimeout(() => {
          triggerNeuralImpulse(connection.to, [connection]);
        }, 100 + Math.random() * 200);
        
        return false;
      }

      // Update particle position along the connection
      const dx = connection.to.x - connection.from.x;
      const dy = connection.to.y - connection.from.y;
      particle.x = connection.from.x + dx * particle.progress;
      particle.y = connection.from.y + dy * particle.progress;
      
      return true;
    });

    connection.isActive = connection.particles.length > 0;
  };

  // Update neuron properties
  const updateNeuron = (neuron: Neuron, deltaTime: number) => {
    // Decay activation and glow
    neuron.activationLevel *= 0.98;
    neuron.glow *= 0.95;
    
    if (neuron.activationLevel < 0.01) neuron.activationLevel = 0;
    if (neuron.glow < 0.01) neuron.glow = 0;
  };

  // Draw connection between neurons
  const drawConnection = (ctx: CanvasRenderingContext2D, connection: Connection) => {
    const { from, to } = connection;
    
    // Draw connection line
    ctx.strokeStyle = connection.isActive 
      ? `rgba(99, 102, 241, ${0.3 + connection.weight * 0.4})`
      : `rgba(148, 163, 184, ${0.1 + connection.weight * 0.2})`;
    ctx.lineWidth = connection.isActive ? 2 : 1;
    
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Draw particles
    connection.particles.forEach(particle => {
      ctx.save();
      
      // Create glow effect
      const glowGradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 3
      );
      glowGradient.addColorStop(0, particle.color);
      glowGradient.addColorStop(0.4, `${particle.color.replace('60%', '40%')}`);
      glowGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw particle core
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });
  };

  // Draw neuron
  const drawNeuron = (ctx: CanvasRenderingContext2D, neuron: Neuron) => {
    ctx.save();
    
    // Create neuron glow
    if (neuron.glow > 0) {
      const glowGradient = ctx.createRadialGradient(
        neuron.x, neuron.y, 0,
        neuron.x, neuron.y, neuron.radius * 4
      );
      glowGradient.addColorStop(0, `rgba(59, 130, 246, ${neuron.glow * 0.8})`);
      glowGradient.addColorStop(0.5, `rgba(99, 102, 241, ${neuron.glow * 0.4})`);
      glowGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(neuron.x, neuron.y, neuron.radius * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw neuron body
    const intensity = 0.3 + neuron.activationLevel * 0.7;
    const bodyGradient = ctx.createRadialGradient(
      neuron.x - neuron.radius * 0.3, neuron.y - neuron.radius * 0.3, 0,
      neuron.x, neuron.y, neuron.radius
    );
    
    if (neuron.layer === 0) {
      // Input neurons - green tint
      bodyGradient.addColorStop(0, `rgba(34, 197, 94, ${intensity})`);
      bodyGradient.addColorStop(1, `rgba(21, 128, 61, ${intensity * 0.6})`);
    } else if (neuron.layer === 4) {
      // Output neurons - purple tint
      bodyGradient.addColorStop(0, `rgba(168, 85, 247, ${intensity})`);
      bodyGradient.addColorStop(1, `rgba(124, 58, 237, ${intensity * 0.6})`);
    } else {
      // Hidden neurons - blue tint
      bodyGradient.addColorStop(0, `rgba(59, 130, 246, ${intensity})`);
      bodyGradient.addColorStop(1, `rgba(37, 99, 235, ${intensity * 0.6})`);
    }
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(neuron.x, neuron.y, neuron.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw neuron border
    ctx.strokeStyle = `rgba(148, 163, 184, ${0.4 + neuron.activationLevel * 0.6})`;
    ctx.lineWidth = 1 + neuron.activationLevel * 2;
    ctx.stroke();
    
    ctx.restore();
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: 'transparent' }}
    />
  );
};

// Typing text animation component
const TypingText: React.FC<{ text: string }> = ({ text }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 80 + Math.random() * 40);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <span className="font-mono text-lg md:text-xl">
      {displayText}
      <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}>
        |
      </span>
    </span>
  );
};


// Enhanced main loading component with Framer Motion
interface LoadingScreenProps {
  onComplete?: () => void;
  message?: string;
  isVisible?: boolean;
}

export default function LoadingScreen({ onComplete, message = "Initializing Engunity AI Neural Engine...", isVisible = true }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 8 + 2;
        if (newProgress >= 100) {
          setIsCompleted(true);
          setTimeout(() => {
            onComplete?.();
          }, 1000);
          clearInterval(progressInterval);
          return 100;
        }
        return newProgress;
      });
    }, 200);

    return () => clearInterval(progressInterval);
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 w-full h-screen bg-slate-950 overflow-hidden flex items-center justify-center z-50"
        >
          {/* Animated background gradient */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
            animate={{
              background: [
                "linear-gradient(45deg, #020617, #1e293b, #020617)",
                "linear-gradient(90deg, #020617, #312e81, #020617)",
                "linear-gradient(135deg, #020617, #1e293b, #020617)"
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Subtle grid overlay */}
          <motion.div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
            animate={{ 
              backgroundPosition: ['0% 0%', '100% 100%'] 
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Neural network canvas */}
          <NeuralNetworkCanvas />

          {/* Glassmorphism overlay */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-slate-950/50 via-transparent to-slate-950/50 backdrop-blur-[1px]"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Content overlay */}
          <motion.div 
            className="relative z-10 flex flex-col items-center justify-center space-y-8 px-4"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          >
            {/* Logo and branding */}
            <motion.div 
              className="flex flex-col items-center space-y-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: "backOut" }}
            >
              <motion.div className="relative group">
                {/* Logo icon with glow */}
                <motion.div className="relative">
                  <motion.div 
                    className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-2xl"
                    animate={{ 
                      rotateY: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotateY: { duration: 4, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                    whileHover={{ scale: 1.15 }}
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Brain className="w-10 h-10 text-white" />
                    </motion.div>
                  </motion.div>
                  
                  {/* Enhanced glow effect */}
                  <motion.div 
                    className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 rounded-2xl blur-xl opacity-50"
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [0.3, 0.7, 0.3]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />

                  {/* Orbiting particles */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-blue-400 rounded-full"
                      animate={{
                        rotate: [0, 360],
                        scale: [0.5, 1, 0.5]
                      }}
                      transition={{
                        rotate: { duration: 3 + i, repeat: Infinity, ease: "linear" },
                        scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }
                      }}
                      style={{
                        top: '50%',
                        left: '50%',
                        transformOrigin: `${40 + i * 10}px 0px`,
                        marginTop: '-4px',
                        marginLeft: '-4px',
                      }}
                    />
                  ))}
                </motion.div>
              </motion.div>

              {/* Brand name */}
              <motion.h1 
                className="text-4xl md:text-5xl font-bold text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <motion.span 
                  className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent"
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{ backgroundSize: '200% 200%' }}
                >
                  Engunity AI
                </motion.span>
              </motion.h1>
            </motion.div>

            {/* Loading message */}
            <motion.div 
              className="text-center space-y-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6 }}
            >
              <motion.div 
                className="glass-strong rounded-2xl px-8 py-6 max-w-2xl mx-auto"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.2, duration: 0.4, ease: "backOut" }}
              >
                <div className="text-slate-200 mb-4">
                  <TypingText text={message} />
                </div>
                <EnhancedProgressIndicator progress={progress} />
              </motion.div>
            </motion.div>

            {/* Status indicators */}
            <motion.div 
              className="flex items-center space-x-6 text-sm text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.6 }}
            >
              {[
                { label: "Neural Pathways", color: "green", delay: 0 },
                { label: "Data Processing", color: "blue", delay: 0.5 },
                { label: "AI Models", color: "purple", delay: 1 }
              ].map((item, i) => (
                <motion.div 
                  key={item.label}
                  className="flex items-center space-x-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.5 + i * 0.2, duration: 0.4, ease: "backOut" }}
                >
                  <motion.div 
                    className={`w-2 h-2 bg-${item.color}-400 rounded-full`}
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: "easeInOut",
                      delay: item.delay
                    }}
                  />
                  <span>{item.label}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Completion animation */}
            <AnimatePresence>
              {isCompleted && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.6, ease: "backOut" }}
                >
                  <motion.div
                    className="text-green-400 text-6xl"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                  >
                    <Sparkles />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Vignette effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-slate-950/50 pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Enhanced Progress Indicator
const EnhancedProgressIndicator: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-slate-400">Neural Engine Status</span>
        <motion.span 
          className="text-sm text-slate-300"
          key={Math.round(progress)}
          initial={{ scale: 1.2, color: "#60a5fa" }}
          animate={{ scale: 1, color: "#cbd5e1" }}
          transition={{ duration: 0.3 }}
        >
          {Math.round(progress)}%
        </motion.span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-400 rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.div 
            className="absolute inset-0 bg-white/20 rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </div>
  );
};