'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';
import clsx from 'clsx';

interface CodeDiffProps {
  oldCode: string;
  newCode: string;
  language: string;
}

export default function CodeDiff({ oldCode, newCode, language }: CodeDiffProps) {
  const renderLineNumbers = (code: string) => {
    const lines = code.split('\n');
    return lines.map((_, index) => (
      <div
        key={index}
        className="select-none text-gray-400 text-sm leading-6 pr-4 text-right"
      >
        {index + 1}
      </div>
    ));
  };

  const renderCode = (codeString: string, lang: string) => {
    console.log('CodeDiff language prop:', lang, 'Processed language for highlighter:', lang.toLowerCase());
    return (
      <SyntaxHighlighter
        language={lang.toLowerCase()}
        style={okaidia}
        showLineNumbers={false}
        wrapLines={true}
        wrapLongLines={true}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          lineHeight: '1.5rem',
          overflowX: 'auto',
          width: '100%',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'inherit',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-2">
        {/* Old Code */}
        <div className="border-r border-gray-200">
          <div className="bg-red-50 px-4 py-2 border-b border-gray-200">
            <span className="text-red-700 font-medium">Existing Code</span>
          </div>
          <div className="flex">
            <div className="flex flex-col bg-gray-100 border-r border-gray-200 min-w-[60px] pt-4">
              {renderLineNumbers(oldCode)}
            </div>
            <div className="flex-1">
              {renderCode(oldCode, language)}
            </div>
          </div>
        </div>

        {/* New Code */}
        <div>
          <div className="bg-green-50 px-4 py-2 border-b border-gray-200">
            <span className="text-green-700 font-medium">Improved Code</span>
          </div>
          <div className="flex">
            <div className="flex flex-col bg-gray-100 border-r border-gray-200 min-w-[60px] pt-4">
              {renderLineNumbers(newCode)}
            </div>
            <div className="flex-1">
              {renderCode(newCode, language)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 