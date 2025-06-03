'use client';

import { ComparisonStats, ComparisonResult } from '@/types/suggestion';
import { BarChart, TrendingUp, Target, Award, Crown } from 'lucide-react';
import clsx from 'clsx';

interface ComparisonStatsProps {
  stats: ComparisonStats;
  results: ComparisonResult[];
}

export default function ComparisonStatsComponent({ stats, results }: ComparisonStatsProps) {
  const completionPercentage = (stats.completedComparisons / stats.totalComparisons) * 100;
  
  const getModelRanking = () => {
    return Object.entries(stats.modelPerformance)
      .map(([label, data]) => ({
        label,
        wins: data.wins,
        total: data.total,
        winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0
      }))
      .sort((a, b) => b.winRate - a.winRate);
  };

  const getConfidenceDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    results.forEach(result => {
      distribution[result.confidence as keyof typeof distribution]++;
    });
    return distribution;
  };

  const modelRanking = getModelRanking();
  const confidenceDistribution = getConfidenceDistribution();

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-yellow-500'; // Ouro
    if (index === 1) return 'text-gray-400';   // Prata
    if (index === 2) return 'text-orange-600'; // Bronze
    return 'text-gray-300';
  };

  const getMedalIcon = (index: number) => {
    if (index < 3) return <Crown className="w-5 h-5" />;
    return <Award className="w-5 h-5" />;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="flex items-center space-x-3 mb-6">
        <BarChart className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Estatísticas das Comparações
        </h2>
      </div>

      {/* Progresso Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Progresso</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-blue-900">
              {Math.round(completionPercentage)}%
            </div>
            <div className="text-sm text-blue-700">
              {stats.completedComparisons} de {stats.totalComparisons}
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Confiança Média</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-green-900">
              {stats.averageConfidence.toFixed(1)}/5
            </div>
            <div className="text-sm text-green-700">
              {stats.averageConfidence >= 4 ? 'Alta' : 
               stats.averageConfidence >= 3 ? 'Média' : 'Baixa'}
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Modelos</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-purple-900">
              {Object.keys(stats.modelPerformance).length}
            </div>
            <div className="text-sm text-purple-700">
              Em comparação
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">Líder</span>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-orange-900">
              {modelRanking[0]?.label || 'N/A'}
            </div>
            <div className="text-sm text-orange-700">
              {modelRanking[0] ? `${modelRanking[0].winRate.toFixed(1)}% vitórias` : 'Sem dados'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ranking dos Modelos */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ranking dos Modelos
          </h3>
          <div className="space-y-3">
            {modelRanking.map((model, index) => (
              <div 
                key={model.label}
                className={clsx(
                  'flex items-center justify-between p-4 rounded-lg border',
                  index === 0 ? 'bg-yellow-50 border-yellow-200' :
                  index === 1 ? 'bg-gray-50 border-gray-200' :
                  index === 2 ? 'bg-orange-50 border-orange-200' :
                  'bg-white border-gray-200'
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className={clsx('flex items-center', getMedalColor(index))}>
                    {getMedalIcon(index)}
                    <span className="ml-2 font-bold text-lg">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{model.label}</div>
                    <div className="text-sm text-gray-600">
                      {model.wins} vitórias de {model.total} comparações
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {model.winRate.toFixed(1)}%
                  </div>
                  <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className={clsx(
                        'h-2 rounded-full transition-all duration-300',
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-500' :
                        index === 2 ? 'bg-orange-500' :
                        'bg-blue-500'
                      )}
                      style={{ width: `${model.winRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição de Confiança */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribuição de Confiança
          </h3>
          <div className="space-y-3">
            {Object.entries(confidenceDistribution).map(([level, count]) => {
              const percentage = stats.completedComparisons > 0 ? (count / stats.completedComparisons) * 100 : 0;
              const labels = ['', 'Muito baixa', 'Baixa', 'Média', 'Alta', 'Muito alta'];
              
              return (
                <div key={level} className="flex items-center space-x-4">
                  <div className="w-20 text-sm font-medium text-gray-700">
                    {labels[parseInt(level)]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div 
                          className={clsx(
                            'h-6 rounded-full transition-all duration-300',
                            parseInt(level) <= 2 ? 'bg-red-500' :
                            parseInt(level) === 3 ? 'bg-yellow-500' :
                            'bg-green-500'
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {count > 0 && `${count}`}
                        </div>
                      </div>
                      <div className="w-12 text-sm text-gray-600">
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Insights */}
      {stats.completedComparisons > 0 && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Insights:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• O modelo mais performático é <strong>{modelRanking[0]?.label}</strong> com {modelRanking[0]?.winRate.toFixed(1)}% de vitórias</li>
            <li>• Confiança média nas decisões é {stats.averageConfidence >= 4 ? 'alta' : stats.averageConfidence >= 3 ? 'média' : 'baixa'} ({stats.averageConfidence.toFixed(1)}/5)</li>
            <li>• {Math.round(completionPercentage)}% das comparações foram concluídas</li>
          </ul>
        </div>
      )}
    </div>
  );
} 