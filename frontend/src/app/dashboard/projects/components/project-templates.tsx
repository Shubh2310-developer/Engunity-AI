'use client';

import React from 'react';
import { 
  Brain, 
  Code, 
  Shield, 
  BarChart3, 
  Globe, 
  Database,
  Rocket,
  Zap,
  Target,
  Layers
} from 'lucide-react';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  tags: string[];
  estimatedDuration: string;
  features: string[];
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
}

const projectTemplates: ProjectTemplate[] = [
  {
    id: 'ai-research',
    name: 'AI Research Project',
    description: 'Machine learning and AI research with comprehensive data analysis and model development.',
    icon: Brain,
    color: 'blue',
    tags: ['AI', 'Research', 'ML', 'Python'],
    estimatedDuration: '3-6 months',
    features: ['Data Processing Pipeline', 'Model Training', 'Performance Metrics', 'Documentation'],
    complexity: 'Advanced'
  },
  {
    id: 'web-app',
    name: 'Full-Stack Web Application',
    description: 'Complete web application with modern frontend, robust backend, and database integration.',
    icon: Code,
    color: 'green',
    tags: ['React', 'Node.js', 'Database', 'API'],
    estimatedDuration: '2-4 months',
    features: ['User Authentication', 'Database Schema', 'API Endpoints', 'Responsive Design'],
    complexity: 'Intermediate'
  },
  {
    id: 'security-audit',
    name: 'Security Audit & Testing',
    description: 'Comprehensive security analysis, vulnerability assessment, and penetration testing.',
    icon: Shield,
    color: 'orange',
    tags: ['Security', 'Testing', 'Compliance', 'Audit'],
    estimatedDuration: '1-2 months',
    features: ['Vulnerability Scanning', 'Risk Assessment', 'Compliance Check', 'Security Reports'],
    complexity: 'Advanced'
  },
  {
    id: 'data-analytics',
    name: 'Data Analytics Platform',
    description: 'End-to-end data analytics solution with visualization, reporting, and insights.',
    icon: BarChart3,
    color: 'purple',
    tags: ['Analytics', 'Visualization', 'ETL', 'BI'],
    estimatedDuration: '2-3 months',
    features: ['Data Pipeline', 'Interactive Dashboards', 'Automated Reports', 'ML Insights'],
    complexity: 'Intermediate'
  },
  {
    id: 'mobile-app',
    name: 'Mobile Application',
    description: 'Cross-platform mobile app with native performance and modern UI/UX.',
    icon: Globe,
    color: 'indigo',
    tags: ['Mobile', 'React Native', 'iOS', 'Android'],
    estimatedDuration: '3-5 months',
    features: ['Cross-Platform', 'Push Notifications', 'Offline Support', 'App Store Ready'],
    complexity: 'Advanced'
  },
  {
    id: 'blockchain',
    name: 'Blockchain Solution',
    description: 'Decentralized application with smart contracts and Web3 integration.',
    icon: Database,
    color: 'cyan',
    tags: ['Blockchain', 'Smart Contracts', 'Web3', 'DeFi'],
    estimatedDuration: '4-6 months',
    features: ['Smart Contracts', 'Token Integration', 'Wallet Connection', 'Governance'],
    complexity: 'Advanced'
  },
  {
    id: 'startup-mvp',
    name: 'Startup MVP',
    description: 'Minimum viable product for startup validation with core features and user feedback.',
    icon: Rocket,
    color: 'pink',
    tags: ['MVP', 'Startup', 'Validation', 'Launch'],
    estimatedDuration: '1-3 months',
    features: ['Core Features', 'User Onboarding', 'Analytics', 'Feedback System'],
    complexity: 'Beginner'
  },
  {
    id: 'automation',
    name: 'Process Automation',
    description: 'Workflow automation and process optimization with AI-powered efficiency.',
    icon: Zap,
    color: 'yellow',
    tags: ['Automation', 'Workflow', 'Efficiency', 'Integration'],
    estimatedDuration: '1-2 months',
    features: ['Workflow Builder', 'API Integrations', 'Scheduling', 'Monitoring'],
    complexity: 'Intermediate'
  }
];

interface ProjectTemplatesProps {
  onSelectTemplate: (template: ProjectTemplate) => void;
  onClose: () => void;
}

export const ProjectTemplates: React.FC<ProjectTemplatesProps> = ({ onSelectTemplate, onClose }) => {
  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string; icon: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600' },
      green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'bg-green-100 text-green-600' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600' },
      cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', icon: 'bg-cyan-100 text-cyan-600' },
      pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: 'bg-pink-100 text-pink-600' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: 'bg-yellow-100 text-yellow-600' }
    };
    return colorMap[color] || colorMap.blue;
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Choose a Project Template</h2>
              <p className="text-slate-600">Get started quickly with pre-configured project structures</p>
            </div>
            <button 
              onClick={onClose}
              className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <Target className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projectTemplates.map((template) => {
              const colors = getColorClasses(template.color);
              return (
                <div
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  className={`relative group cursor-pointer rounded-2xl border-2 ${colors.border} ${colors.bg} p-6 hover:shadow-xl transition-all duration-300 hover:scale-105`}
                >
                  {/* Template Icon */}
                  <div className={`w-16 h-16 ${colors.icon} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <template.icon className="w-8 h-8" />
                  </div>

                  {/* Template Info */}
                  <div className="mb-4">
                    <h3 className={`font-bold text-lg ${colors.text} mb-2`}>
                      {template.name}
                    </h3>
                    <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                      {template.description}
                    </p>
                    
                    {/* Complexity Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getComplexityColor(template.complexity)}`}>
                        {template.complexity}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {template.estimatedDuration}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-md text-xs">
                        +{template.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Features Preview */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700">Key Features:</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {template.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  
                  {/* Select button */}
                  <div className="absolute bottom-4 left-4 right-4 transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                    <button className={`w-full py-2 ${colors.text} bg-white border-2 ${colors.border} rounded-xl font-semibold text-sm hover:bg-opacity-80 transition-all`}>
                      Use Template
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Template Option */}
          <div className="mt-8 p-6 border-2 border-dashed border-slate-300 rounded-2xl text-center hover:border-slate-400 transition-colors">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Start from Scratch</h3>
            <p className="text-slate-600 mb-4">Create a custom project with your own structure and requirements</p>
            <button 
              onClick={() => onSelectTemplate({
                id: 'custom',
                name: 'Custom Project',
                description: 'Build your project from scratch',
                icon: Target,
                color: 'slate',
                tags: [],
                estimatedDuration: 'Variable',
                features: [],
                complexity: 'Beginner'
              })}
              className="px-6 py-2 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              Create Custom Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTemplates;