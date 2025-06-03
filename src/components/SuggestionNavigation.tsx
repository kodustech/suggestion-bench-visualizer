'use client';

import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';
import clsx from 'clsx';

interface SuggestionNavigationProps {
  currentIndex: number;
  total: number;
  onNavigate: (index: number) => void;
  feedbackCount: number;
}

export default function SuggestionNavigation({
  currentIndex,
  total,
  onNavigate,
  feedbackCount
}: SuggestionNavigationProps) {
  const progress = ((feedbackCount) / total) * 100;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Revisar Sugestões de Código
          </h2>
          <div className="text-sm text-gray-500">
            {feedbackCount} de {total} avaliadas
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Progresso */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Progresso:</span>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Navegação */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onNavigate(0)}
              disabled={currentIndex === 0}
              className={clsx(
                'p-2 rounded-md transition-colors',
                currentIndex === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
              title="Primeira sugestão"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className={clsx(
                'p-2 rounded-md transition-colors',
                currentIndex === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
              title="Sugestão anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-4 py-2 text-sm font-medium text-gray-700">
              {currentIndex + 1} / {total}
            </span>

            <button
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex === total - 1}
              className={clsx(
                'p-2 rounded-md transition-colors',
                currentIndex === total - 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
              title="Próxima sugestão"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate(total - 1)}
              disabled={currentIndex === total - 1}
              className={clsx(
                'p-2 rounded-md transition-colors',
                currentIndex === total - 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
              title="Última sugestão"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 