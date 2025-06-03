'use client';

import { useState } from 'react';
import { CodeSuggestion, SuggestionFeedback } from '@/types/suggestion';
import CodeDiff from './CodeDiff';
import { ThumbsUp, ThumbsDown, FileText, Tag, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import clsx from 'clsx';

interface SuggestionCardProps {
  suggestion: CodeSuggestion;
  index: number;
  total: number;
  onFeedback: (feedback: SuggestionFeedback) => void;
  existingFeedback?: SuggestionFeedback;
}

export default function SuggestionCard({
  suggestion,
  index,
  total,
  onFeedback,
  existingFeedback
}: SuggestionCardProps) {
  const [comment, setComment] = useState(existingFeedback?.comment || '');
  const [showComment, setShowComment] = useState(false);

  const handleFeedback = (approved: boolean) => {
    const feedback: SuggestionFeedback = {
      id: `${suggestion.relevantFile}-${suggestion.relevantLinesStart}`,
      approved,
      comment: comment.trim() || undefined
    };
    onFeedback(feedback);
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'error':
      case 'critical':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      case 'info':
        return <Info className="w-3 h-3 text-blue-500" />;
      default:
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
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
    
    // Mapear labels comuns para severidade
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
    
    // Common specific labels in the code review context
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-500">
              Suggestion {index + 1} of {total}
            </span>
            {suggestion.label && (() => {
              const severity = suggestion.severity || inferSeverityFromLabel(suggestion.label);
              console.log(`🎯 SuggestionCard - label: "${suggestion.label}", severidade: "${severity}"`);
              return (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityBadgeClasses(severity)}`}>
                  {getSeverityIcon(severity)}
                  <span className="ml-1">{suggestion.label}</span>
                </span>
              );
            })()}
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <FileText className="w-4 h-4" />
            <span>{suggestion.relevantFile}</span>
            <span>•</span>
            <span>Lines {suggestion.relevantLinesStart}-{suggestion.relevantLinesEnd}</span>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {suggestion.oneSentenceSummary}
          </h3>
          <div className="text-gray-700 leading-relaxed">
            {suggestion.suggestionContent}
          </div>
        </div>
      </div>

      {/* Diff */}
      <div className="p-6">
        <CodeDiff
          oldCode={suggestion.existingCode}
          newCode={suggestion.improvedCode}
          language={suggestion.language}
        />
      </div>

      {/* Feedback Section */}
      <div className="border-t border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">
              Is this suggestion helpful?
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleFeedback(true)}
                className={clsx(
                  'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  existingFeedback?.approved === true
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700 border border-gray-300'
                )}
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                Approve
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className={clsx(
                  'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  existingFeedback?.approved === false
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700 border border-gray-300'
                )}
              >
                <ThumbsDown className="w-4 h-4 mr-1" />
                Reject
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setShowComment(!showComment)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showComment ? 'Hide comment' : 'Add comment'}
          </button>
        </div>

        {showComment && (
          <div className="mt-4">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment about this suggestion..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
        )}

        {existingFeedback && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <div className="text-sm">
              <span className="font-medium">Status: </span>
              <span className={clsx(
                'font-medium',
                existingFeedback.approved ? 'text-green-600' : 'text-red-600'
              )}>
                {existingFeedback.approved ? 'Aprovada' : 'Rejeitada'}
              </span>
              {existingFeedback.comment && (
                <div className="mt-2 text-gray-600">
                  <span className="font-medium">Comentário: </span>
                  {existingFeedback.comment}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 