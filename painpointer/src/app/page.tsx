'use client';

import { useState } from 'react';
import { Search, TrendingDown, AlertCircle, BarChart3 } from 'lucide-react';
import { SearchForm } from '@/components/SearchForm';
import { AnalysisResults } from '@/components/AnalysisResults';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AnalysisResult } from '@/lib/gemini-analyzer';

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const handleAnalyze = async (searchTerm: string) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    
    // Generate analysis ID immediately for progress tracking
    const newAnalysisId = Date.now().toString() + Math.random().toString(36).substring(2);
    setAnalysisId(newAnalysisId);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchTerm, analysisId: newAnalysisId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysisResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <TrendingDown className="w-12 h-12 text-red-500 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              PainPointer
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover what customers really think. Analyze Reddit discussions to identify 
            pain points and complaints about any product or topic.
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto mb-12">
          <SearchForm onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
        </div>

        {/* Features */}
        {!analysisResult && !isAnalyzing && (
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <Search className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Smart Reddit Scraping
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Automatically finds relevant subreddits and scrapes posts with complaints
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <AlertCircle className="w-8 h-8 text-orange-500 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                AI Pain Point Detection
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Uses advanced AI to identify and categorize customer complaints
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <BarChart3 className="w-8 h-8 text-green-500 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Visual Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Get insights with charts, rankings, and AI-generated summaries
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && <LoadingSpinner analysisId={analysisId || undefined} />}

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {analysisResult && <AnalysisResults result={analysisResult} />}

        {/* Footer */}
        <footer className="text-center mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Powered by Reddit API and Google Gemini AI
          </p>
        </footer>
      </div>
    </div>
  );
}