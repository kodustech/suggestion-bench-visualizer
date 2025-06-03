'use client';

import { useState } from 'react';
import { 
  FileText, 
  GitCommit, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  ChevronDown,
  ChevronRight,
  Code2,
  ExternalLink,
  Crown
} from 'lucide-react';
import clsx from 'clsx';
import CodeBlock from './CodeBlock';
import { SuggestionData } from '@/types/suggestion';

interface GitHubStyleSuggestionProps {
  suggestion: SuggestionData;
  title: string;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export default function GitHubStyleSuggestion({
  suggestion,
  title,
  isSelected = false,
  onSelect,
  className
}: GitHubStyleSuggestionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'changes'>('overview');

  const getSeverityIcon = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'error':
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  const getSeverityBadgeClasses = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'error':
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const inferSeverityFromLabel = (label?: string): string => {
    if (!label) return 'suggestion';
    
    const lowerLabel = label.toLowerCase();
    
    // Map common labels to severity
    if (lowerLabel.includes('critical') || lowerLabel.includes('security') || lowerLabel.includes('vulnerability') || lowerLabel.includes('exploit')) {
      return 'critical';
    }
    if (lowerLabel.includes('error') || lowerLabel.includes('bug') || lowerLabel.includes('fix') || lowerLabel.includes('crash') || lowerLabel.includes('fail')) {
      return 'error';
    }
    if (lowerLabel.includes('warning') || lowerLabel.includes('deprecated') || lowerLabel.includes('performance') || lowerLabel.includes('slow') || lowerLabel.includes('memory')) {
      return 'warning';
    }
    if (lowerLabel.includes('info') || lowerLabel.includes('documentation') || lowerLabel.includes('comment') || lowerLabel.includes('style') || lowerLabel.includes('format')) {
      return 'info';
    }
    
    // Common specific labels in code review context
    const severityMap: { [key: string]: string } = {
      'refactoring': 'info',
      'optimization': 'warning',
      'maintainability': 'info',
      'readability': 'info',
      'code_smell': 'warning',
      'best_practices': 'info',
      'naming': 'info',
      'duplication': 'warning',
      'complexity': 'warning',
      'type_safety': 'error',
      'null_pointer': 'error',
      'resource_leak': 'critical',
      'injection': 'critical',
      'xss': 'critical'
    };
    
    for (const [key, severity] of Object.entries(severityMap)) {
      if (lowerLabel.includes(key)) {
        return severity;
      }
    }
    
    return 'suggestion'; // default
  };

  const extractCodeFromSuggestion = (suggestionContent: string) => {
    // Try to extract code from different formats
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    const matches = Array.from(suggestionContent.matchAll(codeBlockRegex));
    
    if (matches.length > 0) {
      return matches.map(match => ({
        language: match[1] || 'text',
        code: match[2].trim()
      }));
    }

    // If there are no code blocks, check if there are specific line references
    const lineRegex = /line\s*(\d+)(?:-(\d+))?/gi;
    const lineMatch = suggestionContent.match(lineRegex);
    
    return [{
      language: 'text',
      code: suggestionContent,
      hasLineReferences: !!lineMatch
    }];
  };

  const createUnifiedDiff = (oldCode: string, newCode: string): string => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const diffLines: string[] = [];
    
    // Improved diff algorithm using Longest Common Subsequence (LCS)
    const lcs = computeLCS(oldLines, newLines);
    
    let oldIndex = 0;
    let newIndex = 0;
    let lcsIndex = 0;
    
    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      if (lcsIndex < lcs.length && 
          oldIndex < oldLines.length && 
          newIndex < newLines.length &&
          oldLines[oldIndex] === lcs[lcsIndex] && 
          newLines[newIndex] === lcs[lcsIndex]) {
        // Common line (unchanged)
        diffLines.push(` ${oldLines[oldIndex]}`);
        oldIndex++;
        newIndex++;
        lcsIndex++;
      } else if (oldIndex < oldLines.length && 
                 (lcsIndex >= lcs.length || oldLines[oldIndex] !== lcs[lcsIndex])) {
        // Removed line
        diffLines.push(`-${oldLines[oldIndex]}`);
        oldIndex++;
      } else if (newIndex < newLines.length) {
        // Added line
        diffLines.push(`+${newLines[newIndex]}`);
        newIndex++;
      }
    }
    
    return diffLines.join('\n');
  };

  const computeLCS = (arr1: string[], arr2: string[]): string[] => {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // Construir a tabela LCS
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    // Reconstruir a sequência LCS
    const lcs: string[] = [];
    let i = m, j = n;
    
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    
    return lcs;
  };

  const renderSuggestionOverview = () => (
    <div className="space-y-4">
      {/* General summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">General Summary</h4>
            <p className="text-blue-800 text-sm leading-relaxed">{suggestion.overallSummary}</p>
          </div>
        </div>
      </div>

      {/* List of suggestions */}
      <div className="space-y-3">
        {suggestion.codeSuggestions.map((codeSuggestion, index) => (
          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {/* Suggestion header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="font-mono text-sm text-gray-900">
                      {codeSuggestion.relevantFile || 'unknown-file'}
                    </span>
                  </div>
                  
                  {(codeSuggestion.relevantLinesStart || codeSuggestion.relevantLinesEnd) && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">
                        Lines {codeSuggestion.relevantLinesStart || '?'}-{codeSuggestion.relevantLinesEnd || '?'}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {codeSuggestion.label && (() => {
                    const severity = codeSuggestion.severity || inferSeverityFromLabel(codeSuggestion.label);
                    console.log(`🏷️ Renderizing label "${codeSuggestion.label}" with severity "${severity}"`);
                    return (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityBadgeClasses(severity)}`}>
                        {getSeverityIcon(severity)}
                        <span className="ml-1">{codeSuggestion.label}</span>
                      </span>
                    );
                  })()}
                  
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Suggestion
                  </span>
                </div>
              </div>
            </div>

            {/* Suggestion content */}
            <div className="p-4">
              <h5 className="font-medium text-gray-900 mb-3">
                {codeSuggestion.oneSentenceSummary || `Suggestion ${index + 1}`}
              </h5>
              
              <div className="prose prose-sm max-w-none text-gray-700">
                <p className="leading-relaxed whitespace-pre-wrap">
                  {codeSuggestion.suggestionContent}
                </p>
              </div>

              {/* Show existing vs improved code */}
              {(codeSuggestion.existingCode || codeSuggestion.improvedCode) && (
                <div className="mt-4 space-y-4">
                  <h6 className="text-sm font-medium text-gray-700 flex items-center">
                    <Code2 className="w-4 h-4 mr-2" />
                    Changes proposed:
                  </h6>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Existing code */}
                    {codeSuggestion.existingCode && (
                      <div>
                        <div className="text-xs font-medium text-red-700 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                          Current code
                        </div>
                        <CodeBlock
                          code={codeSuggestion.existingCode}
                          language={codeSuggestion.language}
                          fileName={codeSuggestion.relevantFile}
                          startLine={codeSuggestion.relevantLinesStart}
                          endLine={codeSuggestion.relevantLinesEnd}
                          title="Current code"
                          className="border-red-200"
                        />
                      </div>
                    )}
                    
                    {/* Improved code */}
                    {codeSuggestion.improvedCode && (
                      <div>
                        <div className="text-xs font-medium text-green-700 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Suggested code
                        </div>
                        <CodeBlock
                          code={codeSuggestion.improvedCode}
                          language={codeSuggestion.language}
                          fileName={codeSuggestion.relevantFile}
                          startLine={codeSuggestion.relevantLinesStart}
                          endLine={codeSuggestion.relevantLinesEnd}
                          title="Suggested code"
                          className="border-green-200"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Diff unified when both exist */}
                  {codeSuggestion.existingCode && codeSuggestion.improvedCode && (
                    <div className="mt-4">
                      <div className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        Unified diff
                      </div>
                      <CodeBlock
                        code={createUnifiedDiff(codeSuggestion.existingCode, codeSuggestion.improvedCode)}
                        language={codeSuggestion.language}
                        fileName={codeSuggestion.relevantFile}
                        startLine={codeSuggestion.relevantLinesStart}
                        title="Changes"
                        isDiff={true}
                        className="border-blue-200"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Fallback: extract code from suggestionContent if there's no existingCode/improvedCode */}
              {!codeSuggestion.existingCode && !codeSuggestion.improvedCode && (() => {
                const codeBlocks = extractCodeFromSuggestion(codeSuggestion.suggestionContent);
                const relevantCodeBlocks = codeBlocks.filter(block => 
                  block.code !== codeSuggestion.suggestionContent
                );
                
                if (relevantCodeBlocks.length > 0) {
                  return (
                    <div className="mt-4 space-y-3">
                      <h6 className="text-sm font-medium text-gray-700 flex items-center">
                        <Code2 className="w-4 h-4 mr-2" />
                        Code extracted from description:
                      </h6>
                      {relevantCodeBlocks.map((block, blockIndex) => (
                        <CodeBlock
                          key={blockIndex}
                          code={block.code}
                          language={block.language}
                          fileName={codeSuggestion.relevantFile}
                          startLine={codeSuggestion.relevantLinesStart}
                          endLine={codeSuggestion.relevantLinesEnd}
                          title={`Code ${blockIndex + 1}`}
                        />
                      ))}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderChangesView = () => {
    const changesCount = suggestion.codeSuggestions.filter(s => s.existingCode && s.improvedCode).length;
    const additionsCount = suggestion.codeSuggestions.filter(s => s.improvedCode && !s.existingCode).length;
    const filesAffected = new Set(suggestion.codeSuggestions.map(s => s.relevantFile)).size;
    
    return (
      <div className="space-y-4">
        {/* Changes summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-700">{filesAffected} file{filesAffected !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-green-700">{additionsCount} additions</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-red-700">{changesCount} modifications</span>
            </div>
          </div>
        </div>

        {/* List of files with changes */}
        <div className="space-y-3">
          {suggestion.codeSuggestions.map((codeSuggestion, index) => {
            const hasExisting = !!codeSuggestion.existingCode;
            const hasImproved = !!codeSuggestion.improvedCode;
            
            if (!hasExisting && !hasImproved) return null;
            
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="font-mono text-sm text-gray-900">
                      {codeSuggestion.relevantFile}
                    </span>
                    {(codeSuggestion.relevantLinesStart || codeSuggestion.relevantLinesEnd) && (
                      <span className="text-xs text-gray-500">
                        @ lines {codeSuggestion.relevantLinesStart || '?'}-{codeSuggestion.relevantLinesEnd || '?'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {hasExisting && hasImproved && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Modified
                      </span>
                    )}
                    {!hasExisting && hasImproved && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Added
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-3">
                  {codeSuggestion.oneSentenceSummary}
                </p>
                
                {/* Mini diff visual */}
                {hasExisting && hasImproved && (
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-600 mb-2">Preview of changes:</div>
                    <div className="font-mono text-xs space-y-1">
                      <div className="text-red-700 bg-red-50 px-2 py-1 rounded">
                        - {codeSuggestion.existingCode.split('\n')[0]}
                        {codeSuggestion.existingCode.split('\n').length > 1 && ' ...'}
                      </div>
                      <div className="text-green-700 bg-green-50 px-2 py-1 rounded">
                        + {codeSuggestion.improvedCode.split('\n')[0]}
                        {codeSuggestion.improvedCode.split('\n').length > 1 && ' ...'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {suggestion.codeSuggestions.every(s => !s.existingCode && !s.improvedCode) && (
          <div className="text-center py-8 text-gray-500">
            <GitCommit className="w-8 h-8 mx-auto mb-2" />
            <p>No specific code change found</p>
            <p className="text-sm">This suggestion contains only textual descriptions</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={clsx(
      'border rounded-lg overflow-hidden bg-white transition-all',
      isSelected 
        ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
        : 'border-gray-200 hover:border-gray-300',
      className
    )}>
      {/* Main header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">{title}</span>
            </button>
            
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600">
              {suggestion.codeSuggestions.length} suggestion{suggestion.codeSuggestions.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {onSelect && (
              <button
                onClick={onSelect}
                className={clsx(
                  'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                )}
              >
                {isSelected ? 'Selected' : 'Select'}
              </button>
            )}
            
            {isSelected && !onSelect && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <Crown className="w-4 h-4 mr-1" />
                Selected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div>
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-4" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={clsx(
                  'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('changes')}
                className={clsx(
                  'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                  activeTab === 'changes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                Changes
              </button>
            </nav>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === 'overview' && renderSuggestionOverview()}
            {activeTab === 'changes' && renderChangesView()}
          </div>
        </div>
      )}
    </div>
  );
} 