'use client';

import { useState } from 'react';
import { ComparisonRow, ComparisonOutput, ComparisonResult, SuggestionData } from '@/types/suggestion';
import GitHubStyleSuggestion from './GitHubStyleSuggestion';
import { Crown, Star, FileText, GitPullRequest, ChevronRight, AlertTriangle } from 'lucide-react';
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
    
    // Se não há dados parseados ou tem erro, mostrar fallback
    if (!output.parsed || (output.parsed as any).fallback) {
      let displayOutput = '';
      let errorInfo = '';
      
      if ((output.parsed as any)?.fallback) {
        errorInfo = (output.parsed as any).errorMessage || 'Erro no processamento';
      }
      
      try {
        if (typeof output.output === 'string') {
          displayOutput = output.output.substring(0, 300) + (output.output.length > 300 ? '...' : '');
        } else if (typeof output.output === 'object') {
          displayOutput = JSON.stringify(output.output, null, 2).substring(0, 300) + '...';
        } else {
          displayOutput = String(output.output).substring(0, 300) + '...';
        }
      } catch (e) {
        displayOutput = 'Erro ao exibir conteúdo: ' + String(e);
      }
      
      return (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 border-b border-red-200 px-4 py-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-medium text-red-800">Dados com problema</span>
            </div>
            {errorInfo && (
              <p className="text-red-700 text-sm mt-1">{errorInfo}</p>
            )}
          </div>
          <div className="p-4 bg-gray-50">
            <p className="text-gray-600 text-sm mb-2">Conteúdo original (limitado):</p>
            <pre className="text-xs text-gray-500 overflow-x-auto whitespace-pre-wrap font-mono">
              {displayOutput}
            </pre>
          </div>
        </div>
      );
    }

    // Se não há codeSuggestions, mostrar info básica
    if (!output.parsed.codeSuggestions || output.parsed.codeSuggestions.length === 0) {
      return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-700">Sem sugestões específicas</span>
            </div>
          </div>
          <div className="p-4">
            <p className="text-gray-600 text-sm mb-2">Resumo geral:</p>
            <p className="text-gray-800 text-sm leading-relaxed">
              {output.parsed.overallSummary || 'Nenhum resumo disponível'}
            </p>
          </div>
        </div>
      );
    }

    // Renderizar com o componente GitHubStyle
    return (
      <GitHubStyleSuggestion
        suggestion={output.parsed}
        title={output.label || 'Sugestão'}
        isSelected={selectedWinner === output.id}
        onSelect={() => handleWinnerSelection(output.id, output.label || 'Sugestão')}
      />
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

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <GitPullRequest className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Contexto do Código</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">Arquivo:</span>
                <code className="bg-blue-100 px-2 py-1 rounded text-blue-900 font-mono text-xs">
                  {comparisonRow.inputs.filePath || 'Não especificado'}
                </code>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 text-blue-600">🔧</span>
                <span className="font-medium text-blue-800">Linguagem:</span>
                <span className="bg-blue-100 px-2 py-1 rounded text-blue-900 text-xs">
                  {comparisonRow.inputs.language || 'Não especificado'}
                </span>
              </div>
            </div>
            
            {comparisonRow.inputs.pullRequest?.title && (
              <div className="md:col-span-2">
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-800">Pull Request:</span>
                  <span className="text-blue-700">
                    {comparisonRow.inputs.pullRequest.title}
                  </span>
                </div>
              </div>
            )}
            
            {comparisonRow.inputs.description && (
              <div className="md:col-span-2">
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-800">Descrição:</span>
                  <span className="text-blue-700">
                    {comparisonRow.inputs.description}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparação das Opções */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Escolha a melhor sugestão:
        </h3>

        <div className="space-y-6">
          {comparisonOptions.map((option) => (
            <div key={option.id} className="space-y-2">
              {/* Header simplificado */}
              <div className="flex items-center justify-between px-1">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <span>{option.label || 'Sem Label'}</span>
                  {selectedWinner === option.id && (
                    <Crown className="w-5 h-5 text-yellow-500" />
                  )}
                </h4>
                
                {selectedWinner === option.id && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <Crown className="w-4 h-4 mr-1" />
                    Vencedor
                  </span>
                )}
              </div>

              {/* Renderizar com o novo componente */}
              <div>
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