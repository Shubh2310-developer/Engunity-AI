'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Terminal, Code2, FileCode } from 'lucide-react';
import { useState } from 'react';

interface MessageRendererProps {
  content: string;
  type: 'user' | 'assistant' | 'system';
}

/**
 * ChatGPT-style Message Renderer with Syntax Highlighting
 * Supports:
 * - Code blocks with syntax highlighting
 * - Inline code
 * - Markdown formatting (bold, italic, lists, tables, etc.)
 * - Copy-to-clipboard functionality
 * - Emojis and visual cues
 */
export default function MessageRenderer({ content, type }: MessageRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="message-content prose prose-slate max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const language = match ? match[1] : '';
            const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;

            if (!inline && match) {
              return (
                <div className="code-block-wrapper my-4 rounded-lg overflow-hidden border border-slate-700 bg-[#1e1e1e] shadow-lg">
                  {/* Code Block Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-mono text-slate-300 uppercase">
                        {language}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(codeString, codeId)}
                      className="flex items-center gap-2 px-3 py-1 text-xs rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
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

                  {/* Code Content */}
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

            // Inline code
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-sm"
                {...props}
              >
                {children}
              </code>
            );
          },

          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-4 flex items-center gap-2">
              <span className="text-blue-500">🧩</span>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-slate-800 mt-5 mb-3 flex items-center gap-2">
              <span className="text-purple-500">💡</span>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-slate-800 mt-4 mb-2 flex items-center gap-2">
              <span className="text-green-500">⚙️</span>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-slate-700 mt-3 mb-2">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-slate-700 leading-relaxed my-3">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-6 my-3 space-y-2 text-slate-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-6 my-3 space-y-2 text-slate-700">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-slate-700 leading-relaxed">
              {children}
            </li>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline decoration-blue-300 hover:decoration-blue-500 transition-colors"
            >
              {children}
            </a>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-4 pr-4 py-3 my-4 italic text-slate-700">
              {children}
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-slate-300 border border-slate-300 rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-200 bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-r border-slate-300 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-slate-700 border-r border-slate-200 last:border-r-0">
              {children}
            </td>
          ),

          // Strong and emphasis
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-700">
              {children}
            </em>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-t-2 border-slate-200" />
          ),

          // Images
          img: ({ src, alt }) => (
            <div className="my-4">
              <img
                src={src}
                alt={alt || ''}
                className="rounded-lg shadow-md max-w-full h-auto border border-slate-200"
              />
              {alt && (
                <p className="text-sm text-slate-500 mt-2 text-center italic">
                  {alt}
                </p>
              )}
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      <style jsx global>{`
        /* Custom scrollbar for code blocks */
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

        /* Ensure proper spacing for nested elements */
        .message-content > *:first-child {
          margin-top: 0;
        }
        .message-content > *:last-child {
          margin-bottom: 0;
        }

        /* Code block animation */
        .code-block-wrapper {
          animation: fadeInUp 0.3s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Inline code in tables */
        table code {
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
