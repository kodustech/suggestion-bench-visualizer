export interface CodeSuggestion {
  relevantFile: string;
  language: string;
  suggestionContent: string;
  existingCode: string;
  improvedCode: string;
  oneSentenceSummary: string;
  relevantLinesStart: number;
  relevantLinesEnd: number;
  label: string;
}

export interface SuggestionData {
  overallSummary: string;
  codeSuggestions: CodeSuggestion[];
}

export interface SuggestionFeedback {
  id: string;
  approved: boolean;
  comment?: string;
}

// Novos tipos para comparação A/B
export interface ComparisonInput {
  filePath: string;
  language: string;
  fileContent: string;
  pullRequest: any; // dados do PR
  [key: string]: any; // outros campos do input
}

export interface ComparisonOutput {
  output: string; // JSON string da saída do modelo
  parsed?: SuggestionData; // saída parseada
  label?: string; // nome do modelo/versão
}

export interface ComparisonRow {
  id: string;
  inputs: ComparisonInput;
  reference_outputs?: ComparisonOutput;
  outputs: ComparisonOutput;
  // Suporte para múltiplas saídas (A/B/C testing)
  alternativeOutputs?: ComparisonOutput[];
}

export interface ComparisonResult {
  rowId: string;
  winnerId: string; // qual output ganhou
  winnerLabel: string;
  confidence: number; // 1-5 quão confiante está na escolha
  reasoning: string; // por que escolheu esse
  timestamp: string;
}

export interface ComparisonStats {
  totalComparisons: number;
  completedComparisons: number;
  modelPerformance: { [modelLabel: string]: { wins: number; total: number } };
  averageConfidence: number;
} 