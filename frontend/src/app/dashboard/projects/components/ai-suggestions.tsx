'use client';

import React, { useState } from 'react';
import {
  Brain,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Target,
  Zap,
  ArrowRight,
  Sparkles,
  BarChart3,
  MessageSquare,
  RefreshCw
} from 'lucide-react';

interface AISuggestion {
  id: string;
  type: 'optimization' | 'warning' | 'opportunity' | 'insight' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  category: 'performance' | 'team' | 'timeline' | 'resources' | 'quality';
  action?: string;
  data?: any;
}

interface AISuggestionsProps {
  projectId: string;
  projectData: any;
}

export const AISuggestions: React.FC<AISuggestionsProps> = ({ projectId, projectData }) => {
  const [suggestions] = useState<AISuggestion[]>([
    {
      id: 'sug-1',
      type: 'optimization',
      title: 'Optimize Team Resource Allocation',
      description: 'Based on task completion patterns, reassigning 2 high-priority tasks to Alice could improve delivery time by 15%.',
      confidence: 87,
      impact: 'high',
      category: 'team',
      action: 'Reassign tasks to optimize workload distribution'
    },
    {
      id: 'sug-2',
      type: 'warning',
      title: 'Potential Timeline Risk',
      description: 'Current velocity suggests the Core Development milestone may be delayed by 3-5 days. Consider scope adjustment.',
      confidence: 78,
      impact: 'medium',
      category: 'timeline',
      action: 'Review milestone scope and timeline'
    },
    {
      id: 'sug-3',
      type: 'opportunity',
      title: 'Early Testing Opportunity',
      description: 'The NLP pipeline is performing 25% better than expected. Consider moving user testing forward.',
      confidence: 92,
      impact: 'high',
      category: 'timeline',
      action: 'Schedule early testing phase'
    },
    {
      id: 'sug-4',
      type: 'insight',
      title: 'Code Quality Improvement',
      description: 'Recent commits show a 40% improvement in test coverage. Team is adopting best practices effectively.',
      confidence: 95,
      impact: 'medium',
      category: 'quality',
      action: 'Continue current practices and share learnings'
    },
    {
      id: 'sug-5',
      type: 'recommendation',
      title: 'Budget Optimization',
      description: 'Current spending is 15% under budget. Consider investing in additional testing infrastructure.',
      confidence: 83,
      impact: 'medium',
      category: 'resources',
      action: 'Evaluate infrastructure investment opportunities'
    }
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const generateNewSuggestions = async () => {
    setIsGenerating(true);
    // Simulate AI analysis
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'optimization': return TrendingUp;
      case 'warning': return AlertTriangle;
      case 'opportunity': return Lightbulb;
      case 'insight': return BarChart3;
      case 'recommendation': return Target;
      default: return Brain;
    }
  };

  const getSuggestionColors = (type: string, impact: string) => {
    const baseColors = {
      optimization: 'blue',
      warning: 'yellow',
      opportunity: 'green',
      insight: 'purple',
      recommendation: 'indigo'
    };

    const color = baseColors[type as keyof typeof baseColors] || 'blue';
    const intensity = impact === 'high' ? '600' : impact === 'medium' ? '500' : '400';

    return {
      bg: `bg-${color}-50`,
      border: `border-${color}-200`,
      text: `text-${color}-800`,
      icon: `text-${color}-${intensity} bg-${color}-100`
    };
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-100';
    if (confidence >= 75) return 'text-blue-600 bg-blue-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const filteredSuggestions = selectedCategory === 'all'
    ? suggestions
    : suggestions.filter(s => s.category === selectedCategory);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-slate-900">AI Project Insights</h3>
            <p className="text-sm text-slate-600">Smart recommendations powered by project data analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="performance">Performance</option>
            <option value="team">Team</option>
            <option value="timeline">Timeline</option>
            <option value="resources">Resources</option>
            <option value="quality">Quality</option>
          </select>

          <button
            onClick={generateNewSuggestions}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Analyzing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* AI Analysis Status */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-blue-800">AI Analysis Complete</span>
        </div>
        <p className="text-sm text-blue-700">
          Analyzed {projectData?.totalTasks || 24} tasks, {projectData?.teamMembers?.length || 3} team members,
          and {projectData?.milestones || 3} milestones to generate personalized recommendations.
        </p>
      </div>

      {/* Suggestions List */}
      <div className="space-y-4">
        {filteredSuggestions.map((suggestion) => {
          const SuggestionIcon = getSuggestionIcon(suggestion.type);
          const colors = getSuggestionColors(suggestion.type, suggestion.impact);

          return (
            <div key={suggestion.id} className={`p-5 rounded-xl border-2 ${colors.bg} ${colors.border} hover:shadow-md transition-all group`}>
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <SuggestionIcon className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className={`font-bold text-lg ${colors.text}`}>
                      {suggestion.title}
                    </h4>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getConfidenceColor(suggestion.confidence)}`}>
                        {suggestion.confidence}% confident
                      </span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getImpactColor(suggestion.impact)}`}>
                        {suggestion.impact} impact
                      </span>
                    </div>
                  </div>

                  <p className={`text-sm ${colors.text} mb-4 opacity-80 leading-relaxed`}>
                    {suggestion.description}
                  </p>

                  {suggestion.action && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Target className="w-4 h-4" />
                        <span>Recommended Action:</span>
                        <span className={colors.text}>{suggestion.action}</span>
                      </div>

                      <button className={`flex items-center gap-2 px-4 py-2 ${colors.text} hover:bg-white hover:shadow-sm rounded-lg transition-all text-sm font-semibold`}>
                        Take Action
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSuggestions.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">No suggestions for this category</h3>
          <p className="text-slate-600 text-sm">Try selecting a different category or refresh the analysis.</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
            <MessageSquare className="w-4 h-4" />
            Discuss with Team
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISuggestions;