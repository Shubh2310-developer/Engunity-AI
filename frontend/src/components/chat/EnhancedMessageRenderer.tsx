'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import {
  Copy, Check, Terminal, Code2, ChevronDown, ChevronUp,
  Book, Brain, Database, Cpu, BarChart3, Calculator, Laptop,
  FileText, Info, AlertCircle
} from 'lucide-react';

interface EnhancedMessageRendererProps {
  content: string;
  type: 'user' | 'assistant' | 'system';
  keywords?: string[];
  confidence?: number;
  sourceName?: string;
}

/**
 * Enhanced Message Renderer with Visual Improvements
 * - Hierarchical formatting with icons
 * - Keyword highlighting
 * - Collapsible sections
 * - Color-coded categories
 * - Mini summaries
 */
export default function EnhancedMessageRenderer({
  content,
  type,
  keywords = [],
  confidence,
  sourceName
}: EnhancedMessageRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Get icon for section based on keywords
  const getSectionIcon = (heading: string) => {
    const lower = heading.toLowerCase();
    if (lower.includes('machine learning') || lower.includes('ml')) return <Brain className="w-4 h-4" />;
    if (lower.includes('database') || lower.includes('sql')) return <Database className="w-4 h-4" />;
    if (lower.includes('algorithm') || lower.includes('data structure')) return <Cpu className="w-4 h-4" />;
    if (lower.includes('statistics') || lower.includes('probability')) return <BarChart3 className="w-4 h-4" />;
    if (lower.includes('calculus') || lower.includes('algebra')) return <Calculator className="w-4 h-4" />;
    if (lower.includes('programming') || lower.includes('python')) return <Laptop className="w-4 h-4" />;
    if (lower.includes('summary') || lower.includes('overview')) return <FileText className="w-4 h-4" />;
    return <Book className="w-4 h-4" />;
  };

  // Highlight keywords in text
  const highlightKeywords = (text: string) => {
    if (!keywords.length) return text;

    let highlightedText = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-yellow-200 dark:bg-yellow-600 px-1 rounded">$1</mark>'
      );
    });
    return highlightedText;
  };

  return (
    <div className="enhanced-message-content">
      {/* Mini Summary Header (for assistant messages) */}
      {type === 'assistant' && (confidence || sourceName) && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20
          border-l-4 border-blue-500 rounded-r-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              {sourceName && (
                <div className="text-blue-900 dark:text-blue-100 font-medium mb-1">
                  📄 Source: {sourceName}
                </div>
              )}
              {confidence !== undefined && (
                <div className="text-blue-700 dark:text-blue-300">
                  ✓ Confidence: {(confidence * 100).toFixed(0)}%
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none
        prose-headings:font-semibold prose-headings:text-slate-900 dark:prose-headings:text-slate-100
        prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5 prose-h2:flex prose-h2:items-center prose-h2:gap-2
        prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-200 dark:prose-h2:border-slate-700
        prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4 prose-h3:flex prose-h3:items-center prose-h3:gap-2
        prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed
        prose-ul:my-3 prose-ul:space-y-2
        prose-li:text-slate-700 dark:prose-li:text-slate-300
        prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-semibold">

        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Enhanced code blocks
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              const language = match ? match[1] : '';
              const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;

              if (!inline && match) {
                return (
                  <div className="code-block-wrapper my-4 rounded-xl overflow-hidden border border-slate-700
                    bg-[#1e1e1e] shadow-lg transition-all hover:shadow-xl">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-mono text-slate-300 uppercase tracking-wide">
                          {language}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(codeString, codeId)}
                        className="flex items-center gap-2 px-3 py-1 text-xs rounded-md bg-slate-700
                          hover:bg-slate-600 text-slate-300 transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === codeId ? (
                          <>
                            <Check className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <SyntaxHighlighter
                        language={language}
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          padding: '1rem',
                          background: '#1e1e1e',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                        }}
                        showLineNumbers={true}
                        lineNumberStyle={{
                          minWidth: '3em',
                          paddingRight: '1em',
                          color: '#858585',
                          userSelect: 'none',
                        }}
                        wrapLines={true}
                        wrapLongLines={false}
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                );
              }

              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800
                    text-emerald-600 dark:text-emerald-400 border border-slate-200
                    dark:border-slate-700 font-mono text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            },

            // Enhanced headings with icons
            h2: ({ children }) => {
              const text = String(children);
              const icon = getSectionIcon(text);
              const sectionId = text.toLowerCase().replace(/\s+/g, '-');
              const isCollapsed = collapsedSections.has(sectionId);

              return (
                <h2 className="group cursor-pointer" onClick={() => toggleSection(sectionId)}>
                  <span className="flex items-center gap-2">
                    <span className="text-blue-500 dark:text-blue-400">{icon}</span>
                    <span className="flex-1">{children}</span>
                    {isCollapsed ? (
                      <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                    )}
                  </span>
                </h2>
              );
            },

            h3: ({ children }) => {
              const text = String(children);
              const icon = getSectionIcon(text);

              return (
                <h3>
                  <span className="flex items-center gap-2">
                    <span className="text-indigo-500 dark:text-indigo-400">{icon}</span>
                    {children}
                  </span>
                </h3>
              );
            },

            // Enhanced paragraphs with keyword highlighting
            p: ({ children }) => {
              const text = String(children);
              const highlighted = highlightKeywords(text);

              return (
                <p
                  className="my-3"
                  dangerouslySetInnerHTML={{ __html: highlighted }}
                />
              );
            },

            // Styled lists
            ul: ({ children }) => (
              <ul className="list-none ml-0 space-y-2">
                {children}
              </ul>
            ),

            li: ({ children }) => (
              <li className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 mt-1.5">▪</span>
                <span className="flex-1">{children}</span>
              </li>
            ),

            // Enhanced blockquotes
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20
                pl-4 pr-4 py-3 my-4 italic text-slate-700 dark:text-slate-300 rounded-r-lg">
                {children}
              </blockquote>
            ),

            // Styled links
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300
                  underline decoration-blue-300 dark:decoration-blue-600 hover:decoration-blue-500
                  transition-colors"
              >
                {children}
              </a>
            ),

            // Enhanced tables
            table: ({ children }) => (
              <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-300 dark:divide-slate-700">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                {children}
              </thead>
            ),
            tr: ({ children }) => (
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300
                border-r border-slate-200 dark:border-slate-700 last:border-r-0">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300
                border-r border-slate-200 dark:border-slate-700 last:border-r-0">
                {children}
              </td>
            ),

            // Horizontal rule
            hr: () => (
              <hr className="my-6 border-t-2 border-slate-200 dark:border-slate-700" />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      <style jsx global>{`
        .enhanced-message-content mark {
          animation: highlight-pulse 2s ease-in-out;
        }

        @keyframes highlight-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .code-block-wrapper pre::-webkit-scrollbar {
          height: 8px;
        }
        .code-block-wrapper pre::-webkit-scrollbar-track {
          background: #2d2d2d;
        }
        .code-block-wrapper pre::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 4px;
        }
        .code-block-wrapper pre::-webkit-scrollbar-thumb:hover {
          background: #666;
        }
      `}</style>
    </div>
  );
}
