'use client';

import { useState, useEffect } from 'react';
import { ComparisonRow, ComparisonOutput, ComparisonResult, SuggestionData } from '@/types/suggestion';
import GitHubStyleSuggestion from './GitHubStyleSuggestion';
import { Crown, Star, FileText, GitPullRequest, ChevronRight, AlertTriangle, Edit2, Check, X } from 'lucide-react';
import clsx from 'clsx';

interface ComparisonViewProps {
  comparisonRow: ComparisonRow;
  index: number;
  total: number;
  onResult: (result: ComparisonResult) => void;
  existingResult?: ComparisonResult;
  onLabelChange?: (comparisonId: string, optionId: string, newLabel: string) => void;
  savedLabels?: { [key: string]: string }; // chave: optionId global, valor: label
}

export default function ComparisonView({
  comparisonRow,
  index,
  total,
  onResult,
  existingResult,
  onLabelChange,
  savedLabels = {}
}: ComparisonViewProps) {
  const [selectedWinner, setSelectedWinner] = useState<string>(existingResult?.winnerId || '');
  const [confidence, setConfidence] = useState<number>(existingResult?.confidence || 3);
  const [reasoning, setReasoning] = useState<string>(existingResult?.reasoning || '');
  const [showReasoningInput, setShowReasoningInput] = useState<boolean>(false);
  const [currentComparisonId, setCurrentComparisonId] = useState<string>(comparisonRow.id);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState<string>('');

  // Limpar decisão quando muda de comparação
  useEffect(() => {
    // Verificar se realmente mudou de comparação
    if (comparisonRow.id !== currentComparisonId) {
      setCurrentComparisonId(comparisonRow.id);
      
      if (existingResult) {
        // Se há resultado salvo, carregar ele
        setSelectedWinner(existingResult.winnerId);
        setConfidence(existingResult.confidence);
        setReasoning(existingResult.reasoning);
        setShowReasoningInput(!!existingResult.reasoning.trim());
        console.log(`✅ Loading saved result for comparison ${comparisonRow.id}: ${existingResult.winnerLabel}`);
      } else {
        // Se não há resultado salvo, limpar tudo
        setSelectedWinner('');
        setConfidence(3);
        setReasoning('');
        setShowReasoningInput(false);
        console.log(`🔄 Comparação ${comparisonRow.id} resetada - nenhuma decisão prévia`);
      }
    }
  }, [comparisonRow.id, existingResult, currentComparisonId]); // Reagir quando muda o ID da comparação

  // Preparar as opções para comparação
  const comparisonOptions: (ComparisonOutput & { id: string })[] = [];
  console.log(`🔢 Iniciando comparação ${comparisonRow.id} com:`, {
    temReference: !!comparisonRow.reference_outputs,
    temMain: !!comparisonRow.outputs,
    numAlternatives: comparisonRow.alternativeOutputs?.length || 0
  });
  
  if (comparisonRow.reference_outputs) {
    const savedLabel = savedLabels['reference']; // Label global
    comparisonOptions.push({
      ...comparisonRow.reference_outputs,
      id: 'reference',
      label: savedLabel || comparisonRow.reference_outputs.label || 'Model A'
    });
  }
  
  const mainSavedLabel = savedLabels['main']; // Label global
  comparisonOptions.push({
    ...comparisonRow.outputs,
    id: 'main',
    label: mainSavedLabel || comparisonRow.outputs.label || 'Model B'
  });

  if (comparisonRow.alternativeOutputs) {
    comparisonRow.alternativeOutputs.forEach((alt, idx) => {
      const altSavedLabel = savedLabels[`alt_${idx}`]; // Label global
      comparisonOptions.push({
        ...alt,
        id: `alt_${idx}`,
        label: altSavedLabel || alt.label || `Model ${String.fromCharCode(67 + idx)}` // C, D, E...
      });
    });
  }

  console.log(`✅ Comparação ${comparisonRow.id} preparada com ${comparisonOptions.length} opções:`, 
    comparisonOptions.map(o => `${o.id}: ${o.label}`).join(', '));

  const handleWinnerSelection = (winnerId: string, winnerLabel: string) => {
    setSelectedWinner(winnerId);
    
    // Obter o label atualizado da opção (caso tenha sido renomeado)
    const actualLabel = winnerId === 'tie' ? 'Tie' :
                       winnerId === 'undefined' ? 'Undefined' :
                       comparisonOptions.find(o => o.id === winnerId)?.label || winnerLabel;
    
    const result: ComparisonResult = {
      rowId: comparisonRow.id,
      winnerId,
      winnerLabel: actualLabel,
      confidence,
      reasoning: reasoning.trim(),
      timestamp: new Date().toISOString()
    };
    
    onResult(result);
    console.log(`🎯 Selected result for ${comparisonRow.id}: ${actualLabel}`);
  };

  const handleConfidenceChange = (newConfidence: number) => {
    setConfidence(newConfidence);
    
    // Se já há um vencedor selecionado, salvar automaticamente
    if (selectedWinner) {
      const result: ComparisonResult = {
        rowId: comparisonRow.id,
        winnerId: selectedWinner,
        winnerLabel: selectedWinner === 'tie' ? 'Tie' : 
                    selectedWinner === 'undefined' ? 'Undefined' :
                    comparisonOptions.find(o => o.id === selectedWinner)?.label || 'Unknown',
        confidence: newConfidence,
        reasoning: reasoning.trim(),
        timestamp: new Date().toISOString()
      };
      
      onResult(result);
    }
  };

  const handleReasoningChange = (newReasoning: string) => {
    setReasoning(newReasoning);
    
    // Se já há um vencedor selecionado, salvar automaticamente
    if (selectedWinner) {
      const result: ComparisonResult = {
        rowId: comparisonRow.id,
        winnerId: selectedWinner,
        winnerLabel: selectedWinner === 'tie' ? 'Tie' : 
                    selectedWinner === 'undefined' ? 'Undefined' :
                    comparisonOptions.find(o => o.id === selectedWinner)?.label || 'Unknown',
        confidence,
        reasoning: newReasoning.trim(),
        timestamp: new Date().toISOString()
      };
      
      onResult(result);
    }
  };

  const startEditingLabel = (optionId: string, currentLabel: string) => {
    setEditingLabel(optionId);
    setTempLabel(currentLabel);
  };

  const cancelEditingLabel = () => {
    setEditingLabel(null);
    setTempLabel('');
  };

  const saveLabel = (optionId: string) => {
    const newLabel = tempLabel.trim();
    if (newLabel && onLabelChange) {
      onLabelChange(comparisonRow.id, optionId, newLabel);
      console.log(`📝 Model ${optionId} label changed to: ${newLabel}`);
    }
    
    setEditingLabel(null);
    setTempLabel('');
  };

  const getConfidenceLabel = (level: number): string => {
    const labels = ['Very low', 'Low', 'Medium', 'High', 'Very high'];
    return labels[level - 1] || 'Medium';
  };

  const getConfidenceColor = (level: number): string => {
    if (level <= 2) return 'text-red-600';
    if (level === 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  const renderSuggestionPreview = (output: ComparisonOutput & { id: string }) => {
    console.log('renderSuggestionPreview called with output:', output);
    console.log('output.parsed:', output.parsed);
    
    // If there's no parsed data or there's an error, show fallback
    if (!output.parsed || (output.parsed as any).fallback) {
      let displayOutput = '';
      let errorInfo = '';
      
      if ((output.parsed as any)?.fallback) {
        errorInfo = (output.parsed as any).errorMessage || 'Error in processing';
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
        displayOutput = 'Error displaying content: ' + String(e);
      }
      
      return (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 border-b border-red-200 px-4 py-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-medium text-red-800">Problematic data</span>
            </div>
            {errorInfo && (
              <p className="text-red-700 text-sm mt-1">{errorInfo}</p>
            )}
          </div>
          <div className="p-4 bg-gray-50">
            <p className="text-gray-600 text-sm mb-2">Original content (limited):</p>
            <pre className="text-xs text-gray-500 overflow-x-auto whitespace-pre-wrap font-mono">
              {displayOutput}
            </pre>
          </div>
        </div>
      );
    }

    // If there are no codeSuggestions, show basic info
    if (!output.parsed.codeSuggestions || output.parsed.codeSuggestions.length === 0) {
      return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-700">No specific suggestions</span>
            </div>
          </div>
          <div className="p-4">
            <p className="text-gray-600 text-sm mb-2">Overall summary:</p>
            <p className="text-gray-800 text-sm leading-relaxed">
              {output.parsed.overallSummary || 'No summary available'}
            </p>
          </div>
        </div>
      );
    }

    // Render with GitHubStyle component without onSelect (we use centralized buttons)
    return (
      <GitHubStyleSuggestion
        suggestion={output.parsed}
        title={output.label || 'Suggestion'}
        isSelected={selectedWinner === output.id}
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
          
          <div className="flex items-center space-x-3">
            {existingResult && (
              <div className="flex items-center space-x-2 text-sm">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="font-medium text-gray-700">
                  Saved result: {existingResult.winnerLabel}
                </span>
              </div>
            )}
            
            {!existingResult && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Nova comparação</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <GitPullRequest className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Code Context</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">File:</span>
                <code className="bg-blue-100 px-2 py-1 rounded text-blue-900 font-mono text-xs">
                  {comparisonRow.inputs.filePath || 'Not specified'}
                </code>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 text-blue-600">🔧</span>
                <span className="font-medium text-blue-800">Language:</span>
                <span className="bg-blue-100 px-2 py-1 rounded text-blue-900 text-xs">
                  {comparisonRow.inputs.language || 'Not specified'}
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
                  <span className="font-medium text-blue-800">Description:</span>
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Choose the best suggestion:
            </h3>
            <span className={clsx(
              "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
              comparisonOptions.length > 6 ? "bg-orange-100 text-orange-800" :
              comparisonOptions.length > 4 ? "bg-yellow-100 text-yellow-800" :
              "bg-blue-100 text-blue-800"
            )}>
              {comparisonOptions.length} model{comparisonOptions.length !== 1 ? 's' : ''} in comparison
              {comparisonOptions.length > 6 && " ⚠️"}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Edit2 className="w-4 h-4 mr-1" />
            <span>💡 Rename models (e.g., GPT-4, Claude) - applies to all comparisons</span>
            {Object.keys(savedLabels).length > 0 && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                {Object.keys(savedLabels).length} customized
              </span>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {comparisonOptions.map((option) => (
            <div key={option.id} className="space-y-2">
              {/* Header com edição de label */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2">
                  {editingLabel === option.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={tempLabel}
                        onChange={(e) => setTempLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveLabel(option.id);
                          } else if (e.key === 'Escape') {
                            cancelEditingLabel();
                          }
                        }}
                        className="px-2 py-1 border border-blue-300 rounded text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        placeholder="Enter model name..."
                      />
                      <button
                        onClick={() => saveLabel(option.id)}
                        className="p-1 text-green-600 hover:text-green-800"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditingLabel}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 group">
                      <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <span>{option.label || 'No Label'}</span>
                        {savedLabels[option.id] && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full" title="Custom name">
                            ✏️
                          </span>
                        )}
                        {selectedWinner === option.id && (
                          <Crown className="w-5 h-5 text-yellow-500" />
                        )}
                      </h4>
                      <button
                        onClick={() => startEditingLabel(option.id, option.label || '')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
                        title="Rename model"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {selectedWinner === option.id && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <Crown className="w-4 h-4 mr-1" />
                    Winner
                  </span>
                )}
              </div>

              {/* Renderizar sem botão de seleção individual */}
              <div>
                <GitHubStyleSuggestion
                  suggestion={option.parsed || { overallSummary: 'Processing error', codeSuggestions: [] }}
                  title={option.label || 'Suggestion'}
                  isSelected={selectedWinner === option.id}
                  // Remover onSelect para usar apenas os botões centralizados
                />
              </div>
            </div>
          ))}
        </div>

        {/* Resultado atual */}
        {selectedWinner && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center mb-4">
              <div className={clsx(
                'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium',
                selectedWinner === 'tie' ? 'bg-yellow-100 text-yellow-800' :
                selectedWinner === 'undefined' ? 'bg-gray-100 text-gray-800' :
                'bg-green-100 text-green-800'
              )}>
                {selectedWinner === 'tie' && (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-yellow-600 bg-yellow-200 mr-2"></div>
                    Result: Tie
                  </>
                )}
                {selectedWinner === 'undefined' && (
                  <>
                    <div className="w-4 h-4 rounded border border-gray-600 bg-gray-200 mr-2"></div>
                    Result: Not defined
                  </>
                )}
                {selectedWinner !== 'tie' && selectedWinner !== 'undefined' && (
                  <>
                    <Crown className="w-4 h-4 mr-2" />
                    Vencedor: {comparisonOptions.find(o => o.id === selectedWinner)?.label}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Opções de resultado */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4">
            {selectedWinner ? 'Change result:' : 'Comparison result:'} 
            <span className="text-xs text-gray-500 ml-2">
              ({comparisonOptions.length} model{comparisonOptions.length !== 1 ? 's' : ''} + tie/undefined)
            </span>
          </h4>
          
          {comparisonOptions.length > 6 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-orange-800">
                <span>⚠️</span>
                <span className="font-medium">Too many models detected!</span>
                <span>Layout has been automatically adjusted for {comparisonOptions.length} options.</span>
              </div>
            </div>
          )}
          <div className={`grid gap-3 mb-6 ${
            comparisonOptions.length <= 2 ? 'grid-cols-2 lg:grid-cols-4' :
            comparisonOptions.length <= 4 ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' :
            comparisonOptions.length <= 6 ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {comparisonOptions.map((option, index) => (
              <button
                key={option.id}
                onClick={() => handleWinnerSelection(option.id, option.label || 'Sem Label')}
                className={clsx(
                  'flex flex-col items-center p-3 rounded-lg border-2 transition-all text-sm relative',
                  selectedWinner === option.id
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700',
                  comparisonOptions.length > 4 ? 'min-h-[80px]' : 'min-h-[100px]'
                )}
              >
                {/* Indicador de posição para muitos modelos */}
                {comparisonOptions.length > 4 && (
                  <div className="absolute top-1 left-2 text-xs text-gray-400 font-mono">
                    #{index + 1}
                  </div>
                )}
                
                <Crown className={clsx(
                  'mb-2',
                  selectedWinner === option.id ? 'text-green-600' : 'text-gray-400',
                  comparisonOptions.length > 6 ? 'w-4 h-4' : 'w-5 h-5'
                )} />
                <span className={clsx(
                  'font-medium text-center leading-tight',
                  comparisonOptions.length > 6 ? 'text-xs' : 'text-sm'
                )}>
                  {option.label || 'Sem Label'}
                </span>
                
                {/* Indicador de personalização */}
                {savedLabels[option.id] && (
                  <div className="absolute top-1 right-2 w-2 h-2 bg-blue-500 rounded-full" title="Nome personalizado"></div>
                )}
              </button>
            ))}
            
            {/* Opção de empate */}
            <button
              onClick={() => handleWinnerSelection('tie', 'Empate')}
              className={clsx(
                'flex flex-col items-center p-4 rounded-lg border-2 transition-all text-sm',
                selectedWinner === 'tie'
                  ? 'border-yellow-500 bg-yellow-50 text-yellow-800'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              )}
            >
              <div className={clsx(
                'w-5 h-5 mb-2 rounded-full border-2',
                selectedWinner === 'tie' ? 'border-yellow-600 bg-yellow-200' : 'border-gray-400'
              )}></div>
              <span className="font-medium">Empate</span>
            </button>
            
            {/* Opção de não definido */}
            <button
              onClick={() => handleWinnerSelection('undefined', 'Não definido')}
              className={clsx(
                'flex flex-col items-center p-4 rounded-lg border-2 transition-all text-sm',
                selectedWinner === 'undefined'
                  ? 'border-gray-500 bg-gray-50 text-gray-800'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              )}
            >
              <div className={clsx(
                'w-5 h-5 mb-2 rounded border',
                selectedWinner === 'undefined' ? 'border-gray-600 bg-gray-200' : 'border-gray-400'
              )}></div>
              <span className="font-medium">Não definido</span>
            </button>
          </div>
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
                    onChange={(e) => handleConfidenceChange(Number(e.target.value))}
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
                    onChange={(e) => handleReasoningChange(e.target.value)}
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