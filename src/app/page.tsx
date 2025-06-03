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
  
  // States for suggestions mode
  const [suggestions, setSuggestions] = useState<SuggestionData[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [feedbacks, setFeedbacks] = useState<{ [key: string]: SuggestionFeedback }>({});
  
  // States for A/B comparison mode
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);
  const [currentComparisonIndex, setCurrentComparisonIndex] = useState(0);
  const [comparisonResults, setComparisonResults] = useState<{ [key: string]: ComparisonResult }>({});
  const [modelLabels, setModelLabels] = useState<{ [key: string]: string }>({});
  
  // Key for localStorage based on data hash
  const [storageKey, setStorageKey] = useState<string>('');
  
  const [error, setError] = useState('');
  const [isDataValid, setIsDataValid] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const { parseCsv, isLoading: csvLoading, error: csvError } = useCsvParser();
  const [csvWarning, setCsvWarning] = useState<string>('');

  // LocalStorage functions
  const generateStorageKey = (data: string): string => {
    // Simple hash to uniquely identify the dataset
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
      console.log('💾 Data saved to localStorage with key:', key);
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  };

  const loadFromLocalStorage = (key: string): { results: { [key: string]: ComparisonResult }, labels: { [key: string]: string } } => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        console.log('📥 Data loaded from localStorage:', Object.keys(data.results || {}).length, 'results');
        console.log('📥 Labels loaded from localStorage:', Object.keys(data.labels || {}).length, 'labels');
        return {
          results: data.results || {},
          labels: data.labels || {}
        };
      }
    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
    }
    return { results: {}, labels: {} };
  };

  const clearLocalStorage = (key: string) => {
    try {
      localStorage.removeItem(key);
      console.log('🗑️ Data removed from localStorage');
    } catch (error) {
      console.error('❌ Error clearing localStorage:', error);
    }
  };

  // All suggestions in flat list (suggestions mode)
  const allSuggestions = suggestions.flatMap(data => 
    data.codeSuggestions.map(suggestion => ({
      ...suggestion,
      overallSummary: data.overallSummary
    }))
  );

  const feedbackCount = Object.keys(feedbacks).length;
  const comparisonResultCount = Object.keys(comparisonResults).length;

  // Process data when it changes
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
        setError('Invalid JSON. Please check the formatting.');
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
          
          // Generate key for localStorage and try to load saved data
          const key = generateStorageKey(csvInput);
          setStorageKey(key);
          const savedData = loadFromLocalStorage(key);
          if (Object.keys(savedData.results).length > 0) {
            setComparisonResults(savedData.results);
            setModelLabels(savedData.labels);
            console.log('✅ Previous results loaded from localStorage');
          }
          
          // Check if there were warnings in the console about skipped lines
          const totalCsvLines = csvInput.trim().split('\n').length - 1; // -1 for header
          if (rows.length < totalCsvLines) {
            const skippedCount = totalCsvLines - rows.length;
            setCsvWarning(`⚠️ ${skippedCount} line(s) were skipped due to JSON errors. Check the console for details about problematic lines.`);
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

  // Automatically save when results or labels change
  useEffect(() => {
    if (storageKey && (Object.keys(comparisonResults).length > 0 || Object.keys(modelLabels).length > 0)) {
      saveToLocalStorage(storageKey, comparisonResults, modelLabels);
    }
  }, [comparisonResults, modelLabels, storageKey]);

  // Calculate comparison statistics
  const getComparisonStats = (): ComparisonStats => {
    const results = Object.values(comparisonResults);
    const modelPerformance: { [key: string]: { wins: number; total: number } } = {};
    
    // Initialize counters for all models
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

    // Count wins (exclude ties and undefined from model counts)
    results.forEach(result => {
      if (result.winnerId !== 'tie' && result.winnerId !== 'undefined' && modelPerformance[result.winnerLabel]) {
        modelPerformance[result.winnerLabel].wins++;
      }
      
      // Only count as total for real models (not ties/undefined)
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
    console.log(`🏷️ Label global do modelo ${optionId} altered to: ${newLabel}`);
  };

  const exportResults = () => {
    if (mode === 'suggestions') {
      // Export feedbacks of suggestions
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
      // Export results of A/B comparisons
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
    "overallSummary": "This PR introduces a new module src/tools/midaz-setup.js that registers various tools with an MCP server. These tools provide detailed instructions for various Midaz backend deployment scenarios, including local Docker setup, production deployment using Helm, and cloud deployment using Terraform and Helm for AWS, GCP, and Azure.",
    "codeSuggestions": [
        {
            "relevantFile": "src/tools/midaz-setup.js",
            "language": "javascript",
            "suggestionContent": "In the get-midaz-cloud-setup tool, provider-specific details (such as region, node size, K8s type, database type, and kubectl commands) are generated using multiple ternary operators directly within the instruction template literal. This pattern of provider === '...' ? ... : ... is repeated for each detail, leading to verbose code that can be harder to read and maintain, especially if more providers or specific details are added. Consider refactoring this by creating a configuration object map where each provider ('aws', 'gcp', 'azure') maps to an object containing all its specific details.",
            "existingCode": "const instructions = \`...\n#### 2. Configure Terraform Variables\nEdit \`terraform.tfvars\`:\n\`\`\`hcl\n# terraform.tfvars\nregion = \"\${provider === 'aws' ? 'us-west-2' : provider === 'gcp' ? 'us-central1' : 'East US'}\"\n...\nnode_size = \"\${provider === 'aws' ? 't3.medium' : provider === 'gcp' ? 'e2-medium' : 'Standard_B2s'}\"\n...\nThis creates:\n- **Kubernetes cluster** (\${provider === 'aws' ? 'EKS' : provider === 'gcp' ? 'GKE' : 'AKS'})\\n- **Managed databases** (\${provider === 'aws' ? 'RDS PostgreSQL + DocumentDB' : provider === 'gcp' ? 'Cloud SQL + Firestore' : 'Azure Database for PostgreSQL + Cosmos DB'})\\n...\\n#### 4. Configure kubectl\\n\`\`\`bash\\n# \${provider === 'aws' ? 'AWS' : provider === 'gcp' ? 'GCP' : 'Azure'} specific command\\n\${provider === 'aws' \\n  ? 'aws eks update-kubeconfig --region us-west-2 --name midaz-production'\\n  : provider === 'gcp'\\n  ? 'gcloud container clusters get-credentials midaz-production --zone us-central1'\\n  : 'az aks get-credentials --resource-group midaz-rg --name midaz-production'\\n}\\n\`\`\`\\n...\`",
            "improvedCode": "// Define provider-specific details at the beginning of the handler\\nconst providerConfig = {\\n  aws: {\\n    region: \"us-west-2\",\\n    nodeSize: \"t3.medium\",\\n    k8sClusterType: \"EKS\",\\n    managedDatabases: \"RDS PostgreSQL + DocumentDB\",\\n    kubeconfigCmd: \"aws eks update-kubeconfig --region us-west-2 --name midaz-production\"\\n  },\\n  gcp: {\\n    region: \"us-central1\",\\n    nodeSize: \"e2-medium\",\\n    k8sClusterType: \"GKE\",\\n    managedDatabases: \"Cloud SQL + Firestore\",\\n    kubeconfigCmd: \"gcloud container clusters get-credentials midaz-production --zone us-central1\"\\n  },\\n  azure: {\\n    region: \"East US\",\\n    nodeSize: \"Standard_B2s\",\\n    k8sClusterType: \"AKS\",\\n    managedDatabases: \"Azure Database for PostgreSQL + Cosmos DB\",\\n    kubeconfigCmd: \"az aks get-credentials --resource-group midaz-rg --name midaz-production\"\\n  }\\n};\\nconst details = providerConfig[provider];\\n\\nconst instructions = \`...\\n#### 2. Configure Terraform Variables\\nEdit \`terraform.tfvars\`:\\n\`\`\`hcl\\n# terraform.tfvars\\nregion = \"\${details.region}\"\n...\\nnode_size = \"\${details.nodeSize}\"\n...\\nThis creates:\\n- **Kubernetes cluster** (\${details.k8sClusterType})\\n- **Managed databases** (\${details.managedDatabases})\\n...\\n#### 4. Configure kubectl\\n\`\`\`bash\\n# \${provider.toUpperCase()} specific command\\n\${details.kubeconfigCmd}\\n\`\`\`\\n...\`;",
            "oneSentenceSummary": "Refactor repeated provider-specific conditional logic into a configuration object lookup to improve code readability and maintainability.",
            "relevantLinesStart": 340,
            "relevantLinesEnd": 380,
            "label": "refactoring"
        },
        {
            "relevantFile": "src/tools/midaz-setup.js",
            "language": "javascript",
            "suggestionContent": "Potential memory leak detected: the 'config' variable is not being cleaned up after use, which may cause memory accumulation in repeated operations.",
            "existingCode": "let config = loadConfig();\\n// use config...\\n// no cleanup",
            "improvedCode": "let config = loadConfig();\\n// use config...\\nconfig = null; // explicit cleanup",
            "oneSentenceSummary": "Prevent memory leak by explicitly cleaning up the config variable.",
            "relevantLinesStart": 45,
            "relevantLinesEnd": 50,
            "label": "memory_leak"
        },
        {
            "relevantFile": "src/tools/midaz-setup.js", 
            "language": "javascript",
            "suggestionContent": "Function is using deprecated syntax that will be removed in the next version. It is recommended to migrate to the new API.",
            "existingCode": "app.use(bodyParser.json());",
            "improvedCode": "app.use(express.json());",
            "oneSentenceSummary": "Migrate from deprecated bodyParser to express.json().",
            "relevantLinesStart": 12,
            "relevantLinesEnd": 12,
            "label": "deprecated_warning"  
        },
        {
            "relevantFile": "src/auth/login.js",
            "language": "javascript", 
            "suggestionContent": "CRITICAL VULNERABILITY: SQL Injection detected! The query is directly concatenating user input without sanitization, allowing malicious attacks.",
            "existingCode": "const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${password}'\`;",
            "improvedCode": "const query = 'SELECT * FROM users WHERE username = ? AND password = ?'; const result = await db.query(query, [username, hashedPassword]);",
            "oneSentenceSummary": "Fix critical SQL Injection vulnerability using prepared statements.",
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
    console.log('File loaded:', filename);
    console.log('Content size:', content.length);
    
    try {
      if (filename.toLowerCase().endsWith('.csv')) {
        console.log('CSV file detected, trying comparison mode...');
        setInputType('csv');
        setCsvInput(content);
        setCurrentComparisonIndex(0);
      } else {
        console.log('JSON file detected, trying suggestions mode...');
        setInputType('json');
        const parsed = JSON.parse(content);
        const dataArray = Array.isArray(parsed) ? parsed : [parsed];
        setSuggestions(dataArray);
        setJsonInput(content);
        setCurrentItemIndex(0);
        setMode('suggestions');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert(`Error processing file: ${error instanceof Error ? error.message : 'Invalid format'}`);
    }
  };

  const resetApp = () => {
    // Clear localStorage if exists
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
      ? `Are you sure you want to clear all ${feedbackCount} feedbacks? This action cannot be undone.`
      : `Are you sure you want to clear all ${comparisonResultCount} evaluations? This action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      // Clear localStorage
      if (storageKey) {
        clearLocalStorage(storageKey);
      }
      
      // Clear state
      if (mode === 'suggestions') {
        setFeedbacks({});
      } else if (mode === 'comparison') {
        setComparisonResults({});
        setModelLabels({});
      }
      
      console.log('🗑️ Evaluations cleared by user');
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
                Code Suggestion Visualizer
              </h1>
              <p className="text-gray-600">
                Choose the type of analysis: review individual suggestions or compare A/B models
              </p>
            </div>

            {/* Type selector */}
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
                  Review Suggestions (JSON)
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
                  Compare Models A/B (CSV)
                </button>
              </div>
            </div>

            {/* Input method selector */}
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
                  Upload File
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
                  Paste Text
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
                        <span className="text-green-800 font-medium">File loaded:</span>
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
                        Remove
                      </button>
                    </div>
                  )}
                  
                  <FileUpload
                    onFileContent={handleFileUpload}
                    accept={inputType === 'json' ? '.json,.txt' : '.csv,.txt'}
                    label={`Upload ${inputType.toUpperCase()} file`}
                    description={inputType === 'json' 
                      ? 'Select a JSON file with code suggestions'
                      : 'Select a CSV file with model comparisons'
                    }
                    loading={csvLoading}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">
                      {inputType === 'json' ? 'Suggestions JSON' : 'Comparisons CSV'}
                    </label>
                    <button
                      onClick={inputType === 'json' ? loadSampleJsonData : loadSampleCsvData}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Load example
                    </button>
                  </div>
                  
                  <textarea
                    value={inputType === 'json' ? jsonInput : csvInput}
                    onChange={(e) => inputType === 'json' ? setJsonInput(e.target.value) : setCsvInput(e.target.value)}
                    placeholder={inputType === 'json' 
                      ? "Paste your code suggestions JSON here..."
                      : "Paste your model comparisons CSV here..."
                    }
                    className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Status messages */}
              {(error || csvError) && (
                <div className="flex items-center space-x-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error || csvError}</span>
                </div>
              )}
              
              {csvLoading && (
                <div className="flex items-center space-x-2 text-blue-600 text-sm">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing CSV...</span>
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
                      ? `JSON valid! ${allSuggestions.length} suggestions found.`
                      : `CSV valid! ${comparisonRows.length} comparisons found.`
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Format description */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                {inputType === 'json' ? 'Expected JSON Format:' : 'Expected CSV Format:'}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {inputType === 'json' 
                  ? 'Array of objects containing overallSummary and codeSuggestions'
                  : 'CSV with columns: id, inputs, reference_outputs, outputs (JSON fields)'
                }
              </p>
              <div className="text-xs text-gray-500 mb-3">
                {inputType === 'json' 
                  ? 'Ideal for reviewing individual code suggestions with feedback'
                  : 'Ideal for comparing different AI models/versions and determining the best'
                }
              </div>
              
              {inputMethod === 'upload' && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
                  💡 <strong>Tip:</strong> {inputType === 'json' 
                    ? 'Upload .json or .txt files containing the JSON'
                    : 'Upload .csv or .txt files containing the CSV data'
                  }. You can also use "Paste Text" for smaller data.
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
                    Overall Summary
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
                ← Back to start
              </button>
              
              <button
                onClick={exportResults}
                disabled={feedbackCount === 0}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Feedbacks ({feedbackCount})
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
          {/* Navigation header for comparisons */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  A/B Comparison of Models
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    {comparisonResultCount} of {comparisonRows.length} evaluated
                  </div>
                  
                  {storageKey && comparisonResultCount > 0 && (
                    <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                      <span>💾</span>
                      <span>Auto-saving: {comparisonResultCount} results</span>
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
                  {showStats ? 'Hide' : 'Show'} Statistics
                </button>

                <button
                  onClick={resetEvaluations}
                  className="inline-flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-md hover:bg-yellow-200 transition-colors"
                  title="Clear all evaluations (keep data)"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Evaluations
                </button>

                <button
                  onClick={resetApp}
                  className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-md hover:bg-red-200 transition-colors"
                  title="Reset everything and go back to start"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Full Reset
                </button>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Progress:</span>
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
                ← Back to start
              </button>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Current leader: <span className="font-medium">
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
                  Export Results ({comparisonResultCount})
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
