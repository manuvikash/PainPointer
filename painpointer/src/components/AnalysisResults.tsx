'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar, MessageSquare, ThumbsUp, ExternalLink, TrendingUp } from 'lucide-react';
import { AnalysisResult, PainPointCategory } from '@/lib/gemini-analyzer';

interface AnalysisResultsProps {
  result: AnalysisResult;
}

// Colors for the pie chart
const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
];

export function AnalysisResults({ result }: AnalysisResultsProps) {
  // Prepare data for pie chart
  const chartData = result.topCategories.map((category, index) => ({
    name: category.name,
    value: category.count,
    color: COLORS[index % COLORS.length],
  }));

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {data.value} complaints ({((data.value / result.totalPainPoints) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (result.totalPainPoints === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-2">
            No Pain Points Found
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300">
            {result.message || 'Try searching for a different product or topic.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Summary Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analysis Results for &quot;{result.searchTerm}&quot;
          </h2>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-1" />
            {formatDate(result.analyzedAt)}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <MessageSquare className="w-6 h-6 text-blue-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.totalPainPoints}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Pain Points</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-orange-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.topCategories.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Categories</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <ThumbsUp className="w-6 h-6 text-green-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(result.topCategories.reduce((sum, cat) => sum + cat.averageEngagement, 0) / result.topCategories.length) || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Avg Engagement</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Pain Point Distribution
          </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={(entry: any) => `${entry.name} (${((entry.value / result.totalPainPoints) * 100).toFixed(0)}%)`} // eslint-disable-line @typescript-eslint/no-explicit-any
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Top Pain Point Categories
        </h3>
        
        {result.topCategories.map((category, index) => (
          <CategoryCard key={category.id} category={category} rank={index + 1} color={COLORS[index % COLORS.length]} />
        ))}
      </div>
    </div>
  );
}

interface CategoryCardProps {
  category: PainPointCategory;
  rank: number;
  color: string;
}

function CategoryCard({ category, rank, color }: CategoryCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3"
              style={{ backgroundColor: color }}
            >
              {rank}
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                {category.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {category.description}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {category.count}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">complaints</p>
          </div>
        </div>

        {/* AI Summary */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h5 className="font-semibold text-gray-900 dark:text-white mb-2">AI Summary</h5>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {category.summary}
          </p>
        </div>

        {/* Sample Pain Points */}
        <div>
          <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
            Sample Complaints ({category.painPoints.length} total)
          </h5>
          <div className="space-y-2">
            {category.painPoints.slice(0, 3).map((painPoint) => (
              <div key={painPoint.id} className="border-l-4 border-gray-200 dark:border-gray-600 pl-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  &quot;{painPoint.content}&quot;
                </p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
                  <span className="flex items-center">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    {painPoint.score}
                  </span>
                  <span className="flex items-center">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {painPoint.num_comments}
                  </span>
                  <span>r/{painPoint.subreddit}</span>
                  <a
                    href={painPoint.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-blue-500"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
          
          {category.painPoints.length > 3 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              +{category.painPoints.length - 3} more complaints in this category
            </p>
          )}
        </div>
      </div>
    </div>
  );
}