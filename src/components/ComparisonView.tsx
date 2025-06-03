'use client';

import { useState } from 'react';
import { ComparisonRow, ComparisonOutput, ComparisonResult, SuggestionData } from '@/types/suggestion';
import SuggestionCard from './SuggestionCard';
import { Crown, Star, FileText, GitPullRequest, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface ComparisonViewProps {
  comparisonRow: ComparisonRow;
  index: number;
  total: number;
  onResult: (result: ComparisonResult) => void;
  existingResult?: ComparisonResult;
}

export default function ComparisonView({
  comparisonRow,
  index,
  total,
  onResult,
  existingResult
}: ComparisonViewProps) {
  const [selectedWinner, setSelectedWinner] = useState<string>(existingResult?.winnerId || '');
  const [confidence, setConfidence] = useState<number>(existingResult?.confidence || 3);
  const [reasoning, setReasoning] = useState<string>(existingResult?.reasoning || '');
  const [showReasoningInput, setShowReasoningInput] = useState<boolean>(false);

  // Preparar as opções para comparação
  const comparisonOptions: (ComparisonOutput & { id: string })[] = [];
  
  if (comparisonRow.reference_outputs) {
    comparisonOptions.push({
      ...comparisonRow.reference_outputs,
      id: 'reference'
    });
  }
  
  comparisonOptions.push({
    ...comparisonRow.outputs,
    id: 'main'
  });

  if (comparisonRow.alternativeOutputs) {
    comparisonRow.alternativeOutputs.forEach((alt, idx) => {
      comparisonOptions.push({
        ...alt,
        id: `alt_${idx}`
      });
    });
  }

  const handleWinnerSelection = (winnerId: string, winnerLabel: string) => {
    setSelectedWinner(winnerId);
    
    const result: ComparisonResult = {
      rowId: comparisonRow.id,
      winnerId,
      winnerLabel,
      confidence,
      reasoning: reasoning.trim(),
      timestamp: new Date().toISOString()
    };
    
    onResult(result);
  };

  const getConfidenceLabel = (level: number): string => {
    const labels = ['Muito baixa', 'Baixa', 'Média', 'Alta', 'Muito alta'];
    return labels[level - 1] || 'Média';
  };

  const getConfidenceColor = (level: number): string => {
    if (level <= 2) return 'text-red-600';
    if (level === 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  const renderSuggestionPreview = (output: ComparisonOutput & { id: string }) => {
    console.log('renderSuggestionPreview chamado com output:', output);
    console.log('output.parsed:', output.parsed);
    console.log('Análise do output:', {
      outputType: typeof output.output,
      outputIsString: typeof output.output === 'string',
      outputIsObject: typeof output.output === 'object',
      parsedType: typeof output.parsed,
      parsedIsNull: output.parsed === null,
      parsedIsUndefined: output.parsed === undefined,
      hasCodeSuggestions: output.parsed?.codeSuggestions ? output.parsed.codeSuggestions.length : 'N/A'
    });
    
    if (!output.parsed) {
      console.log('output.parsed é null/undefined, mostrando preview simples');
      
      // Tratar output.output de forma segura - pode ser string, objeto, etc.
      let displayOutput = '';
      try {
        if (typeof output.output === 'string') {
          displayOutput = output.output.substring(0, 200) + (output.output.length > 200 ? '...' : '');
        } else if (typeof output.output === 'object') {
          displayOutput = JSON.stringify(output.output, null, 2).substring(0, 200) + '...';
        } else {
          displayOutput = String(output.output).substring(0, 200) + '...';
        }
      } catch (e) {
        displayOutput = 'Erro ao exibir conteúdo: ' + String(e);
      }
      
      return (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-sm">Não foi possível analisar esta sugestão</p>
          <pre className="text-xs text-gray-500 mt-2 overflow-x-auto whitespace-pre-wrap">
            {displayOutput}
          </pre>
        </div>
      );
    }

    const suggestion = output.parsed.codeSuggestions?.[0];
    console.log('suggestion extraída:', suggestion);
    
    if (!suggestion) {
      console.log('Nenhuma suggestion encontrada em codeSuggestions');
      console.log('Estrutura do parsed:', Object.keys(output.parsed || {}));
      console.log('codeSuggestions array:', output.parsed?.codeSuggestions);
      
      return (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-sm">Nenhuma sugestão encontrada</p>
          <p className="text-xs text-gray-400 mt-1">
            overallSummary: {output.parsed.overallSummary || 'N/A'}
          </p>
          <details className="mt-2">
            <summary className="text-xs text-gray-400 cursor-pointer">Debug info</summary>
            <pre className="text-xs text-gray-400 mt-1 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(output.parsed, null, 2)}
            </pre>
          </details>
        </div>
      );
    }

    console.log('Renderizando suggestion completa:', suggestion);
    
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Resumo Geral</h4>
          <p className="text-blue-800 text-sm">{output.parsed.overallSummary}</p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
            <FileText className="w-4 h-4" />
            <span>{suggestion.relevantFile || 'Arquivo não especificado'}</span>
            {(suggestion.relevantLinesStart || suggestion.relevantLinesEnd) && (
              <>
                <span>•</span>
                <span>
                  Linhas {suggestion.relevantLinesStart || '?'}-{suggestion.relevantLinesEnd || '?'}
                </span>
              </>
            )}
          </div>
          
          <h5 className="font-medium text-gray-900 mb-2">
            {suggestion.oneSentenceSummary || 'Resumo não disponível'}
          </h5>
          
          <p className="text-gray-700 text-sm leading-relaxed">
            {suggestion.suggestionContent || 'Conteúdo da sugestão não disponível'}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <span className={clsx(
              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
              'bg-blue-100 text-blue-800'
            )}>
              {suggestion.label || 'sem-categoria'}
            </span>
            
            {/* Debug info quando necessário */}
            <details className="text-xs">
              <summary className="text-gray-400 cursor-pointer">Debug</summary>
              <pre className="text-gray-400 mt-1 max-w-xs overflow-x-auto">
                {JSON.stringify(suggestion, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-500">
              Comparação {index + 1} de {total}
            </span>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-sm text-gray-500">ID: {comparisonRow.id}</span>
          </div>
          
          {existingResult && (
            <div className="flex items-center space-x-2 text-sm">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="font-medium text-gray-700">
                Vencedor: {existingResult.winnerLabel}
              </span>
            </div>
          )}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
            <GitPullRequest className="w-4 h-4" />
            <span>Arquivo: {comparisonRow.inputs.filePath}</span>
            <span>•</span>
            <span>Linguagem: {comparisonRow.inputs.language}</span>
          </div>
          
          {comparisonRow.inputs.pullRequest?.title && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">PR: </span>
              {comparisonRow.inputs.pullRequest.title}
            </div>
          )}
        </div>
      </div>

      {/* Comparação das Opções */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Escolha a melhor sugestão:
        </h3>

        <div className="grid gap-6" style={{
          gridTemplateColumns: `repeat(${comparisonOptions.length}, minmax(0, 1fr))`
        }}>
          {comparisonOptions.map((option) => (
            <div key={option.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">
                  {option.label || 'Sem Label'}
                </h4>
                
                <button
                  onClick={() => handleWinnerSelection(option.id, option.label || 'Sem Label')}
                  className={clsx(
                    'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    selectedWinner === option.id
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700 border border-gray-300'
                  )}
                >
                  {selectedWinner === option.id ? (
                    <>
                      <Crown className="w-4 h-4 mr-2" />
                      Vencedor
                    </>
                  ) : (
                    <>
                      Escolher
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {renderSuggestionPreview(option)}
              </div>
            </div>
          ))}
        </div>

        {/* Confiança e Justificativa */}
        {selectedWinner && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Nível de confiança na escolha:
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Muito baixa</span>
                    <span className={clsx('font-medium', getConfidenceColor(confidence))}>
                      {getConfidenceLabel(confidence)}
                    </span>
                    <span>Muito alta</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Justificativa (opcional):
                  </label>
                  <button
                    onClick={() => setShowReasoningInput(!showReasoningInput)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {showReasoningInput ? 'Ocultar' : 'Adicionar justificativa'}
                  </button>
                </div>
                
                {showReasoningInput && (
                  <textarea
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    placeholder="Por que esta opção é melhor?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                )}
              </div>
            </div>

            {existingResult && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm">
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">
                      Escolha registrada: {existingResult.winnerLabel}
                    </span>
                    <span className="text-green-600">
                      (Confiança: {getConfidenceLabel(existingResult.confidence)})
                    </span>
                  </div>
                  {existingResult.reasoning && (
                    <div className="mt-2 text-green-700">
                      <span className="font-medium">Justificativa: </span>
                      {existingResult.reasoning}
                    </div>
                  )}
                  <div className="mt-1 text-green-600 text-xs">
                    {new Date(existingResult.timestamp).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 