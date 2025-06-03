'use client';

import { useEffect, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import clsx from 'clsx';

interface CodeDiffProps {
  oldCode: string;
  newCode: string;
  language: string;
}

export default function CodeDiff({ oldCode, newCode, language }: CodeDiffProps) {
  const [highlightedOld, setHighlightedOld] = useState('');
  const [highlightedNew, setHighlightedNew] = useState('');

  useEffect(() => {
    const prismLang = language === 'javascript' ? 'js' : language;
    
    try {
      const oldHighlighted = Prism.highlight(
        oldCode,
        Prism.languages[prismLang] || Prism.languages.text,
        prismLang
      );
      const newHighlighted = Prism.highlight(
        newCode,
        Prism.languages[prismLang] || Prism.languages.text,
        prismLang
      );
      
      setHighlightedOld(oldHighlighted);
      setHighlightedNew(newHighlighted);
    } catch (error) {
      setHighlightedOld(oldCode);
      setHighlightedNew(newCode);
    }
  }, [oldCode, newCode, language]);

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

  const renderCode = (highlightedCode: string) => {
    return (
      <pre className="text-sm leading-6 overflow-x-auto">
        <code
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
          className="language-javascript"
        />
      </pre>
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
          <div className="flex bg-gray-50">
            <div className="flex flex-col bg-gray-100 border-r border-gray-200 min-w-[60px]">
              {renderLineNumbers(oldCode)}
            </div>
            <div className="flex-1 p-4 bg-red-50/50">
              {renderCode(highlightedOld)}
            </div>
          </div>
        </div>

        {/* New Code */}
        <div>
          <div className="bg-green-50 px-4 py-2 border-b border-gray-200">
            <span className="text-green-700 font-medium">Improved Code</span>
          </div>
          <div className="flex bg-gray-50">
            <div className="flex flex-col bg-gray-100 border-r border-gray-200 min-w-[60px]">
              {renderLineNumbers(newCode)}
            </div>
            <div className="flex-1 p-4 bg-green-50/50">
              {renderCode(highlightedNew)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 