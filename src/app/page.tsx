'use client';

import { useState, useEffect } from 'react';
import { SuggestionData, SuggestionFeedback, ComparisonRow, ComparisonResult, ComparisonStats } from '@/types/suggestion';
import SuggestionCard from '@/components/SuggestionCard';
import SuggestionNavigation from '@/components/SuggestionNavigation';
import ComparisonView from '@/components/ComparisonView';
import ComparisonStatsComponent from '@/components/ComparisonStats';
import FileUpload from '@/components/FileUpload';
import { useCsvParser } from '@/hooks/useCsvParser';
import { Upload, Download, AlertCircle, CheckCircle, GitCompare, FileText, BarChart3, Type, FileUp, RefreshCw, Trash2 } from 'lucide-react';

type AppMode = 'input' | 'suggestions' | 'comparison';

export default function Home() {
  const [mode, setMode] = useState<AppMode>('input');
  const [jsonInput, setJsonInput] = useState('');
  const [csvInput, setCsvInput] = useState('');
  const [inputType, setInputType] = useState<'json' | 'csv'>('json');
  const [inputMethod, setInputMethod] = useState<'upload' | 'paste'>('upload');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  
  // Estados para modo sugestões
  const [suggestions, setSuggestions] = useState<SuggestionData[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [feedbacks, setFeedbacks] = useState<{ [key: string]: SuggestionFeedback }>({});
  
  // Estados para modo comparação A/B
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);
  const [currentComparisonIndex, setCurrentComparisonIndex] = useState(0);
  const [comparisonResults, setComparisonResults] = useState<{ [key: string]: ComparisonResult }>({});
  const [modelLabels, setModelLabels] = useState<{ [key: string]: string }>({});
  
  // Key para localStorage baseada no hash dos dados
  const [storageKey, setStorageKey] = useState<string>('');
  
  const [error, setError] = useState('');
  const [isDataValid, setIsDataValid] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const { parseCsv, isLoading: csvLoading, error: csvError } = useCsvParser();
  const [csvWarning, setCsvWarning] = useState<string>('');

  // Funções para localStorage
  const generateStorageKey = (data: string): string => {
    // Simples hash para identificar únicamente o dataset
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `suggestion-visualizer-${Math.abs(hash)}`;
  };

  const saveToLocalStorage = (key: string, results: { [key: string]: ComparisonResult }, labels: { [key: string]: string } = {}) => {
    try {
      const dataToSave = {
        results,
        labels,
        timestamp: new Date().toISOString(),
        version: '1.1'
      };
      localStorage.setItem(key, JSON.stringify(dataToSave));
      console.log('💾 Dados salvos no localStorage com key:', key);
    } catch (error) {
      console.error('❌ Erro ao salvar no localStorage:', error);
    }
  };

  const loadFromLocalStorage = (key: string): { results: { [key: string]: ComparisonResult }, labels: { [key: string]: string } } => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        console.log('📥 Dados carregados do localStorage:', Object.keys(data.results || {}).length, 'resultados');
        console.log('📥 Labels carregados do localStorage:', Object.keys(data.labels || {}).length, 'labels');
        return {
          results: data.results || {},
          labels: data.labels || {}
        };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar do localStorage:', error);
    }
    return { results: {}, labels: {} };
  };

  const clearLocalStorage = (key: string) => {
    try {
      localStorage.removeItem(key);
      console.log('🗑️ Dados removidos do localStorage');
    } catch (error) {
      console.error('❌ Erro ao limpar localStorage:', error);
    }
  };

  // Todas as sugestões em lista plana (modo sugestões)
  const allSuggestions = suggestions.flatMap(data => 
    data.codeSuggestions.map(suggestion => ({
      ...suggestion,
      overallSummary: data.overallSummary
    }))
  );

  const feedbackCount = Object.keys(feedbacks).length;
  const comparisonResultCount = Object.keys(comparisonResults).length;

  // Processar dados quando mudarem
  useEffect(() => {
    if (inputType === 'json' && jsonInput.trim()) {
      try {
        const parsed = JSON.parse(jsonInput);
        const dataArray = Array.isArray(parsed) ? parsed : [parsed];
        setSuggestions(dataArray);
        setError('');
        setIsDataValid(true);
        setMode('suggestions');
        setCurrentItemIndex(0);
      } catch (e) {
        setError('JSON inválido. Por favor, verifique a formatação.');
        setIsDataValid(false);
      }
    } else if (inputType === 'csv' && csvInput.trim()) {
      parseCsv(csvInput)
        .then((rows) => {
          setComparisonRows(rows);
          setError('');
          setIsDataValid(true);
          setMode('comparison');
          setCurrentComparisonIndex(0);
          
          // Gerar key para localStorage e tentar carregar dados salvos
          const key = generateStorageKey(csvInput);
          setStorageKey(key);
          const savedData = loadFromLocalStorage(key);
          if (Object.keys(savedData.results).length > 0) {
            setComparisonResults(savedData.results);
            setModelLabels(savedData.labels);
            console.log('✅ Resultados anteriores carregados do localStorage');
          }
          
          // Verificar se houve avisos no console sobre linhas puladas
          const totalCsvLines = csvInput.trim().split('\n').length - 1; // -1 pelo header
          if (rows.length < totalCsvLines) {
            const skippedCount = totalCsvLines - rows.length;
            setCsvWarning(`⚠️ ${skippedCount} linha(s) foram puladas devido a erros no JSON. Verifique o console para detalhes das linhas problemáticas.`);
          } else {
            setCsvWarning('');
          }
        })
        .catch((error) => {
          setError(error.message);
          setIsDataValid(false);
          setCsvWarning('');
        });
    } else {
      setIsDataValid(false);
      setCsvWarning('');
      if (mode !== 'input') {
        setMode('input');
      }
    }
  }, [jsonInput, csvInput, inputType, mode, parseCsv]);

  // Salvar automaticamente quando resultados ou labels mudam
  useEffect(() => {
    if (storageKey && (Object.keys(comparisonResults).length > 0 || Object.keys(modelLabels).length > 0)) {
      saveToLocalStorage(storageKey, comparisonResults, modelLabels);
    }
  }, [comparisonResults, modelLabels, storageKey]);

  // Calcular estatísticas das comparações
  const getComparisonStats = (): ComparisonStats => {
    const results = Object.values(comparisonResults);
    const modelPerformance: { [key: string]: { wins: number; total: number } } = {};
    
    // Inicializar contadores para todos os modelos
    comparisonRows.forEach(row => {
      if (row.reference_outputs?.label) {
        if (!modelPerformance[row.reference_outputs.label]) {
          modelPerformance[row.reference_outputs.label] = { wins: 0, total: 0 };
        }
      }
      if (row.outputs?.label) {
        if (!modelPerformance[row.outputs.label]) {
          modelPerformance[row.outputs.label] = { wins: 0, total: 0 };
        }
      }
      row.alternativeOutputs?.forEach(alt => {
        if (alt.label && !modelPerformance[alt.label]) {
          modelPerformance[alt.label] = { wins: 0, total: 0 };
        }
      });
    });

    // Contar vitórias (excluir empates e não definidos das contagens de modelos)
    results.forEach(result => {
      if (result.winnerId !== 'tie' && result.winnerId !== 'undefined' && modelPerformance[result.winnerLabel]) {
        modelPerformance[result.winnerLabel].wins++;
      }
      
      // Apenas contar como total para modelos reais (não empates/não definidos)
      if (result.winnerId !== 'tie' && result.winnerId !== 'undefined') {
        Object.keys(modelPerformance).forEach(label => {
          modelPerformance[label].total++;
        });
      }
    });

    const totalConfidence = results.reduce((sum, result) => sum + result.confidence, 0);
    const averageConfidence = results.length > 0 ? totalConfidence / results.length : 0;

    return {
      totalComparisons: comparisonRows.length,
      completedComparisons: results.length,
      modelPerformance,
      averageConfidence
    };
  };

  const handleFeedback = (feedback: SuggestionFeedback) => {
    setFeedbacks(prev => ({
      ...prev,
      [feedback.id]: feedback
    }));
  };

  const handleNavigate = (index: number) => {
    setCurrentItemIndex(index);
  };

  const handleComparisonResult = (result: ComparisonResult) => {
    setComparisonResults(prev => ({
      ...prev,
      [result.rowId]: result
    }));
  };

  const handleComparisonNavigate = (index: number) => {
    setCurrentComparisonIndex(index);
  };

  const handleLabelChange = (comparisonId: string, optionId: string, newLabel: string) => {
    // Usar apenas o optionId como chave global (ex: "main", "reference", "alt_0")
    // Isso faz com que o label se aplique a todos os arquivos/comparações
    setModelLabels(prev => ({
      ...prev,
      [optionId]: newLabel
    }));
    console.log(`🏷️ Label global do modelo ${optionId} alterado para: ${newLabel}`);
  };

  const exportResults = () => {
    if (mode === 'suggestions') {
      // Exportar feedbacks das sugestões
      const exportData = {
        type: 'suggestion_feedbacks',
        totalSuggestions: allSuggestions.length,
        reviewedCount: feedbackCount,
        approvedCount: Object.values(feedbacks).filter(f => f.approved).length,
        rejectedCount: Object.values(feedbacks).filter(f => !f.approved).length,
        feedbacks: Object.values(feedbacks),
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `suggestion-feedback-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (mode === 'comparison') {
      // Exportar resultados das comparações A/B
      const stats = getComparisonStats();
      const exportData = {
        type: 'ab_test_results',
        stats,
        results: Object.values(comparisonResults),
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ab-test-results-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const loadSampleJsonData = () => {
    const sampleData = `[{
    "overallSummary": "Este PR introduz um novo módulo src/tools/midaz-setup.js que registra várias ferramentas com um servidor MCP. Essas ferramentas fornecem instruções detalhadas para vários cenários de implantação do backend Midaz, incluindo configuração local do Docker, implantação de produção usando Helm e implantação em nuvem usando Terraform e Helm para AWS, GCP e Azure.",
    "codeSuggestions": [
        {
            "relevantFile": "src/tools/midaz-setup.js",
            "language": "javascript",
            "suggestionContent": "Na ferramenta get-midaz-cloud-setup, detalhes específicos do provedor (como região, tamanho do nó, tipo K8s, tipo de banco de dados e comandos kubectl) são gerados usando múltiplos operadores ternários diretamente dentro do template literal de instruções. Este padrão de provider === '...' ? ... : ... é repetido para cada detalhe, levando a código verboso que pode ser mais difícil de ler e manter, especialmente se mais provedores ou detalhes específicos forem adicionados. Considere refatorar isso criando um mapa de objeto de configuração onde cada provedor ('aws', 'gcp', 'azure') mapeia para um objeto contendo todos os seus detalhes específicos.",
            "existingCode": "const instructions = \`...\n#### 2. Configure Terraform Variables\nEdit \\\`terraform.tfvars\\\`:\n\\\`\\\`\\\`hcl\n# terraform.tfvars\nregion = \\"\${provider === 'aws' ? 'us-west-2' : provider === 'gcp' ? 'us-central1' : 'East US'}\\"\\n...\\nnode_size = \\"\${provider === 'aws' ? 't3.medium' : provider === 'gcp' ? 'e2-medium' : 'Standard_B2s'}\\"\\n...\\nThis creates:\\n- **Kubernetes cluster** (\${provider === 'aws' ? 'EKS' : provider === 'gcp' ? 'GKE' : 'AKS'})\\n- **Managed databases** (\${provider === 'aws' ? 'RDS PostgreSQL + DocumentDB' : provider === 'gcp' ? 'Cloud SQL + Firestore' : 'Azure Database for PostgreSQL + Cosmos DB'})\\n...\\n#### 4. Configure kubectl\\n\\\`\\\`\\\`bash\\n# \${provider === 'aws' ? 'AWS' : provider === 'gcp' ? 'GCP' : 'Azure'} specific command\\n\${provider === 'aws' \\n  ? 'aws eks update-kubeconfig --region us-west-2 --name midaz-production'\\n  : provider === 'gcp'\\n  ? 'gcloud container clusters get-credentials midaz-production --zone us-central1'\\n  : 'az aks get-credentials --resource-group midaz-rg --name midaz-production'\\n}\\n\\\`\\\`\\\`\\n...\`",
            "improvedCode": "// Define provider-specific details at the beginning of the handler\\nconst providerConfig = {\\n  aws: {\\n    region: \\"us-west-2\\",\\n    nodeSize: \\"t3.medium\\",\\n    k8sClusterType: \\"EKS\\",\\n    managedDatabases: \\"RDS PostgreSQL + DocumentDB\\",\\n    kubeconfigCmd: \\"aws eks update-kubeconfig --region us-west-2 --name midaz-production\\"\\n  },\\n  gcp: {\\n    region: \\"us-central1\\",\\n    nodeSize: \\"e2-medium\\",\\n    k8sClusterType: \\"GKE\\",\\n    managedDatabases: \\"Cloud SQL + Firestore\\",\\n    kubeconfigCmd: \\"gcloud container clusters get-credentials midaz-production --zone us-central1\\"\\n  },\\n  azure: {\\n    region: \\"East US\\",\\n    nodeSize: \\"Standard_B2s\\",\\n    k8sClusterType: \\"AKS\\",\\n    managedDatabases: \\"Azure Database for PostgreSQL + Cosmos DB\\",\\n    kubeconfigCmd: \\"az aks get-credentials --resource-group midaz-rg --name midaz-production\\"\\n  }\\n};\\nconst details = providerConfig[provider];\\n\\nconst instructions = \`...\\n#### 2. Configure Terraform Variables\\nEdit \\\`terraform.tfvars\\\`:\\n\\\`\\\`\\\`hcl\\n# terraform.tfvars\\nregion = \\"\${details.region}\\"\\n...\\nnode_size = \\"\${details.nodeSize}\\"\\n...\\nThis creates:\\n- **Kubernetes cluster** (\${details.k8sClusterType})\\n- **Managed databases** (\${details.managedDatabases})\\n...\\n#### 4. Configure kubectl\\n\\\`\\\`\\\`bash\\n# \${provider.toUpperCase()} specific command\\n\${details.kubeconfigCmd}\\n\\\`\\\`\\\`\\n...\`;",
            "oneSentenceSummary": "Refatorar lógica condicional específica do provedor repetida em uma pesquisa de objeto de configuração para melhorar a legibilidade e manutenibilidade do código.",
            "relevantLinesStart": 340,
            "relevantLinesEnd": 380,
            "label": "refactoring"
        },
        {
            "relevantFile": "src/tools/midaz-setup.js",
            "language": "javascript",
            "suggestionContent": "Potencial vazamento de memória detectado: a variável 'config' não está sendo limpa após o uso, podendo causar acúmulo de memória em operações repetidas.",
            "existingCode": "let config = loadConfig();\\n// uso da config...\\n// sem limpeza",
            "improvedCode": "let config = loadConfig();\\n// uso da config...\\nconfig = null; // limpeza explícita",
            "oneSentenceSummary": "Prevenir vazamento de memória limpando explicitamente a variável config.",
            "relevantLinesStart": 45,
            "relevantLinesEnd": 50,
            "label": "memory_leak"
        },
        {
            "relevantFile": "src/tools/midaz-setup.js", 
            "language": "javascript",
            "suggestionContent": "Função está usando sintaxe deprecated que será removida na próxima versão. Recomenda-se migrar para a nova API.",
            "existingCode": "app.use(bodyParser.json());",
            "improvedCode": "app.use(express.json());",
            "oneSentenceSummary": "Migrar de bodyParser deprecated para express.json().",
            "relevantLinesStart": 12,
            "relevantLinesEnd": 12,
            "label": "deprecated_warning"  
        },
        {
            "relevantFile": "src/auth/login.js",
            "language": "javascript", 
            "suggestionContent": "VULNERABILIDADE CRÍTICA: SQL Injection detectada! A query está concatenando input do usuário diretamente sem sanitização, permitindo ataques maliciosos.",
            "existingCode": "const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${password}'\`;",
            "improvedCode": "const query = 'SELECT * FROM users WHERE username = ? AND password = ?'; const result = await db.query(query, [username, hashedPassword]);",
            "oneSentenceSummary": "Corrigir vulnerabilidade crítica de SQL Injection usando prepared statements.",
            "relevantLinesStart": 23,
            "relevantLinesEnd": 23,
            "label": "security_vulnerability"
        }
    ]
}]`;
    setInputType('json');
    setInputMethod('paste');
    setJsonInput(sampleData);
    setUploadedFileName('');
  };

  const loadSampleCsvData = () => {
    const sampleCsv = `id,inputs,reference_outputs,outputs
08db1536-f24c-493b-b91c-f4c2f7691fa8,"{""filePath"": ""CHANGELOG.md"", ""language"": ""markdown"", ""fileContent"": ""# Changelog\\n\\nAll notable changes..."", ""pullRequest"": {""title"": ""Update CHANGELOG""}}","{""output"": ""{\\"overallSummary\\": \\"This PR updates CHANGELOG.md with v1.3.0 entry\\", \\"codeSuggestions\\": [{\\"relevantFile\\": \\"CHANGELOG.md\\", \\"language\\": \\"markdown\\", \\"suggestionContent\\": \\"Add version link\\", \\"existingCode\\": \\"## [v1.3.0] - 2025-06-02\\", \\"improvedCode\\": \\"## [v1.3.0](https://github.com/LerianStudio/midaz-sdk-golang/compare/v1.3.0-beta.2...v1.3.0) - 2025-06-02\\", \\"oneSentenceSummary\\": \\"Add version comparison link\\", \\"relevantLinesStart\\": 10, \\"relevantLinesEnd\\": 10, \\"label\\": \\"documentation_and_comments\\"}]}"", ""label"": ""Modelo A""}","{""output"": ""{\\"overallSummary\\": \\"This PR updates CHANGELOG.md to document version v1.3.0\\", \\"codeSuggestions\\": [{\\"relevantFile\\": \\"CHANGELOG.md\\", \\"language\\": \\"markdown\\", \\"suggestionContent\\": \\"Remove redundant phrasing\\", \\"existingCode\\": \\"- Improve release flow by fixing the goreleaser file, enhancing the overall release process.\\", \\"improvedCode\\": \\"- Improve release flow by fixing the goreleaser file.\\", \\"oneSentenceSummary\\": \\"Enhance clarity by removing redundant phrasing\\", \\"relevantLinesStart\\": 13, \\"relevantLinesEnd\\": 13, \\"label\\": \\"documentation_and_comments\\"}]}"", ""label"": ""Modelo B""}"`;
    setInputType('csv');
    setInputMethod('paste');
    setCsvInput(sampleCsv);
    setUploadedFileName('');
  };

  const handleFileUpload = (content: string, filename: string) => {
    setUploadedFileName(filename);
    console.log('Arquivo carregado:', filename);
    console.log('Tamanho do conteúdo:', content.length);
    
    try {
      if (filename.toLowerCase().endsWith('.csv')) {
        console.log('Detectado arquivo CSV, tentando modo comparação...');
        setInputType('csv');
        setCsvInput(content);
        setCurrentComparisonIndex(0);
      } else {
        console.log('Detectado arquivo JSON, tentando modo sugestões...');
        setInputType('json');
        const parsed = JSON.parse(content);
        const dataArray = Array.isArray(parsed) ? parsed : [parsed];
        setSuggestions(dataArray);
        setJsonInput(content);
        setCurrentItemIndex(0);
        setMode('suggestions');
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Formato inválido'}`);
    }
  };

  const resetApp = () => {
    // Limpar localStorage se houver
    if (storageKey) {
      clearLocalStorage(storageKey);
    }
    
    setSuggestions([]);
    setComparisonRows([]);
    setJsonInput('');
    setCsvInput('');
    setFeedbacks({});
    setComparisonResults({});
    setModelLabels({});
    setCurrentItemIndex(0);
    setCurrentComparisonIndex(0);
    setMode('input');
    setShowStats(false);
    setInputMethod('upload');
    setUploadedFileName('');
    setCsvWarning('');
    setStorageKey('');
  };

  const resetEvaluations = () => {
    const confirmMessage = mode === 'suggestions' 
      ? `Tem certeza que deseja limpar todos os ${feedbackCount} feedbacks? Esta ação não pode ser desfeita.`
      : `Tem certeza que deseja limpar todas as ${comparisonResultCount} avaliações? Esta ação não pode ser desfeita.`;
    
    if (window.confirm(confirmMessage)) {
      // Limpar localStorage
      if (storageKey) {
        clearLocalStorage(storageKey);
      }
      
      // Limpar estado
      if (mode === 'suggestions') {
        setFeedbacks({});
      } else if (mode === 'comparison') {
        setComparisonResults({});
        setModelLabels({});
      }
      
      console.log('🗑️ Avaliações limpas pelo usuário');
    }
  };

  if (mode === 'input') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-5xl">
            <div className="text-center mb-8">
              <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Visualizador de Sugestões de Código
              </h1>
              <p className="text-gray-600">
                Escolha o tipo de análise: revisar sugestões individuais ou comparar modelos A/B
              </p>
            </div>

            {/* Seletor de tipo */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-100 p-1 rounded-lg flex">
                <button
                  onClick={() => setInputType('json')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    inputType === 'json'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Revisar Sugestões (JSON)
                </button>
                <button
                  onClick={() => setInputType('csv')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    inputType === 'csv'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Comparar Modelos A/B (CSV)
                </button>
              </div>
            </div>

            {/* Seletor de método de input */}
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 p-1 rounded-lg flex">
                <button
                  onClick={() => setInputMethod('upload')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    inputMethod === 'upload'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Upload de Arquivo
                </button>
                <button
                  onClick={() => setInputMethod('paste')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    inputMethod === 'paste'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Type className="w-4 h-4 mr-2" />
                  Colar Texto
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {inputMethod === 'upload' ? (
                <div className="space-y-4">
                  {uploadedFileName && (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-800 font-medium">Arquivo carregado:</span>
                        <span className="text-green-700">{uploadedFileName}</span>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedFileName('');
                          setCsvWarning('');
                          if (inputType === 'json') {
                            setJsonInput('');
                          } else {
                            setCsvInput('');
                          }
                        }}
                        className="text-green-600 hover:text-green-800"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                  
                  <FileUpload
                    onFileContent={handleFileUpload}
                    accept={inputType === 'json' ? '.json,.txt' : '.csv,.txt'}
                    label={`Fazer upload de arquivo ${inputType.toUpperCase()}`}
                    description={inputType === 'json' 
                      ? 'Selecione um arquivo JSON com as sugestões de código'
                      : 'Selecione um arquivo CSV com as comparações de modelos'
                    }
                    loading={csvLoading}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">
                      {inputType === 'json' ? 'JSON de Sugestões' : 'CSV de Comparações'}
                    </label>
                    <button
                      onClick={inputType === 'json' ? loadSampleJsonData : loadSampleCsvData}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Carregar exemplo
                    </button>
                  </div>
                  
                  <textarea
                    value={inputType === 'json' ? jsonInput : csvInput}
                    onChange={(e) => inputType === 'json' ? setJsonInput(e.target.value) : setCsvInput(e.target.value)}
                    placeholder={inputType === 'json' 
                      ? "Cole aqui o JSON com as sugestões de código..."
                      : "Cole aqui o CSV com as comparações de modelos..."
                    }
                    className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Mensagens de status */}
              {(error || csvError) && (
                <div className="flex items-center space-x-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error || csvError}</span>
                </div>
              )}
              
              {csvLoading && (
                <div className="flex items-center space-x-2 text-blue-600 text-sm">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Processando CSV...</span>
                </div>
              )}
              
              {csvWarning && (
                <div className="flex items-center space-x-2 text-yellow-600 text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4" />
                  <span>{csvWarning}</span>
                </div>
              )}
              
              {((inputType === 'json' && jsonInput && !error) || (inputType === 'csv' && csvInput && !csvError && !csvLoading)) && (
                <div className="flex items-center space-x-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {inputType === 'json' 
                      ? `JSON válido! ${allSuggestions.length} sugestões encontradas.`
                      : `CSV válido! ${comparisonRows.length} comparações encontradas.`
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Descrição do formato */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                {inputType === 'json' ? 'Formato JSON esperado:' : 'Formato CSV esperado:'}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {inputType === 'json' 
                  ? 'Array de objetos contendo overallSummary e codeSuggestions'
                  : 'CSV com colunas: id, inputs, reference_outputs, outputs (campos JSON)'
                }
              </p>
              <div className="text-xs text-gray-500 mb-3">
                {inputType === 'json' 
                  ? 'Ideal para revisar sugestões de código individuais com feedback'
                  : 'Ideal para comparar diferentes modelos/versões de IA e determinar o melhor'
                }
              </div>
              
              {inputMethod === 'upload' && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
                  💡 <strong>Dica:</strong> {inputType === 'json' 
                    ? 'Faça upload de arquivos .json ou .txt contendo o JSON'
                    : 'Faça upload de arquivos .csv ou .txt contendo os dados CSV'
                  }. Você também pode usar "Colar Texto" para dados menores.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'suggestions') {
    const currentSuggestion = allSuggestions[currentItemIndex];
    const currentSuggestionIndex = 0;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col min-h-screen">
          <SuggestionNavigation
            currentIndex={currentItemIndex}
            total={allSuggestions.length}
            onNavigate={handleNavigate}
            feedbackCount={feedbackCount}
          />

          <div className="flex-1 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              {suggestions[currentSuggestionIndex]?.overallSummary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Resumo Geral
                  </h3>
                  <p className="text-blue-800 leading-relaxed">
                    {currentSuggestion?.overallSummary}
                  </p>
                </div>
              )}

              {currentSuggestion && (
                <SuggestionCard
                  suggestion={currentSuggestion}
                  index={currentItemIndex}
                  total={allSuggestions.length}
                  onFeedback={handleFeedback}
                  existingFeedback={feedbacks[`${currentSuggestion.relevantFile}-${currentSuggestion.relevantLinesStart}`]}
                />
              )}
            </div>
          </div>

          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <button
                onClick={resetApp}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Voltar para o início
              </button>
              
              <button
                onClick={exportResults}
                disabled={feedbackCount === 0}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Feedbacks ({feedbackCount})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'comparison') {
    const currentComparison = comparisonRows[currentComparisonIndex];
    const stats = getComparisonStats();

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col min-h-screen">
          {/* Header de navegação para comparações */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Comparação A/B de Modelos
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    {comparisonResultCount} de {comparisonRows.length} avaliadas
                  </div>
                  
                  {storageKey && comparisonResultCount > 0 && (
                    <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                      <span>💾</span>
                      <span>Auto-salvamento: {comparisonResultCount} resultados</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {showStats ? 'Ocultar' : 'Ver'} Estatísticas
                </button>

                <button
                  onClick={resetEvaluations}
                  className="inline-flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-md hover:bg-yellow-200 transition-colors"
                  title="Limpar todas as avaliações (mantém os dados)"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar Avaliações
                </button>

                <button
                  onClick={resetApp}
                  className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-md hover:bg-red-200 transition-colors"
                  title="Resetar tudo e voltar ao início"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Completo
                </button>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Progresso:</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(comparisonResultCount / comparisonRows.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {Math.round((comparisonResultCount / comparisonRows.length) * 100)}%
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleComparisonNavigate(Math.max(0, currentComparisonIndex - 1))}
                    disabled={currentComparisonIndex === 0}
                    className="p-2 rounded-md text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  
                  <span className="px-4 py-2 text-sm font-medium text-gray-700">
                    {currentComparisonIndex + 1} / {comparisonRows.length}
                  </span>

                  <button
                    onClick={() => handleComparisonNavigate(Math.min(comparisonRows.length - 1, currentComparisonIndex + 1))}
                    disabled={currentComparisonIndex === comparisonRows.length - 1}
                    className="p-2 rounded-md text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {showStats && (
                <ComparisonStatsComponent
                  stats={stats}
                  results={Object.values(comparisonResults)}
                />
              )}

              {currentComparison && (
                <ComparisonView
                  comparisonRow={currentComparison}
                  index={currentComparisonIndex}
                  total={comparisonRows.length}
                  onResult={handleComparisonResult}
                  existingResult={comparisonResults[currentComparison.id]}
                  onLabelChange={handleLabelChange}
                  savedLabels={modelLabels}
                />
              )}
            </div>
          </div>

          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <button
                onClick={resetApp}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Voltar para o início
              </button>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Líder atual: <span className="font-medium">
                    {stats.modelPerformance && Object.keys(stats.modelPerformance).length > 0
                      ? Object.entries(stats.modelPerformance)
                          .map(([label, data]) => ({ label, winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0 }))
                          .sort((a, b) => b.winRate - a.winRate)[0]?.label || 'N/A'
                      : 'N/A'
                    }
                  </span>
                </div>
                
                <button
                  onClick={exportResults}
                  disabled={comparisonResultCount === 0}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Resultados ({comparisonResultCount})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
