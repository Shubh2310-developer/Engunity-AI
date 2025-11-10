import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface ProseMessageProps {
  markdown: string;
  onCitationClick?: (citationNumber: number) => void;
  className?: string;
}

export const ProseMessage: React.FC<ProseMessageProps> = ({
  markdown,
  onCitationClick,
  className = ''
}) => {
  // Clean markdown: remove excessive commas and whitespace
  const cleanMarkdown = (text: string): string => {
    return text
      .replace(/,\s*,\s*,\s*,\s*,\s*,/g, ',')
      .replace(/,\s*,\s*,/g, ',')
      .replace(/,\s*,/g, ',')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const processedMarkdown = cleanMarkdown(markdown);

  return (
    <div className={className}>
      <article className="prose prose-zinc dark:prose-invert max-w-none
        prose-headings:font-semibold prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100
        prose-headings:scroll-mt-24
        prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6
        prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5 prose-h2:pb-2 prose-h2:border-b prose-h2:border-zinc-200 dark:prose-h2:border-zinc-700
        prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4
        prose-p:text-base prose-p:leading-7 prose-p:text-zinc-700 dark:prose-p:text-zinc-300
        prose-p:mb-4
        prose-a:text-sky-600 dark:prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100 prose-strong:font-semibold
        prose-code:text-emerald-600 dark:prose-code:text-emerald-400
        prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800
        prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
        prose-code:before:content-[''] prose-code:after:content-['']
        prose-pre:bg-zinc-900 dark:prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-700
        prose-pre:rounded-xl prose-pre:shadow-lg
        prose-blockquote:border-l-4 prose-blockquote:border-sky-500 prose-blockquote:bg-sky-50 dark:prose-blockquote:bg-sky-900/20
        prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:rounded-r-lg
        prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-4
        prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-4
        prose-li:text-zinc-700 dark:prose-li:text-zinc-300 prose-li:mb-1
        prose-table:border-collapse prose-table:w-full
        prose-thead:bg-zinc-100 dark:prose-thead:bg-zinc-800
        prose-th:border prose-th:border-zinc-300 dark:prose-th:border-zinc-700 prose-th:px-4 prose-th:py-2
        prose-td:border prose-td:border-zinc-300 dark:prose-td:border-zinc-700 prose-td:px-4 prose-td:py-2
        prose-hr:border-zinc-200 dark:prose-hr:border-zinc-700 prose-hr:my-8
      ">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Custom blockquote renderer for callouts
            blockquote: ({ children, ...props }) => {
              const content = String(children);
              const isNote = content.includes('Note:');
              const isWarning = content.includes('Warning:');
              const isInfo = content.includes('Info:');

              if (isNote || isWarning || isInfo) {
                return (
                  <Callout
                    type={isWarning ? 'warning' : isNote ? 'note' : 'info'}
                  >
                    {children}
                  </Callout>
                );
              }

              return <blockquote {...props}>{children}</blockquote>;
            },

            // Custom citation renderer
            a: ({ href, children, ...props }) => {
              // Check if it's a citation [1], [2], etc.
              const citationMatch = String(children).match(/^\[(\d+)\]$/);
              if (citationMatch && onCitationClick) {
                const citationNum = parseInt(citationMatch[1]);
                return (
                  <Citation
                    number={citationNum}
                    onClick={() => onCitationClick(citationNum)}
                  />
                );
              }

              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                >
                  {children}
                </a>
              );
            },

            // Custom code block with copy button
            pre: ({ children, ...props }) => {
              return (
                <div className="relative group">
                  <pre {...props}>{children}</pre>
                  <button
                    onClick={() => {
                      const code = (children as any)?.props?.children;
                      if (code) {
                        navigator.clipboard.writeText(String(code));
                      }
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                      px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded"
                  >
                    Copy
                  </button>
                </div>
              );
            },
          }}
        >
          {processedMarkdown}
        </ReactMarkdown>
      </article>
    </div>
  );
};

// Callout component for Note/Warning/Info blocks
interface CalloutProps {
  type: 'note' | 'warning' | 'info';
  children: React.ReactNode;
}

const Callout: React.FC<CalloutProps> = ({ type, children }) => {
  const styles = {
    note: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-l-4 border-blue-500',
      icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      text: 'text-blue-900 dark:text-blue-100',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-l-4 border-amber-500',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      text: 'text-amber-900 dark:text-amber-100',
    },
    info: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-l-4 border-emerald-500',
      icon: <AlertCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      text: 'text-emerald-900 dark:text-emerald-100',
    },
  };

  const style = styles[type];

  return (
    <div className={`${style.bg} ${style.border} ${style.text} rounded-r-lg p-4 my-4 flex gap-3`}>
      <div className="flex-shrink-0 mt-0.5">
        {style.icon}
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};

// Citation chip component
interface CitationProps {
  number: number;
  onClick: () => void;
}

const Citation: React.FC<CitationProps> = ({ number, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium
        bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300
        hover:bg-sky-200 dark:hover:bg-sky-900/50
        border border-sky-300 dark:border-sky-700
        rounded-md transition-colors cursor-pointer
        align-baseline mx-0.5"
      title={`Jump to source ${number}`}
    >
      {number}
    </button>
  );
};
