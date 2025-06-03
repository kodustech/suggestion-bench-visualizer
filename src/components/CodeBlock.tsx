'use client';

import { useState } from 'react';
import { Copy, Check, FileText, Code2, ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia, ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  code: string;
  language?: string;
  fileName?: string;
  startLine?: number;
  endLine?: number;
  title?: string;
  showLineNumbers?: boolean;
  isDiff?: boolean;
  className?: string;
}

export default function CodeBlock({
  code,
  language = 'text',
  fileName,
  startLine,
  endLine,
  title,
  showLineNumbers = true,
  isDiff = false,
  className
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const getLanguageLabel = (lang: string): string => {
    const labels: { [key: string]: string } = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'go': 'Go',
      'rust': 'Rust',
      'php': 'PHP',
      'ruby': 'Ruby',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'dart': 'Dart',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'json': 'JSON',
      'yaml': 'YAML',
      'xml': 'XML',
      'sql': 'SQL',
      'shell': 'Shell',
      'bash': 'Bash',
      'powershell': 'PowerShell',
      'text': 'Text'
    };
    return labels[lang.toLowerCase()] || lang.toUpperCase();
  };

  const processCodeLines = (codeText: string) => {
    const lines = codeText.split('\n');
    const processedLines = lines.map((line, index) => {
      const lineNumber = startLine ? startLine + index : index + 1;
      
      // Detect line type in diff
      let lineType = 'normal';
      let displayLine = line;
      
      if (isDiff) {
        if (line.startsWith('+')) {
          lineType = 'added';
          displayLine = line.slice(1);
        } else if (line.startsWith('-')) {
          lineType = 'removed';
          displayLine = line.slice(1);
        } else if (line.startsWith(' ')) {
          lineType = 'unchanged';
          displayLine = line.slice(1);
        }
      }

      return {
        number: lineNumber,
        content: displayLine,
        type: lineType,
        original: line
      };
    });

    return processedLines;
  };

  const lines = processCodeLines(code);

  const getLineClasses = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 border-l-4 border-green-400';
      case 'removed':
        return 'bg-red-50 border-l-4 border-red-400';
      case 'unchanged':
        return 'bg-white';
      default:
        return 'bg-white hover:bg-gray-50';
    }
  };

  const getLineNumberClasses = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'removed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'unchanged':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className={clsx('border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm', className)}>
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {fileName && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <FileText className="w-4 h-4" />
                <span className="font-medium">{fileName}</span>
              </button>
            )}
            
            {!fileName && title && (
              <div className="flex items-center space-x-2 text-gray-700">
                <Code2 className="w-4 h-4" />
                <span className="font-medium">{title}</span>
              </div>
            )}

            {(startLine || endLine) && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-600">
                  {startLine && endLine ? `Lines ${startLine}-${endLine}` : 
                   startLine ? `From line ${startLine}` :
                   endLine ? `Until line ${endLine}` : ''}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
              {getLanguageLabel(language)}
            </span>
            
            <button
              onClick={handleCopy}
              className={clsx(
                'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors',
                copied 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Code Content */}
      {!isCollapsed && !isDiff && (
        <div className="flex overflow-x-auto">
          {showLineNumbers && (
            <div className="sticky left-0 z-10 select-none bg-gray-50 pr-2 text-right font-mono text-sm text-gray-700">
              {lines.map((line) => (
                <div key={`ln-${line.number}`} className="leading-relaxed">
                  {line.number}
                </div>
              ))}
            </div>
          )}
          <div className="flex-grow">
            <SyntaxHighlighter
              language={language.toLowerCase()}
              style={okaidia}
              showLineNumbers={false}
              wrapLines={true}
              wrapLongLines={true}
              customStyle={{
                margin: 0,
                width: '100%',
                fontSize: '1em',
                fontFamily: 'inherit',
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'inherit',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  display: 'block',
                }
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {!isCollapsed && isDiff && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className={getLineClasses(line.type)}>
                  {showLineNumbers && (
                    <td className={clsx(
                      'px-3 py-1 text-sm font-mono select-none border-r border-dashed w-16 text-right font-medium align-top',
                      getLineNumberClasses(line.type)
                    )}>
                      {line.number}
                    </td>
                  )}
                  <td className="px-4 py-1 align-top">
                    <SyntaxHighlighter
                      language={language.toLowerCase()}
                      style={ghcolors}
                      showLineNumbers={false}
                      wrapLines={true}
                      wrapLongLines={true}
                      customStyle={{
                        margin: 0,
                        padding: 0,
                        backgroundColor: 'transparent',
                        fontSize: '1em',
                        fontFamily: 'inherit',
                      }}
                      codeTagProps={{
                        style: {
                          fontFamily: 'inherit',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          display: 'block',
                        }
                      }}
                    >
                      {line.content || ' '}
                    </SyntaxHighlighter>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Collapse indicator */}
      {isCollapsed && (
        <div className="px-4 py-3 text-center text-sm text-gray-500 bg-gray-50 border-t border-gray-200">
          <span>{lines.length} line{lines.length !== 1 ? 's' : ''} hidden{lines.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
} 