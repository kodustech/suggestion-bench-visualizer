'use client';

import { useState } from 'react';
import { CodeSuggestion, SuggestionFeedback } from '@/types/suggestion';
import CodeDiff from './CodeDiff';
import { ThumbsUp, ThumbsDown, FileText, Tag } from 'lucide-react';
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

  const getLabelColor = (label: string) => {
    const colors: { [key: string]: string } = {
      'refactoring': 'bg-blue-100 text-blue-800',
      'bug-fix': 'bg-red-100 text-red-800',
      'performance': 'bg-yellow-100 text-yellow-800',
      'security': 'bg-purple-100 text-purple-800',
      'style': 'bg-green-100 text-green-800',
      'default': 'bg-gray-100 text-gray-800'
    };
    return colors[label] || colors.default;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-500">
              Sugestão {index + 1} de {total}
            </span>
            <span className={clsx(
              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
              getLabelColor(suggestion.label)
            )}>
              <Tag className="w-3 h-3 mr-1" />
              {suggestion.label}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <FileText className="w-4 h-4" />
            <span>{suggestion.relevantFile}</span>
            <span>•</span>
            <span>Linhas {suggestion.relevantLinesStart}-{suggestion.relevantLinesEnd}</span>
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
              Esta sugestão é útil?
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
                Aprovar
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
                Rejeitar
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setShowComment(!showComment)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showComment ? 'Ocultar comentário' : 'Adicionar comentário'}
          </button>
        </div>

        {showComment && (
          <div className="mt-4">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Adicione um comentário sobre esta sugestão..."
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